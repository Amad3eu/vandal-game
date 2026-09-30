import type { AddressInfo } from 'node:net'
import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { parseAdmins } from '../server/leaderboard/admin'
import { createAdminStore } from '../server/leaderboard/admin-db'
import { createApp, type AppOptions } from '../server/leaderboard/app'
import { createStore } from '../server/leaderboard/db'
import { createServerOnline, type TokenStore } from '../src/online/server'
import { playRun } from './helpers/bot'

/**
 * The leaderboard server (server/leaderboard) on a real Postgres. Runs only with
 * TEST_DATABASE_URL pointing to a database whose name has "test": the tables are wiped.
 *   docker run -d --name vandal-test-db -e POSTGRES_PASSWORD=test -e POSTGRES_DB=vandal_test -p 55432:5432 postgres:16-alpine
 *   TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/vandal_test npm test
 */
const DATABASE_URL = process.env.TEST_DATABASE_URL
const SITE = 'https://site.test'
const LUIZ = 'admin-key-luiz-0123456789abc'
const GUIME = 'admin-key-guime-0123456789ab'
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let pool: pg.Pool
const servers: { close: () => void }[] = []

/** A fresh server (fresh rate limits) on a free port. */
async function startServer(options: Partial<AppOptions> = {}) {
  const app = createApp(createStore(pool), createAdminStore(pool), {
    allowedOrigins: [SITE],
    admins: parseAdmins(`luiz:${LUIZ},guime:${GUIME},curto:abc`),
    ...options,
  })
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  servers.push(server)
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const call = async (method: string, path: string, { token, body, origin }: { token?: string; body?: unknown; origin?: string } = {}) => {
    const response = await fetch(url + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(origin ? { Origin: origin } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, json: await response.json().catch(() => null), headers: response.headers }
  }
  return { url, call }
}

type Call = Awaited<ReturnType<typeof startServer>>['call']

/** The run took as long as it says: move its seed back in time (tests play faster than people). */
const age = (seedId: string) => pool.query(`update run_seeds set issued_at = now() - interval '30 minutes' where id = $1`, [seedId])

async function newPlayer(call: Call, nickname?: string) {
  const player = (await call('POST', '/v1/players')).json as { id: string; token: string }
  if (nickname) await call('PUT', '/v1/me/nickname', { token: player.token, body: { nickname } })
  return player
}

/** A ranked run played by the bot on the server's seed. */
async function rankedRun(call: Call, token: string, mode: 'runner' | 'free' = 'runner') {
  const ticket = (await call('POST', '/v1/runs', { token, body: { mode } })).json as { seedId: string; seed: number }
  await age(ticket.seedId)
  const { log } = playRun(ticket.seed, { mode })
  return { ticket, log, result: await call('POST', '/v1/runs/submit', { token, body: { seedId: ticket.seedId, log } }) }
}

describe.skipIf(!DATABASE_URL)('leaderboard server', () => {
  beforeAll(async () => {
    if (!/test/i.test(new URL(DATABASE_URL!).pathname)) throw new Error('TEST_DATABASE_URL must be a test database (its name must have "test")')
    pool = new pg.Pool({ connectionString: DATABASE_URL })
    await createStore(pool).migrate()
  })
  beforeEach(async () => {
    await pool.query('truncate runs, run_seeds, players, artists, admin_log cascade')
  })
  afterAll(async () => {
    for (const server of servers) server.close()
    await pool?.end()
  })

  describe('players and ranked runs', () => {
    it('answers the health check with the engine version', async () => {
      const { call } = await startServer()
      expect((await call('GET', '/health')).json).toMatchObject({ ok: true, engine: expect.any(Number) })
    })

    it('creates anonymous players and keeps only a hash of their token', async () => {
      const { call } = await startServer()
      const player = await newPlayer(call)
      expect(player.token.length).toBeGreaterThanOrEqual(40)
      const { rows } = await pool.query('select token_hash from players where id = $1', [player.id])
      expect(rows[0].token_hash).not.toBe(player.token)
      expect((await call('GET', '/v1/me', { token: player.token })).json).toEqual({ id: player.id, nickname: null })
      expect((await call('GET', '/v1/me')).status).toBe(401)
      expect((await call('GET', '/v1/me', { token: 'x'.repeat(43) })).status).toBe(401)
    })

    it('checks nicknames', async () => {
      const { call } = await startServer()
      const { token } = await newPlayer(call)
      expect((await call('PUT', '/v1/me/nickname', { token, body: { nickname: 'a' } })).status).toBe(400)
      expect((await call('PUT', '/v1/me/nickname', { token, body: { nickname: '<b>x</b>' } })).status).toBe(400)
      expect((await call('PUT', '/v1/me/nickname', { token, body: { nickname: '  Grafiteiro Zé ' } })).json.nickname).toBe('Grafiteiro Zé')
    })

    it('ranks a run with the score of its replay', async () => {
      const { call } = await startServer()
      const { token } = await newPlayer(call, 'Ana')
      const { log, result } = await rankedRun(call, token)
      expect(result.json).toEqual({ accepted: true, score: log.score, best: log.score, rank: 1 })
      const { rows } = await pool.query('select log->>\'seed\' as seed from runs')
      expect(rows).toHaveLength(1) // the whole run is kept for audits
    })

    it('refuses a run longer than the time since its seed, a forged score and a reused seed', async () => {
      const { call } = await startServer()
      const { token } = await newPlayer(call)
      const ticket = (await call('POST', '/v1/runs', { token, body: { mode: 'runner' } })).json
      const { log } = playRun(ticket.seed)
      expect((await call('POST', '/v1/runs/submit', { token, body: { seedId: ticket.seedId, log } })).json.reason).toBe('too-fast')
      await age(ticket.seedId)
      expect((await call('POST', '/v1/runs/submit', { token, body: { seedId: ticket.seedId, log: { ...log, score: (log.score ?? 0) + 500 } } })).json.reason).toBe(
        'replay-mismatch'
      )
      expect((await call('POST', '/v1/runs/submit', { token, body: { seedId: ticket.seedId, log } })).json.accepted).toBe(true)
      expect((await call('POST', '/v1/runs/submit', { token, body: { seedId: ticket.seedId, log } })).json.reason).toBe('seed-used')
    })

    it("refuses another player's seed, bad ids and broken JSON", async () => {
      const { call } = await startServer()
      const ana = await newPlayer(call)
      const beto = await newPlayer(call)
      const ticket = (await call('POST', '/v1/runs', { token: ana.token, body: { mode: 'runner' } })).json
      await age(ticket.seedId)
      const { log } = playRun(ticket.seed)
      expect((await call('POST', '/v1/runs/submit', { token: beto.token, body: { seedId: ticket.seedId, log } })).json.reason).toBe('seed-not-yours')
      expect((await call('POST', '/v1/runs/submit', { token: ana.token, body: { seedId: "x' or 1=1", log } })).status).toBe(400)
      expect((await call('POST', '/v1/runs', { token: ana.token, body: { mode: 'god' } })).status).toBe(400)
      const broken = await fetch(`${(await startServer()).url}/v1/runs/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"seedId":' })
      expect(broken.status).toBe(400)
      const { rows } = await pool.query('select used_at from run_seeds where id = $1', [ticket.seedId])
      expect(rows[0].used_at).toBeNull() // refused runs don't burn the seed
    })

    it('saves only one of several submissions of the same run at once', async () => {
      const { call } = await startServer()
      const { token } = await newPlayer(call)
      const ticket = (await call('POST', '/v1/runs', { token, body: { mode: 'runner' } })).json
      await age(ticket.seedId)
      const { log } = playRun(ticket.seed)
      const results = await Promise.all([1, 2, 3].map(() => call('POST', '/v1/runs/submit', { token, body: { seedId: ticket.seedId, log } })))
      expect(results.filter((r) => r.json?.accepted)).toHaveLength(1)
      expect((await pool.query('select count(*)::int as n from runs')).rows[0].n).toBe(1)
    })

    it('shows the best run of each player per mode, and leaves out runs with no points', async () => {
      const { call } = await startServer()
      const ana = await newPlayer(call, 'Ana')
      const beto = await newPlayer(call, 'Beto')
      const anaBest = Math.max((await rankedRun(call, ana.token)).log.score ?? 0, (await rankedRun(call, ana.token)).log.score ?? 0)
      await rankedRun(call, beto.token, 'free')
      const idle = await newPlayer(call, 'Parado')
      const ticket = (await call('POST', '/v1/runs', { token: idle.token, body: { mode: 'runner' } })).json
      const { log } = playRun(ticket.seed, { seconds: 0 })
      await age(ticket.seedId)
      const zero = await call('POST', '/v1/runs/submit', { token: idle.token, body: { seedId: ticket.seedId, log } })
      expect(zero.json).toMatchObject({ accepted: true, score: 0, rank: null })

      const runner = (await call('GET', '/v1/leaderboard?mode=runner')).json
      expect(runner).toEqual([{ rank: 1, playerId: ana.id, nickname: 'Ana', score: anaBest }])
      expect((await call('GET', '/v1/leaderboard?mode=free')).json.map((r: { nickname: string }) => r.nickname)).toEqual(['Beto'])
      expect((await call('GET', '/v1/leaderboard?mode=x')).status).toBe(400)
    })
  })

  describe('limits and CORS', () => {
    it('limits seeds per player and new players per address', async () => {
      const { call } = await startServer({ playersPerHour: 3 })
      const { token } = await newPlayer(call)
      const seeds = []
      for (let i = 0; i < 41; i++) seeds.push((await call('POST', '/v1/runs', { token, body: { mode: 'runner' } })).status)
      expect(seeds.slice(0, 40).every((s) => s === 200)).toBe(true)
      expect(seeds[40]).toBe(429)
      const players = []
      for (let i = 0; i < 3; i++) players.push((await call('POST', '/v1/players')).status)
      expect(players).toEqual([201, 201, 429]) // one was made above
    })

    it('answers the game site with CORS headers, and nobody else', async () => {
      const { url, call } = await startServer()
      const preflight = await fetch(`${url}/admin/artists/x`, {
        method: 'OPTIONS',
        headers: { Origin: SITE, 'Access-Control-Request-Method': 'DELETE', 'Access-Control-Request-Headers': 'authorization, content-type' },
      })
      expect(preflight.status).toBe(204)
      expect(preflight.headers.get('access-control-allow-origin')).toBe(SITE)
      expect(preflight.headers.get('access-control-allow-methods')).toMatch(/DELETE/)
      expect((await call('GET', '/v1/leaderboard?mode=runner', { origin: 'https://evil.test' })).headers.get('access-control-allow-origin')).toBeNull()
    })
  })

  describe('admin area', () => {
    it('lets in each admin by name, and nobody else', async () => {
      const { call } = await startServer()
      const player = await newPlayer(call)
      expect((await call('GET', '/admin/me')).status).toBe(401)
      expect((await call('GET', '/admin/me', { token: 'abc' })).status).toBe(401) // too short, ignored
      expect((await call('GET', '/admin/me', { token: player.token })).status).toBe(401)
      expect((await call('GET', '/admin/me', { token: LUIZ })).json).toEqual({ name: 'luiz' })
      expect((await call('GET', '/admin/me', { token: GUIME })).json).toEqual({ name: 'guime' })
    })

    it('blocks an address after 20 wrong keys, but not the right key', async () => {
      const { call } = await startServer()
      const statuses = []
      for (let i = 0; i < 22; i++) statuses.push((await call('GET', '/admin/me', { token: `guess-${i}`.padEnd(30, 'x') })).status)
      expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true)
      expect(statuses.slice(20)).toEqual([429, 429])
      expect((await call('GET', '/admin/me', { token: LUIZ })).status).toBe(200)
    })

    it('renames, hides and shows players, and deletes runs', async () => {
      const { call } = await startServer()
      const ana = await newPlayer(call, 'Ana')
      const beto = await newPlayer(call, 'Beto')
      await rankedRun(call, ana.token)
      await rankedRun(call, beto.token)
      const board = async () => (await call('GET', '/v1/leaderboard?mode=runner')).json as { playerId: string; nickname: string }[]

      expect((await call('PUT', `/admin/players/${ana.id}`, { token: LUIZ, body: { nickname: '<script>' } })).status).toBe(400)
      await call('PUT', `/admin/players/${ana.id}`, { token: LUIZ, body: { nickname: 'Ana_Moderada' } })
      expect((await board()).some((r) => r.nickname === 'Ana_Moderada')).toBe(true)
      await call('PUT', `/admin/players/${ana.id}`, { token: GUIME, body: { nickname: null } })
      expect((await board()).find((r) => r.playerId === ana.id)?.nickname).toBe('Anônimo')

      await call('PUT', `/admin/players/${beto.id}`, { token: LUIZ, body: { hidden: true } })
      expect((await board()).some((r) => r.playerId === beto.id)).toBe(false)
      expect((await rankedRun(call, beto.token)).result.json).toMatchObject({ accepted: true, rank: null }) // still plays
      const listed = (await call('GET', '/admin/players?mode=runner', { token: LUIZ })).json
      expect(listed.find((p: { id: string }) => p.id === beto.id)).toMatchObject({ hidden: true, runs: 2 })
      await call('PUT', `/admin/players/${beto.id}`, { token: LUIZ, body: { hidden: false } })
      expect((await board()).some((r) => r.playerId === beto.id)).toBe(true)

      const [run] = (await call('GET', `/admin/players/${ana.id}/runs`, { token: LUIZ })).json
      expect((await call('DELETE', `/admin/runs/${run.id}`, { token: GUIME })).json).toEqual({ deleted: true })
      expect((await board()).some((r) => r.playerId === ana.id)).toBe(false)
      expect((await call('DELETE', `/admin/runs/${run.id}`, { token: GUIME })).status).toBe(404)
      expect((await call('PUT', '/admin/players/00000000-0000-4000-8000-000000000000', { token: LUIZ, body: { hidden: true } })).status).toBe(404)
    })

    it('keeps the artists: checks each field, lists the active ones for the game', async () => {
      const { call } = await startServer()
      const base = { name: 'Nina Pixo', kind: 'graffiti', city: 'São Paulo', bio: 'Letras 3D.', instagram: '@nina.pixo', color: '#FF4D9D', signature: PNG, minScore: 1200, phase: 2, active: true }
      const refused = async (patch: object) => (await call('POST', '/admin/artists', { token: LUIZ, body: { ...base, ...patch } })).json?.field
      expect(await refused({ name: 'N' })).toBe('name')
      expect(await refused({ kind: 'rapper' })).toBe('kind')
      expect(await refused({ color: 'pink' })).toBe('color')
      expect(await refused({ instagram: 'nina pixo!' })).toBe('instagram')
      expect(await refused({ phase: 4 })).toBe('phase')
      expect(await refused({ minScore: -1 })).toBe('minScore')
      expect(await refused({ signature: 'data:image/svg+xml,<svg onload=alert(1)>' })).toBe('signature')
      expect(await refused({ signature: 'https://evil.test/x.png' })).toBe('signature')

      const nina = await call('POST', '/admin/artists', { token: LUIZ, body: base })
      expect(nina.status).toBe(201)
      expect(nina.json).toMatchObject({ instagram: 'nina.pixo', color: '#ff4d9d', signature: PNG })
      const dj = (await call('POST', '/admin/artists', { token: GUIME, body: { name: 'DJ Beco', kind: 'dj' } })).json
      expect(dj).toMatchObject({ city: null, signature: null, active: true, phase: 1, minScore: 0 })

      const game = (await call('GET', '/v1/artists')).json
      expect(game.map((a: { name: string }) => a.name)).toEqual(['DJ Beco', 'Nina Pixo'])
      expect(game[0]).not.toHaveProperty('active')
      await call('PUT', `/admin/artists/${dj.id}`, { token: LUIZ, body: { ...dj, active: false } })
      expect((await call('GET', '/v1/artists')).json).toHaveLength(1)
      expect((await call('GET', '/admin/artists', { token: LUIZ })).json).toHaveLength(2)
      expect((await call('DELETE', `/admin/artists/${dj.id}`, { token: GUIME })).json).toEqual({ deleted: true })
      expect((await call('DELETE', `/admin/artists/${dj.id}`, { token: GUIME })).status).toBe(404)
    })

    it('logs who did what, newest first', async () => {
      const { call } = await startServer()
      const ana = await newPlayer(call, 'Ana')
      await call('PUT', `/admin/players/${ana.id}`, { token: LUIZ, body: { nickname: 'Ana_2' } })
      await call('PUT', `/admin/players/${ana.id}`, { token: GUIME, body: { hidden: true } })
      await call('POST', '/admin/artists', { token: LUIZ, body: { name: 'MC Laje', kind: 'mc' } })
      const log = (await call('GET', '/admin/log', { token: GUIME })).json as { admin: string; action: string }[]
      expect(log.map((e) => `${e.admin}:${e.action}`)).toEqual(['luiz:artist.create', 'guime:player.hide', 'luiz:player.rename'])
    })
  })

  describe("the site's client (src/online/server.ts)", () => {
    const memory = (): TokenStore & { data: Map<string, string> } => {
      const data = new Map<string, string>()
      return {
        data,
        get: async (key) => data.get(key) ?? null,
        set: async (key, value) => void (value === null ? data.delete(key) : data.set(key, value)),
      }
    }

    it('signs the device up once, ranks a run, sets a nickname', async () => {
      const { url } = await startServer()
      const store = memory()
      const online = createServerOnline(url, store)
      const ticket = await online.startRun('runner')
      expect(ticket).toMatchObject({ seedId: expect.any(String), seed: expect.any(Number) })
      const me = await online.me()
      expect(JSON.parse(store.data.get('vandalOnlinePlayer')!).id).toBe(me?.id)

      await age(ticket!.seedId)
      const { log } = playRun(ticket!.seed)
      expect(await online.submitRun(ticket!, log)).toMatchObject({ accepted: true, score: log.score, rank: 1 })
      expect(await online.setNickname('Teste_Cliente')).toBe(true)
      expect(await online.leaderboard('runner')).toEqual([{ rank: 1, playerId: me!.id, nickname: 'Teste_Cliente', score: log.score }])
    })

    it('signs up again if the server forgot the player', async () => {
      const { url } = await startServer()
      const store = memory()
      const online = createServerOnline(url, store)
      const first = await online.me()
      await pool.query('truncate runs, run_seeds, players cascade')
      const second = await createServerOnline(url, store).me()
      expect(second?.id).toBeDefined()
      expect(second?.id).not.toBe(first?.id)
    })

    it('plays offline when the server is down', async () => {
      const online = createServerOnline('http://127.0.0.1:9', memory())
      expect(await online.startRun('runner')).toBeNull()
      expect(await online.leaderboard('runner')).toEqual([])
      expect(await online.submitRun({ seedId: 'x', seed: 1 }, playRun(1, { seconds: 0 }).log)).toEqual({ accepted: false, reason: 'network' })
    })
  })
})
