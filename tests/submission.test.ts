import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION, TICK_MS } from '../src/game/config'
import { awardSignature } from '../src/game/engine'
import { checkSubmission, isRunLog, type IssuedSeed } from '../src/game/submission'
import { playRun } from './helpers/bot'

const PLAYER = 'player-1'
const SEED = 1234
const { log } = playRun(SEED)
const runMs = (log.endTick ?? 0) * TICK_MS

/** A seed handed out long enough ago for this run. */
const issued = (patch: Partial<IssuedSeed> = {}): IssuedSeed => ({
  id: 'seed-1',
  user_id: PLAYER,
  seed: SEED,
  mode: 'runner',
  issued_at: new Date(Date.now() - runMs - 60_000).toISOString(),
  used_at: null,
  ...patch,
})

describe('run check (src/game/submission.ts)', () => {
  it('accepts an honest run with the replayed score', () => {
    const result = checkSubmission(log, issued(), PLAYER)
    expect(result).toEqual({ ok: true, score: log.score, endTick: log.endTick })
  })

  it.each([
    ['no seed', () => checkSubmission(log, null, PLAYER), 'seed-unknown'],
    ["another player's seed", () => checkSubmission(log, issued({ user_id: 'player-2' }), PLAYER), 'seed-not-yours'],
    ['a used seed', () => checkSubmission(log, issued({ used_at: new Date().toISOString() }), PLAYER), 'seed-used'],
    ['an expired seed', () => checkSubmission(log, issued({ issued_at: new Date(Date.now() - 4 * 3600_000).toISOString() }), PLAYER), 'seed-expired'],
    ['a run longer than the time since its seed', () => checkSubmission(log, issued({ issued_at: new Date().toISOString() }), PLAYER), 'too-fast'],
    ['a run on another seed', () => checkSubmission(log, issued({ seed: SEED + 1 }), PLAYER), 'seed-mismatch'],
    ['another mode', () => checkSubmission(log, issued({ mode: 'free' }), PLAYER), 'seed-mismatch'],
    ['an old engine version', () => checkSubmission({ ...log, version: ENGINE_VERSION - 1 }, issued(), PLAYER), 'old-version'],
    [
      'a run continued from a checkpoint',
      () => checkSubmission({ ...log, checkpoint: { phase: 2, score: 1200, speed: 8, coins: 0, signatures: [] } }, issued(), PLAYER),
      'continued-run',
    ],
    ['a forged score', () => checkSubmission({ ...log, score: (log.score ?? 0) + 500 }, issued(), PLAYER), 'replay-mismatch'],
    [
      'edited inputs',
      () => checkSubmission({ ...log, events: log.events.filter((e) => e.type !== 'jump' && e.type !== 'jumpEnd') }, issued(), PLAYER),
      'replay-mismatch',
    ],
    [
      'signatures nobody met (points added outside an encounter)',
      () =>
        checkSubmission(
          { ...log, events: [{ tick: 10, type: 'signature', artist: 'remo' }, ...log.events], score: (log.score ?? 0) + 150 },
          issued(),
          PLAYER
        ),
      'replay-mismatch',
    ],
    ['a signature with an unknown kind of artist id', () => checkSubmission({ ...log, events: [{ tick: 1, type: 'signature', artist: '<b>x</b>' }, ...log.events] }, issued(), PLAYER), 'bad-log'],
    ['garbage', () => checkSubmission({ hello: 1 }, issued(), PLAYER), 'bad-log'],
  ])('refuses %s', (_label, run, reason) => {
    expect(run()).toEqual({ ok: false, reason })
  })

  it('checks the shape of a log before replaying it', () => {
    expect(isRunLog(log)).toBe(true)
    expect(isRunLog({ ...log, width: 100 })).toBe(false) // a tiny world would change the physics
    expect(isRunLog({ ...log, events: [...log.events].reverse() })).toBe(log.events.length < 2)
    expect(isRunLog({ ...log, events: [{ tick: 1, type: 'teleport' }] })).toBe(false)
  })
})

describe('signatures of real artists', () => {
  const REAL = '3f2b6c1e-8a4d-4c7e-9b1a-2d3e4f5a6b7c'
  // A run where the player meets someone and signs the real artist the site picked.
  const signed = (() => {
    for (let seed = 1; seed < 300; seed++) {
      let met = false
      const run = playRun(seed, { onArtist: (state) => void (met = awardSignature(state, REAL) || met) })
      if (met) return { seed, log: run.log }
    }
    throw new Error('no seed with an encounter')
  })()
  const seed = () => issued({ seed: signed.seed, issued_at: new Date(Date.now() - 3600_000).toISOString() })

  it('accepts a real artist signed once unlocked', () => {
    expect(checkSubmission(signed.log, seed(), PLAYER, Date.now(), new Map([[REAL, { phase: 1, minScore: 0 }]]))).toMatchObject({ ok: true, score: signed.log.score })
  })

  it("refuses an artist the server doesn't know (a made-up id to farm points)", () => {
    expect(checkSubmission(signed.log, seed(), PLAYER)).toEqual({ ok: false, reason: 'unknown-artist' })
  })

  it('refuses a real artist signed before they unlock', () => {
    expect(checkSubmission(signed.log, seed(), PLAYER, Date.now(), new Map([[REAL, { phase: 3, minScore: 0 }]]))).toEqual({ ok: false, reason: 'replay-mismatch' })
    expect(checkSubmission(signed.log, seed(), PLAYER, Date.now(), new Map([[REAL, { phase: 1, minScore: 999_999 }]]))).toEqual({ ok: false, reason: 'replay-mismatch' })
  })
})
