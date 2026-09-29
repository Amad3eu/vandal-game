/**
 * Checks a submitted run before it enters the global leaderboard. Pure logic, no database here:
 * the server (the Node one in server/leaderboard, or the Supabase functions) looks up the seed
 * it handed out and passes it in.
 *
 * The score that counts is the one the server gets by replaying the run with the same engine,
 * never the number the client sends.
 */
import { ENGINE_VERSION, MIN_WORLD_HEIGHT, MIN_WORLD_WIDTH, TICK_MS } from './config'
import type { RunLog } from './engine'
import { verifyRun } from './replay'

/** A seed handed out when a ranked run starts. */
export interface IssuedSeed {
  id: string
  /** The player it was handed to. */
  user_id: string
  seed: number
  mode: string
  issued_at: string
  used_at: string | null
}

export const LIMITS = {
  /** Longest run accepted (the replay has to fit in the function's CPU time). */
  maxRunMinutes: 30,
  maxEvents: 100_000,
  /** A seed must be used within this time. */
  seedTtlMinutes: 180,
  /** Network and clock slack when comparing the run's length with the time since the seed. */
  slackMs: 20_000,
  maxWorld: 4000,
}

export type SubmissionResult = { ok: true; score: number; endTick: number } | { ok: false; reason: string }

const EVENT_TYPES = new Set(['held', 'jump', 'jumpEnd', 'dash', 'resume', 'signature', 'resize'])
/** A signature's artist: one of the game's own, or a real one registered on the server (a UUID). */
const GAME_ARTISTS = new Set(['remo', 'pixo', 'nina'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value)
const isArtistId = (value: unknown) => typeof value === 'string' && (GAME_ARTISTS.has(value) || isUuid(value))

/** When a real artist registered on the server unlocks: from this phase and this score. */
export interface ArtistRule {
  phase: number
  minScore: number
}

const isInt = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

const isWorldSize = (width: unknown, height: unknown) =>
  typeof width === 'number' &&
  typeof height === 'number' &&
  width >= MIN_WORLD_WIDTH - 1 &&
  height >= MIN_WORLD_HEIGHT - 1 &&
  width <= LIMITS.maxWorld &&
  height <= LIMITS.maxWorld

/** Shape check: only what the engine can replay, in order, within limits. */
export function isRunLog(value: unknown): value is RunLog {
  if (!value || typeof value !== 'object') return false
  const log = value as Record<string, unknown>
  if (!isInt(log.version, 1) || !isInt(log.seed, 0, 4294967295)) return false
  if (log.mode !== 'runner' && log.mode !== 'free') return false
  if (typeof log.intro !== 'boolean' || !isWorldSize(log.width, log.height)) return false
  if (!isInt(log.endTick, 1) || !isInt(log.score)) return false
  if (!Array.isArray(log.events) || log.events.length > LIMITS.maxEvents) return false
  let lastTick = 0
  for (const event of log.events as Record<string, unknown>[]) {
    if (!event || typeof event !== 'object' || !EVENT_TYPES.has(event.type as string)) return false
    if (!isInt(event.tick) || event.tick < lastTick || event.tick > (log.endTick as number)) return false
    lastTick = event.tick
    if (event.type === 'held') {
      const held = event.held as Record<string, unknown> | undefined
      if (!held || typeof held.left !== 'boolean' || typeof held.right !== 'boolean' || typeof held.down !== 'boolean') return false
    }
    if (event.type === 'signature' && !isArtistId(event.artist)) return false
    if (event.type === 'resize' && !isWorldSize(event.width, event.height)) return false
  }
  return true
}

/**
 * `artists` has the rules of the real artists signed in the log (the server looks them up); a
 * signature must be one of the game's own artists or one of these, signed once it was unlocked.
 */
export function checkSubmission(
  log: unknown,
  seed: IssuedSeed | null,
  userId: string,
  now = Date.now(),
  artists: ReadonlyMap<string, ArtistRule> = new Map()
): SubmissionResult {
  const fail = (reason: string): SubmissionResult => ({ ok: false, reason })
  if (!seed) return fail('seed-unknown')
  if (seed.user_id !== userId) return fail('seed-not-yours')
  if (seed.used_at) return fail('seed-used')
  const issuedAt = Date.parse(seed.issued_at)
  if (!(now - issuedAt <= LIMITS.seedTtlMinutes * 60_000)) return fail('seed-expired')

  if (!isRunLog(log)) return fail('bad-log')
  if (log.version !== ENGINE_VERSION) return fail('old-version')
  if (log.seed !== seed.seed || log.mode !== seed.mode) return fail('seed-mismatch')
  // v1: only runs from phase 1 count; a continued run's starting points came from another run.
  if (log.checkpoint) return fail('continued-run')

  const endTick = log.endTick as number
  if (endTick > (LIMITS.maxRunMinutes * 60_000) / TICK_MS) return fail('too-long')
  // A run can't have lasted longer than the time since its seed was handed out.
  if (endTick * TICK_MS > now - issuedAt + LIMITS.slackMs) return fail('too-fast')

  // Signatures: the game's own artists, or real ones registered on the server...
  for (const event of log.events) {
    if (event.type === 'signature' && !GAME_ARTISTS.has(event.artist) && !artists.has(event.artist)) return fail('unknown-artist')
  }
  // ...signed only once unlocked (the replay skips a locked one, so the score stops matching).
  const replay = verifyRun(log, {
    canSign: (artist, state) => {
      const rule = artists.get(artist)
      return !rule || (state.phase >= rule.phase && state.score >= rule.minScore)
    },
  })
  if (!replay.valid) return fail('replay-mismatch')
  return { ok: true, score: replay.score, endTick: replay.tick }
}
