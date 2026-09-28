import { createHash, randomBytes, randomInt } from 'node:crypto'
import express, { type NextFunction, type Request, type Response } from 'express'
import { ENGINE_VERSION, checkSubmission } from '../../src/game/server'
import { adminRouter } from './admin'
import type { AdminStore } from './admin-db'
import type { Player, Store } from './db'

export interface AppOptions {
  /** Sites allowed to call the API from a browser, or '*' for any. */
  allowedOrigins: string[] | '*'
  /** New players per IP address per hour (a person needs one; a script would make thousands). */
  playersPerHour?: number
  /** Admin keys (see parseAdmins in admin.ts); empty turns the admin area off. */
  admins?: Map<string, string>
}

/** More seeds than this in 10 minutes looks like a script, not a person restarting runs. */
const SEEDS_PER_10_MINUTES = 40
const NICKNAME = /^[\p{L}\p{N} _.-]{2,20}$/u
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MODES = new Set(['runner', 'free'])

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Counts hits per key in a time window, in memory (enough for one small server). */
function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return (key: string) => {
    const now = Date.now()
    if (hits.size > 10_000) for (const [k, hit] of hits) if (hit.resetAt <= now) hits.delete(k)
    const hit = hits.get(key)
    if (!hit || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return true
    }
    hit.count++
    return hit.count <= max
  }
}

/**
 * The global leaderboard API: anonymous players (a secret token kept on the device, a nickname
 * if they want one), a seed per ranked run, and the run check from src/game/submission.ts,
 * which replays the run with the game's engine and ranks the replayed score.
 */
export function createApp(store: Store, adminStore: AdminStore, { allowedOrigins, playersPerHour = 60, admins = new Map() }: AppOptions) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1) // Railway's proxy: req.ip is the player's address
  const newPlayerAllowed = rateLimit(playersPerHour, 60 * 60_000)
  const failedAdminLoginAllowed = rateLimit(20, 10 * 60_000)

  app.use((req, res, next) => {
    const origin = req.headers.origin
    if (origin && (allowedOrigins === '*' || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigins === '*' ? '*' : origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Max-Age', '600')
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    next()
  })
  app.use(express.json({ limit: '4mb' })) // a run log: the seed and every input, for up to 30 minutes

  /** The player behind the request's token, or a 401. */
  const auth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const player = token ? await store.playerByToken(hashToken(token)) : null
    if (!player) {
      res.status(401).json({ error: 'auth' })
      return
    }
    res.locals.player = player
    next()
  }
  const me = (res: Response) => res.locals.player as Player

  app.get('/health', (_req, res) => {
    res.json({ ok: true, engine: ENGINE_VERSION })
  })

  // A new anonymous player. The token is shown once; the server keeps only its hash.
  app.post('/v1/players', async (req, res) => {
    if (!newPlayerAllowed(req.ip ?? 'unknown')) {
      res.status(429).json({ error: 'rate-limit' })
      return
    }
    const token = randomBytes(32).toString('base64url')
    const player = await store.createPlayer(hashToken(token))
    res.status(201).json({ id: player.id, token, nickname: null })
  })

  app.get('/v1/me', auth, (_req, res) => {
    res.json(me(res))
  })

  app.put('/v1/me/nickname', auth, async (req, res) => {
    const nickname = typeof req.body?.nickname === 'string' ? req.body.nickname.trim() : ''
    if (!NICKNAME.test(nickname)) {
      res.status(400).json({ error: 'nickname' })
      return
    }
    await store.setNickname(me(res).id, nickname)
    res.json({ id: me(res).id, nickname })
  })

  // Starts a ranked run: the server picks the seed, so nobody can hunt for an easy one offline.
  app.post('/v1/runs', auth, async (req, res) => {
    const mode = req.body?.mode
    if (!MODES.has(mode)) {
      res.status(400).json({ error: 'mode' })
      return
    }
    if ((await store.seedsSince(me(res).id, new Date(Date.now() - 10 * 60_000))) >= SEEDS_PER_10_MINUTES) {
      res.status(429).json({ error: 'rate-limit' })
      return
    }
    const issued = await store.issueSeed(me(res).id, randomInt(0, 4294967296), mode)
    res.json({ seedId: issued.id, seed: issued.seed })
  })

  // A finished run: replayed with the engine; if it matches, the replayed score is ranked.
  app.post('/v1/runs/submit', auth, async (req, res) => {
    const seedId = req.body?.seedId
    if (typeof seedId !== 'string' || !UUID.test(seedId)) {
      res.status(400).json({ accepted: false, reason: 'seed-unknown' })
      return
    }
    const player = me(res)
    const result = checkSubmission(req.body.log, await store.seed(seedId), player.id)
    if (!result.ok) {
      res.status(422).json({ accepted: false, reason: result.reason })
      return
    }
    if (!(await store.saveRun(player.id, seedId, req.body.log, result.score, result.endTick))) {
      res.status(409).json({ accepted: false, reason: 'seed-used' })
      return
    }
    const standing = await store.standing(req.body.log.mode, player.id)
    res.json({ accepted: true, score: result.score, best: standing?.best ?? result.score, rank: standing?.rank ?? null })
  })

  app.get('/v1/leaderboard', async (req, res) => {
    const mode = req.query.mode
    if (typeof mode !== 'string' || !MODES.has(mode)) {
      res.status(400).json({ error: 'mode' })
      return
    }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20))
    res.setHeader('Cache-Control', 'no-store')
    res.json(await store.leaderboard(mode, limit))
  })

  // The real artists and DJs switched on in the admin page, for the game to meet by score and phase.
  app.get('/v1/artists', async (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60')
    res.json((await adminStore.artists(true)).map(({ updatedAt: _updatedAt, active: _active, ...artist }) => artist))
  })

  app.use('/admin', adminRouter(adminStore, admins, failedAdminLoginAllowed))

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not-found' })
  })

  // Bad JSON or a too-big body get a plain answer; anything else is logged.
  app.use((error: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (error.type === 'entity.too.large') res.status(413).json({ error: 'too-large' })
    else if (error.type === 'entity.parse.failed') res.status(400).json({ error: 'bad-json' })
    else {
      console.error(error)
      res.status(500).json({ error: 'server' })
    }
  })

  return app
}
