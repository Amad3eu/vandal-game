import { describe, expect, it } from 'vitest'
import {
  BIRD_ALTITUDE,
  BIRD_LOW_ALTITUDE,
  CONE_HEIGHT,
  DUCK_BAR_CLEARANCE,
  DUCK_BAR_TOP,
  DUCK_BAR_WIDTH,
  FRAME_TIME,
  GRAFFITI_SIGNATURE_SCORE,
  PHASE_2_SCORE,
  RAMP_WIDTH,
  SLAM_MS,
  TICK_MS,
  TRAIN_PLATFORM_HEIGHT,
  TRAIN_PLATFORM_WIDTH,
  TRAIN_RUNWAY_FRAMES,
} from '../src/game/config'
import { RUNNER_TUNING } from '../src/data/gameModes'
import { advanceGame, awardSignature, createGameState, getView, pressJump, resizeWorld, resumeGame, type GameState } from '../src/game/engine'
import { verifyRun } from '../src/game/replay'
import type { Obstacle } from '../src/types/game'
import { IDLE, frame, playRun } from './helpers/bot'
import { createRandom } from '../src/game/random'
import { createFloatingPath, createObstacle, getSpawnGap } from '../src/game/spawn'

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
      checkpoint: { phase: 2, score: PHASE_2_SCORE + 300, speed: 8, coins: 3, signatures: [] },
    })
    expect(state.phase).toBe(2)
    expect(state.score).toBe(PHASE_2_SCORE + 300)
  })

  it('counts a signature only during an encounter, one per encounter', () => {
    const state = quietRun()
    const realArtist = '3f2b6c1e-8a4d-4c7e-9b1a-2d3e4f5a6b7c'
    expect(awardSignature(state, 'remo')).toBe(false) // nobody met yet

    const p = state.player
    state.obstacles = [{ id: 500, x: p.x + 10, y: p.y + p.height - 80, width: 80, height: 80, type: 'graffiti-artist', graffitiArtist: 'nina', passed: false }]
    const events = advanceGame(state, IDLE, TICK_MS)
    expect(events).toContainEqual({ type: 'artist', artist: 'nina' })
    expect(state.paused).toBe(true)

    const before = state.score
    expect(awardSignature(state, realArtist)).toBe(true) // any artist the front end chose
    expect(awardSignature(state, 'pixo')).toBe(false) // one per encounter
    expect(state.score).toBe(before + GRAFFITI_SIGNATURE_SCORE)
    resumeGame(state)
    expect(awardSignature(state, 'remo')).toBe(false) // the encounter is over
    expect(state.signatures).toEqual([realArtist])
  })

  it('an artist met stays on the sidewalk (no second encounter, never a hazard)', () => {
    const state = quietRun()
    state.introMs = 99999
    const p = state.player
    state.obstacles = [{ id: 950, x: p.x + p.width + 20, y: state.config.groundLevel - 88, width: 80, height: 80, type: 'graffiti-artist', graffitiArtist: 'pixo', passed: false }]
    let encounters = 0
    let metAndStaying = false
    for (let i = 0; i < 120 && !state.gameOver; i++) {
      if (frame(state).some((e) => e.type === 'artist')) encounters++
      if (encounters === 1 && state.obstacles.find((o) => o.id === 950)?.met) metAndStaying = true
    }
    expect(encounters).toBe(1) // touched for many frames, met once
    expect(metAndStaying).toBe(true)
    expect(state.gameOver).toBe(false)
  })

  it('counts the distance run', () => {
    const state = quietRun()
    for (let i = 0; i < 120; i++) frame(state)
    expect(getView(state).distance).toBeGreaterThan(0)
  })

  describe('obstacles of version 4', () => {
    const DUCK = { ...IDLE, down: true }
    /** Runs until the obstacle has gone past the player (or the run ends). */
    const pass = (state: GameState, input = IDLE, onFrame?: (frame: number) => void) => {
      for (let i = 0; i < 200 && !state.gameOver && state.obstacles.some((o) => o.x + o.width > state.player.x); i++) {
        onFrame?.(i)
        advanceGame(state, input, TICK_MS)
      }
      return !state.gameOver
    }
    const ahead = (state: GameState, o: Omit<Obstacle, 'id' | 'x' | 'passed'>, distance = 200) => {
      state.obstacles = [{ id: 900, x: state.player.x + state.player.width + distance, passed: false, ...o }]
    }
    const ground = (state: GameState) => state.config.groundLevel

    it("a train's front is solid: running into it is a crash", () => {
      const state = quietRun()
      ahead(state, { y: ground(state) - TRAIN_PLATFORM_HEIGHT - 8, width: TRAIN_PLATFORM_WIDTH, height: TRAIN_PLATFORM_HEIGHT, type: 'train' })
      expect(pass(state)).toBe(false)
    })

    it('a well-timed jump lands on the train roof', () => {
      const state = quietRun()
      ahead(state, { y: ground(state) - TRAIN_PLATFORM_HEIGHT - 8, width: TRAIN_PLATFORM_WIDTH * 2, height: TRAIN_PLATFORM_HEIGHT, type: 'train' }, state.speed * 20)
      pressJump(state)
      let rodeTheRoof = false
      const alive = pass(state, IDLE, () => {
        const train = state.obstacles[0]
        if (state.player.y + state.player.height === train.y) rodeTheRoof = true
      })
      expect(alive).toBe(true)
      expect(rodeTheRoof).toBe(true)
    })

    it('a ramp carries the player up onto the train without a jump', () => {
      const state = quietRun()
      state.nextSpawnGap = 0
      state.score = 600
      // The real thing: a train line with its ramp, as the spawner builds it.
      let line = createFloatingPath(state).obstacles
      for (let seed = 2; !line.some((o) => o.type === 'ramp'); seed++) {
        state.random = createRandom(seed)
        line = createFloatingPath(state).obstacles
      }
      const shift = state.player.x + state.player.width + 100 - line[0].x
      state.obstacles = line.map((o) => ({ ...o, x: o.x + shift }))
      state.nextSpawnGap = Infinity
      const ramp = state.obstacles.find((o) => o.type === 'ramp')!
      expect(ramp.width).toBe(RAMP_WIDTH)
      let highest = 0
      for (let i = 0; i < 160 && !state.gameOver; i++) {
        advanceGame(state, IDLE, TICK_MS)
        highest = Math.max(highest, ground(state) - (state.player.y + state.player.height))
      }
      expect(state.gameOver).toBe(false)
      expect(highest).toBeGreaterThanOrEqual(TRAIN_PLATFORM_HEIGHT + 8 - 1)
    })

    /** A line of train cars with no ramp, its front `distance` px ahead of the player. */
    const trainLine = (state: GameState, cars: number, distance = 200) => {
      state.obstacles = Array.from({ length: cars }, (_, i) => ({
        id: 910 + i,
        x: state.player.x + state.player.width + distance + i * TRAIN_PLATFORM_WIDTH,
        y: ground(state) - TRAIN_PLATFORM_HEIGHT - 8,
        width: TRAIN_PLATFORM_WIDTH,
        height: TRAIN_PLATFORM_HEIGHT,
        type: 'train' as const,
        passed: false,
      }))
    }
    /** Runs until the whole line has gone past the player (or the run ends); calls back each frame. */
    const pastTheLine = (state: GameState, onFrame?: (events: ReturnType<typeof advanceGame>) => void) => {
      for (let i = 0; i < 900 && !state.gameOver && state.obstacles.some((o) => o.type === 'train' && !o.knocked && o.x + o.width > state.player.x); i++) {
        onFrame?.(advanceGame(state, IDLE, TICK_MS))
      }
      return !state.gameOver
    }

    it('a skate SLAM into a train knocks the whole line, and the run goes on', () => {
      const state = quietRun()
      state.skateMs = 60_000
      trainLine(state, 4)
      let slammed = false
      const alive = pastTheLine(state, (events) => {
        if (events.some((e) => e.type === 'slam')) slammed = state.obstacles.filter((o) => o.type === 'train').every((o) => o.knocked)
      })
      expect(slammed).toBe(true)
      // Back on the feet, with the street clear.
      for (let i = 0; i < 200 && !state.gameOver; i++) advanceGame(state, IDLE, TICK_MS)
      expect(alive && !state.gameOver).toBe(true)
    })

    it('invincible at the front (lightning), the player climbs onto the roof and rides on after it wears off', () => {
      const state = quietRun()
      state.lightningMs = 700 // still on at the front (about 29 frames away), over before the line ends
      trainLine(state, 4)
      const roof = state.obstacles[0].y
      let rode = false
      const alive = pastTheLine(state, () => {
        if (state.lightningMs === 0 && state.player.y + state.player.height === roof) rode = true
      })
      expect(alive).toBe(true)
      expect(rode).toBe(true)
    })

    it('a resize while riding a train keeps the player on the roof', () => {
      const state = quietRun()
      trainLine(state, 3, -60)
      state.player = { ...state.player, y: state.obstacles[0].y - state.player.height, velocityY: 0 }
      for (let i = 0; i < 10; i++) advanceGame(state, IDLE, TICK_MS)
      resizeWorld(state, 1280, 700)
      expect(state.player.y + state.player.height).toBe(state.obstacles[0].y)
      expect(pastTheLine(state)).toBe(true)
    })

    it('the next obstacle waits for the runway before a train line with no ramp', () => {
      for (let seed = 1; seed <= 30; seed++) {
        const state = quietRun(seed)
        const { obstacles, length } = createFloatingPath(state)
        const cars = obstacles.filter((o) => o.type === 'train')
        expect(length).toBeCloseTo(Math.max(...cars.map((o) => o.x + o.width)) - (state.worldWidth + 20))
        if (!obstacles.some((o) => o.type === 'ramp')) expect(length).toBeCloseTo(state.effectiveSpeed * TRAIN_RUNWAY_FRAMES + cars.length * TRAIN_PLATFORM_WIDTH)
      }
    })

    it('later phases bring obstacles closer, never under a full jump', () => {
      const state = quietRun()
      const speed = RUNNER_TUNING.maxSpeed + 2
      for (const phase of [1, 2, 3] as const) {
        state.phase = phase
        for (let i = 0; i < 300; i++) expect((getSpawnGap(state, speed) / speed) * FRAME_TIME).toBeGreaterThanOrEqual(RUNNER_TUNING.minGapMs[1] - 1e-9)
      }
    })

    it('the hanging beam: ducking passes, standing or jumping hits', () => {
      const beam = (state: GameState) =>
        ahead(state, { y: ground(state) - DUCK_BAR_TOP, width: DUCK_BAR_WIDTH, height: DUCK_BAR_TOP - DUCK_BAR_CLEARANCE, type: 'duck-bar' })
      const ducking = quietRun()
      beam(ducking)
      expect(pass(ducking, DUCK)).toBe(true)
      const standing = quietRun()
      beam(standing)
      expect(pass(standing)).toBe(false)
      for (const early of [6, 12, 18, 24]) {
        const jumping = quietRun()
        beam(jumping)
        expect(pass(jumping, IDLE, (f) => f === Math.max(0, Math.floor(200 / jumping.speed) - early) && pressJump(jumping))).toBe(false)
      }
    })

    it('low birds are jumped (ducking hits them); high birds are ducked under', () => {
      const bird = (state: GameState, altitude: number) => ahead(state, { y: ground(state) - altitude, width: 46, height: 28, type: 'bird' })
      const lowDuck = quietRun()
      bird(lowDuck, BIRD_LOW_ALTITUDE)
      expect(pass(lowDuck, DUCK)).toBe(false)
      const lowJump = quietRun()
      bird(lowJump, BIRD_LOW_ALTITUDE)
      expect(pass(lowJump, IDLE, (f) => f === Math.floor(200 / lowJump.speed) - 8 && pressJump(lowJump))).toBe(true)
      const highDuck = quietRun()
      bird(highDuck, BIRD_ALTITUDE)
      expect(pass(highDuck, DUCK)).toBe(true)
    })

    it('cones come one at a time early on, in groups later', () => {
      const widths = (score: number) => {
        const seen = new Set<number>()
        for (let seed = 1; seed <= 60; seed++) {
          const state = createGameState({ mode: 'runner', width: 1280, height: 720, seed })
          state.score = score
          for (let i = 0; i < 40; i++) {
            const o = createObstacle(state)
            if (o.type === 'cone') {
              seen.add(o.width)
              expect(o.height).toBe(CONE_HEIGHT)
            }
          }
        }
        return [...seen].sort((a, b) => a - b)
      }
      expect(widths(100)).toHaveLength(1)
      expect(widths(2500).length).toBe(3)
    })

    it('in the free mode a train blocks walking, and its roof can be reached with a jump', () => {
      const state = createGameState({ mode: 'free', width: 1280, height: 720, seed: 4 })
      state.nextSpawnGap = Infinity
      state.introMs = 99999
      state.obstacles = [{ id: 901, x: state.player.x + state.player.width + 40, y: ground(state) - TRAIN_PLATFORM_HEIGHT - 8, width: TRAIN_PLATFORM_WIDTH, height: TRAIN_PLATFORM_HEIGHT, type: 'train', passed: false }]
      for (let i = 0; i < 120; i++) advanceGame(state, { ...IDLE, right: true }, TICK_MS)
      expect(state.gameOver).toBe(false)
      expect(state.player.x + state.player.width).toBeLessThan(state.obstacles[0].x + 30) // stopped at its side
    })
  })
})

