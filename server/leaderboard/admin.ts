import { createHash } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import { ARTIST_KINDS, type AdminStore, type ArtistInput } from './admin-db'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NICKNAME = /^[\p{L}\p{N} _.-]{2,20}$/u
const SIGNATURE = /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/]+=*$/
const MODES = new Set(['runner', 'free'])
/** Keys shorter than this are ignored: an admin key must not be guessable. */
const MIN_KEY_LENGTH = 24

const hash = (value: string) => createHash('sha256').update(value).digest('hex')

/**
 * Admin keys from ADMIN_TOKENS, one per person: "luiz:long-random-key,guime:other-key".
 * Kept as hash → name, so the log says who did what.
 */
export function parseAdmins(value: string | undefined) {
  const admins = new Map<string, string>()
  for (const entry of (value ?? '').split(',')) {
    const [name, key] = entry.trim().split(':')
    if (name && key && key.length >= MIN_KEY_LENGTH) admins.set(hash(key), name)
    else if (entry.trim()) console.warn(`ADMIN_TOKENS: ignored "${name}" (use name:key, key with ${MIN_KEY_LENGTH}+ characters)`)
  }
  return admins
}

type Parsed = { ok: true; artist: ArtistInput } | { ok: false; field: string }

/** An artist from the admin form, checked field by field (the answer names the bad field). */
export function parseArtist(body: Record<string, unknown> | undefined): Parsed {
  const b = body ?? {}
  const fail = (field: string): Parsed => ({ ok: false, field })
  /** Trimmed text, null when empty, undefined when it's not text or too long. */
  const optional = (value: unknown, max: number) => {
    if (value === undefined || value === null) return null
    if (typeof value !== 'string') return undefined
    const text = value.trim()
    if (!text) return null
    return text.length <= max ? text : undefined
  }

  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (name.length < 2 || name.length > 40) return fail('name')
  if (!ARTIST_KINDS.includes(b.kind as ArtistInput['kind'])) return fail('kind')
  const city = optional(b.city, 40)
  if (city === undefined) return fail('city')
  const bio = optional(b.bio, 280)
  if (bio === undefined) return fail('bio')
  let instagram = optional(b.instagram, 31)
  if (instagram === undefined) return fail('instagram')
  if (instagram) {
    instagram = instagram.replace(/^@/, '')
    if (!/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return fail('instagram')
  }
  const color = b.color === undefined ? '#ff4d9d' : b.color
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) return fail('color')
  const signature = b.signature === undefined || b.signature === null || b.signature === '' ? null : b.signature
  if (signature !== null && (typeof signature !== 'string' || signature.length > 400_000 || !SIGNATURE.test(signature))) return fail('signature')
  const minScore = b.minScore === undefined ? 0 : b.minScore
  if (typeof minScore !== 'number' || !Number.isInteger(minScore) || minScore < 0 || minScore > 1_000_000) return fail('minScore')
  const phase = b.phase === undefined ? 1 : b.phase
  if (phase !== 1 && phase !== 2 && phase !== 3) return fail('phase')
  const active = b.active === undefined ? true : b.active
  if (typeof active !== 'boolean') return fail('active')

  return { ok: true, artist: { name, kind: b.kind as ArtistInput['kind'], city, bio, instagram, color: color.toLowerCase(), signature, minScore, phase, active } }
}

/**
 * The admin area (/admin/...), used by the admin page (admin.html): moderate the global
 * leaderboard, keep the real artists and DJs, and see what each admin did.
 */
