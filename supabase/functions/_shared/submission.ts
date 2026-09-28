/**
 * Checks a submitted run before it enters the leaderboard. Pure logic, no Supabase here, so it
 * can be tested on its own: the functions fetch the seed row and pass it in.
 *
 * The score that counts is the one the server gets by replaying the run with the same engine,
 * never the number the client sends.
 */
// @deno-types="./vandal-engine.d.ts"
import { ENGINE_VERSION, MIN_WORLD_HEIGHT, MIN_WORLD_WIDTH, TICK_MS, verifyRun } from './vandal-engine.js'
import type { RunLog } from './vandal-engine.d.ts'

/** A seed handed out by start-run (a row of public.run_seeds). */
export interface IssuedSeed {
  id: string
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
const ARTISTS = new Set(['remo', 'pixo', 'nina'])

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
    if (event.type === 'signature' && !ARTISTS.has(event.artist as string)) return false
    if (event.type === 'resize' && !isWorldSize(event.width, event.height)) return false
  }
  return true
}

export function checkSubmission(log: unknown, seed: IssuedSeed | null, userId: string, now = Date.now()): SubmissionResult {
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

  const replay = verifyRun(log)
  if (!replay.valid) return fail('replay-mismatch')
  return { ok: true, score: replay.score, endTick: replay.tick }
}
