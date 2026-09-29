import { describe, expect, it } from 'vitest'
import { PHASE_2_SCORE, SLAM_MS, TICK_MS } from '../src/game/config'
import { advanceGame, createGameState, getView, pressJump, type GameState } from '../src/game/engine'
import { verifyRun } from '../src/game/replay'
import type { Obstacle } from '../src/types/game'
import { IDLE, frame, playRun } from './helpers/bot'

/** A run already past the intro, with no random obstacles (the test places its own). */
function quietRun(seed = 1) {
  const state = createGameState({ mode: 'runner', width: 1280, height: 720, seed })
  state.nextSpawnGap = Infinity
  return state
}

/** A spray right on top of the player. */
function sprayOnPlayer(state: GameState): Obstacle {
  const p = state.player
  return { id: 9999, x: p.x + 10, y: p.y + p.height - 80, width: 80, height: 80, type: 'spray', passed: false }
}

describe('engine', () => {
  it('plays the same run from the same seed', () => {
    const a = playRun(42).log
    const b = playRun(42).log
    expect(a.score).toBe(b.score)
    expect(a.endTick).toBe(b.endTick)
    expect(a.events).toEqual(b.events)
    expect(a.score).toBeGreaterThan(500)
  })

  it('runs the same physics at 30, 60 and 144 Hz (fixed ticks)', () => {
    /** The player's height at each tick reached, for a held jump played at this frame rate. */
    const jumpAt = (hz: number) => {
      const state = quietRun()
      pressJump(state)
      const heights = new Map<number, number>()
      for (let i = 0; i < hz; i++) {
        advanceGame(state, IDLE, 1000 / hz)
        heights.set(state.tick, state.player.y)
      }
      return heights
    }
    const at60 = jumpAt(60)
    for (const hz of [30, 144]) {
      const other = [...jumpAt(hz)].filter(([tick]) => at60.has(tick))
      expect(other.length).toBeGreaterThan(20)
      for (const [tick, y] of other) expect(y).toBe(at60.get(tick))
    }
    expect(Math.min(...at60.values())).toBeLessThan(quietRun().player.y - 100) // it really jumped
  })

  it('replays a recorded run to the same score, and catches a forged score', () => {
    const { log } = playRun(7)
    const replay = verifyRun(log)
    expect(replay.valid).toBe(true)
    expect(replay.score).toBe(log.score)
    expect(verifyRun({ ...log, score: (log.score ?? 0) + 100 }).valid).toBe(false)
  })

  it('ends the run when the player hits a spray without a skate', () => {
    const state = quietRun()
    state.obstacles = [sprayOnPlayer(state)]
    for (let i = 0; i < 5 && !state.gameOver; i++) frame(state)
    expect(state.gameOver).toBe(true)
  })

  it('turns a crash on a skate into a SLAM: down, back up blinking, still playing', () => {
    const state = quietRun()
    state.skateMs = 5000
    state.obstacles = [sprayOnPlayer(state)]
    frame(state)
    expect(state.gameOver).toBe(false)
    expect(state.slamMs).toBeGreaterThan(0)
    expect(state.skateMs).toBe(0)
    expect(state.obstacles[0].knocked).toBe(true)
    expect(getView(state).slamProgress).not.toBeNull()

    for (let i = 0; i < Math.ceil(SLAM_MS / TICK_MS) + 2; i++) frame(state)
    expect(state.gameOver).toBe(false)
    expect(state.slamMs).toBe(0)
    expect(getView(state).recovering).toBe(true)
    expect(state.obstacles.some((o) => o.knocked)).toBe(false)
  })

  it('spawns skate pickups once the score is high enough', () => {
    const state = createGameState({ mode: 'runner', width: 1280, height: 720, seed: 5 })
    let sawSkate = false
    for (let i = 0; i < 60 * 180 && !sawSkate; i++) {
      // Invincible so the run goes on (renewed every frame: a lightning pickup would shorten it).
      state.lightningMs = 60_000
      frame(state)
      sawSkate = state.obstacles.some((o) => o.type === 'skate')
    }
    expect(sawSkate).toBe(true)
  })

  it('builds the checkpoint climb when the score reaches phase 2', () => {
    const state = quietRun()
    state.score = PHASE_2_SCORE
    state.lightningMs = Number.MAX_SAFE_INTEGER
    state.nextSpawnGap = 0
    state.spawnDistance = 0
    for (let i = 0; i < 90; i++) frame(state)
    expect(state.obstacles.filter((o) => o.type === 'floating-platform').length).toBeGreaterThanOrEqual(3)
  })

  it('continues from a checkpoint with its phase and score', () => {
    const state = createGameState({
      mode: 'runner',
      width: 1280,
      height: 720,
      checkpoint: { phase: 2, score: 1500, speed: 8, coins: 3, signatures: [] },
    })
    expect(state.phase).toBe(2)
    expect(state.score).toBe(1500)
  })

  it('counts the distance run', () => {
    const state = quietRun()
    for (let i = 0; i < 120; i++) frame(state)
    expect(getView(state).distance).toBeGreaterThan(0)
  })
})