export function adminRouter(store: AdminStore, admins: Map<string, string>, failedLoginAllowed: (ip: string) => boolean) {
  const router = Router()

  router.use((req: Request, res: Response, next: NextFunction) => {
    const key = req.headers.authorization?.replace(/^Bearer\s+/i, '')
    const name = key ? admins.get(hash(key)) : undefined
    if (!name) {
      // Wrong keys are counted per address, so nobody can try keys in bulk.
      res.status(failedLoginAllowed(req.ip ?? 'unknown') ? 401 : 429).json({ error: 'auth' })
      return
    }
    res.locals.admin = name
    next()
  })
  const admin = (res: Response) => res.locals.admin as string
  const validId = (req: Request, res: Response) => {
    const id = req.params.id
    if (typeof id === 'string' && UUID.test(id)) return id
    res.status(400).json({ error: 'id' })
    return null
  }

  router.get('/me', (_req, res) => {
    res.json({ name: admin(res) })
  })

  router.get('/players', async (req, res) => {
    const mode = typeof req.query.mode === 'string' && MODES.has(req.query.mode) ? req.query.mode : 'runner'
    res.json(await store.players(mode, 200))
  })

  // Rename (or clear the nickname with null) and/or hide from the board.
  router.put('/players/:id', async (req, res) => {
    const id = validId(req, res)
    if (!id) return
    const change: { nickname?: string | null; hidden?: boolean } = {}
    if ('nickname' in (req.body ?? {})) {
      const nickname = req.body.nickname === null ? null : typeof req.body.nickname === 'string' ? req.body.nickname.trim() : ''
      if (nickname !== null && !NICKNAME.test(nickname)) {
        res.status(400).json({ error: 'nickname' })
        return
      }
      change.nickname = nickname
    }
    if ('hidden' in (req.body ?? {})) {
      if (typeof req.body.hidden !== 'boolean') {
        res.status(400).json({ error: 'hidden' })
        return
      }
      change.hidden = req.body.hidden
    }
    const player = await store.updatePlayer(id, change)
    if (!player) {
      res.status(404).json({ error: 'not-found' })
      return
    }
    if ('nickname' in change) await store.log(admin(res), change.nickname === null ? 'player.clear-nickname' : 'player.rename', id, { nickname: change.nickname })
    if ('hidden' in change) await store.log(admin(res), change.hidden ? 'player.hide' : 'player.show', id, { nickname: player.nickname })
    res.json(player)
  })

  router.get('/players/:id/runs', async (req, res) => {
    const id = validId(req, res)
    if (id) res.json(await store.playerRuns(id))
  })

  router.delete('/runs/:id', async (req, res) => {
    const id = validId(req, res)
    if (!id) return
    const run = await store.deleteRun(id)
    if (!run) {
      res.status(404).json({ error: 'not-found' })
      return
    }
    await store.log(admin(res), 'run.delete', id, { player: run.player_id, mode: run.mode, score: run.score })
    res.json({ deleted: true })
  })

  router.get('/artists', async (_req, res) => {
    res.json(await store.artists(false))
  })

  router.post('/artists', async (req, res) => {
    const parsed = parseArtist(req.body)
    if (!parsed.ok) {
      res.status(400).json({ error: 'field', field: parsed.field })
      return
    }
    const artist = await store.createArtist(parsed.artist)
    await store.log(admin(res), 'artist.create', artist.id, { name: artist.name, kind: artist.kind })
    res.status(201).json(artist)
  })

  router.put('/artists/:id', async (req, res) => {
    const id = validId(req, res)
    if (!id) return
    const parsed = parseArtist(req.body)
    if (!parsed.ok) {
      res.status(400).json({ error: 'field', field: parsed.field })
      return
    }
    const artist = await store.updateArtist(id, parsed.artist)
    if (!artist) {
      res.status(404).json({ error: 'not-found' })
      return
    }
    await store.log(admin(res), 'artist.update', id, { name: artist.name, active: artist.active })
    res.json(artist)
  })

  router.delete('/artists/:id', async (req, res) => {
    const id = validId(req, res)
    if (!id) return
    const name = await store.deleteArtist(id)
    if (name === null) {
      res.status(404).json({ error: 'not-found' })
      return
    }
    await store.log(admin(res), 'artist.delete', id, { name })
    res.json({ deleted: true })
  })

  router.get('/log', async (_req, res) => {
    res.json(await store.recentLog(100))
  })

  return router
}
