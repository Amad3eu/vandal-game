import type { GraffitiArtist, Obstacle } from '../types/game'
import { FREE_TUNING, RUNNER_TUNING } from '../data/gameModes'
import type { GameState } from './engine'
import {
  BIRD_ALTITUDE,
  BIRD_LOW_ALTITUDE,
  BUILDING_EXTRA_AIRTIME_FRAMES,
  BUILDING_WIDTH,
  CHECKPOINT_FLAG_HEIGHT,
  CHECKPOINT_FLAG_WIDTH,
  CLIMB_FIRST_STEP,
  CLIMB_GAP_FRAMES,
  CLIMB_PLATFORM_THICKNESS,
  CLIMB_STEP_FRAMES,
  CLIMB_STEP_RISE,
  CLIMB_STEPS,
  CLIMB_TOP_FRAMES,
  CONE_HEIGHT,
  CONE_SPACING,
  CONE_WIDTH,
  DUCK_BAR_CLEARANCE,
  DUCK_BAR_TOP,
  DUCK_BAR_WIDTH,
  FRAME_TIME,
  PHASE_MIX,
  POWERUP_SIZE,
  RAMP_CHANCE,
  RAMP_WIDTH,
  TRAIN_RUNWAY_FRAMES,
  SKATE_SPAWN_CHANCE,
  SKATE_SPAWN_SCORE,
  TRAIN_PLATFORM_HEIGHT,
  TRAIN_PLATFORM_WIDTH,
  TRAMPOLINE_EXTRA_AIRTIME_FRAMES,
} from './config'

/**
 * Distance (px) until the next spawn. The runner converts a minimum *time* between
 * obstacles (longer than a full jump) into pixels, so there is always room to land and
 * react at any speed; the free mode uses plain distances because the player sets the pace.
 */
export function getSpawnGap(state: GameState, speed: number) {
  if (state.mode === 'free') {
    const phaseFactor = 1 - 0.08 * (state.phase - 1)
    return (FREE_TUNING.minGap + state.random() * (FREE_TUNING.maxGap - FREE_TUNING.minGap)) * phaseFactor
  }
  const progress = Math.min(
    1,
    Math.max(0, (speed - RUNNER_TUNING.initialSpeed) / (RUNNER_TUNING.maxSpeed - RUNNER_TUNING.initialSpeed))
  )
  const lerp = ([start, end]: number[]) => start + (end - start) * progress
  const minMs = lerp(RUNNER_TUNING.minGapMs)
  const maxMs = lerp(RUNNER_TUNING.maxGapMs)
  // Later phases bring obstacles closer together, never under the minimum (a full jump).
  const rangeFactor = 1 - 0.25 * (state.phase - 1)
  return speed * ((minMs + state.random() * (maxMs - minMs) * rangeFactor) / FRAME_TIME)
}

/**
 * Extra distance before the next spawn after obstacles the player stays on or above for
 * longer than a normal jump: a wall-jump over a building, a trampoline bounce. (Train lines
 * get theirs from createFloatingPath's length.)
 */
export function spacingAfter(state: GameState, obstacle: Obstacle, speed: number) {
  if (state.mode !== 'runner') return 0
  if (obstacle.type === 'building') return obstacle.width + speed * BUILDING_EXTRA_AIRTIME_FRAMES
  if (obstacle.type === 'trampoline') return speed * TRAMPOLINE_EXTRA_AIRTIME_FRAMES
  return 0
}

/**
 * A line of 1–4 train cars to ride on, with coins on top and a power-up. The cars are solid:
 * the player gets on with a jump or, most of the time, up a ramp in front of the first car.
 * Returns the pieces and the line's length from where it spawns (runway included).
 */
export function createFloatingPath(state: GameState): { obstacles: Obstacle[]; length: number } {
  const startX = state.worldWidth + 20
  const y = state.config.groundLevel - TRAIN_PLATFORM_HEIGHT - 8
  const minCars = PHASE_MIX.minCars[state.phase - 1]
  const trainCount = minCars + Math.floor(state.random() * (5 - minCars)) // up to 4 cars
  const withRamp = state.random() < RAMP_CHANCE
  // Without a ramp the jump onto the roof starts earlier than any other: leave room for it after
  // whatever came before.
  const runway = withRamp ? 0 : state.mode === 'runner' ? state.effectiveSpeed * TRAIN_RUNWAY_FRAMES : 0
  const trainsX = startX + runway + (withRamp ? RAMP_WIDTH : 0)
  const totalWidth = TRAIN_PLATFORM_WIDTH * trainCount
  const spawned: Obstacle[] = []

  if (withRamp) {
    spawned.push({
      id: state.nextObstacleId++,
      x: startX,
      y,
      width: RAMP_WIDTH,
      height: TRAIN_PLATFORM_HEIGHT,
      type: 'ramp',
      passed: false,
    })
    // Coins up the slope show the way.
    for (let c = 1; c <= 3; c += 1) {
      const along = (c / 4) * RAMP_WIDTH
      spawned.push({
        id: state.nextObstacleId++,
        x: startX + along - 9,
        y: y + TRAIN_PLATFORM_HEIGHT * (1 - along / RAMP_WIDTH) - 52,
        width: 18,
        height: 18,
        type: 'coin',
        passed: false,
      })
    }
  }

  for (let i = 0; i < trainCount; i += 1) {
    spawned.push({
      id: state.nextObstacleId++,
      x: trainsX + i * TRAIN_PLATFORM_WIDTH,
      y,
      width: TRAIN_PLATFORM_WIDTH,
      height: TRAIN_PLATFORM_HEIGHT,
      type: 'train',
      passed: false,
    })
  }

  const coinCount = 2 + trainCount * 2
  for (let c = 0; c < coinCount; c += 1) {
    spawned.push({
      id: state.nextObstacleId++,
      x: trainsX + 40 + c * Math.floor((totalWidth - 80) / coinCount),
      y: y - 34,
      width: 18,
      height: 18,
      type: 'coin',
      passed: false,
    })
  }

  const powerType = state.random() < 0.55 ? 'power-lightning' : 'power-jump'
  spawned.push({
    id: state.nextObstacleId++,
    x: trainsX + totalWidth * 0.52,
    y: y - 54,
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    type: powerType,
    passed: false,
  })

  return { obstacles: spawned, length: trainsX + totalWidth - startX }
}

/**
 * Stairs of floating platforms (one-way: you jump up through them) with a coin over each step
 * and the checkpoint flag at the end of the top one. `speed` is how fast the player crosses
 * them (px per frame). Returns the pieces and the climb's length.
 */
export function createClimb(state: GameState, phase: 2 | 3, speed: number) {
  const startX = state.worldWidth + 20
  const groundLevel = state.config.groundLevel
  const steps = CLIMB_STEPS[phase]
  const travel = Math.max(RUNNER_TUNING.initialSpeed, speed)
  const stepWidth = Math.round(travel * CLIMB_STEP_FRAMES)
  const stepGap = Math.round(travel * CLIMB_GAP_FRAMES)
  const spawned: Obstacle[] = []
  let x = startX

  for (let i = 0; i < steps; i += 1) {
    const isTop = i === steps - 1
    const width = isTop ? Math.round(travel * CLIMB_TOP_FRAMES) : stepWidth
    const y = groundLevel - CLIMB_FIRST_STEP - i * CLIMB_STEP_RISE
    spawned.push({
      id: state.nextObstacleId++,
      x,
      y,
      width,
      height: CLIMB_PLATFORM_THICKNESS,
      type: 'floating-platform',
      passed: false,
    })
    if (isTop) {
      spawned.push({
        id: state.nextObstacleId++,
        x: x + width - CHECKPOINT_FLAG_WIDTH - 28,
        y: y - CHECKPOINT_FLAG_HEIGHT,
        width: CHECKPOINT_FLAG_WIDTH,
        height: CHECKPOINT_FLAG_HEIGHT,
        type: 'checkpoint',
        phase,
        passed: false,
      })
    } else {
      spawned.push({
        id: state.nextObstacleId++,
        x: x + width / 2 - 9,
        y: y - 64,
        width: 18,
        height: 18,
        type: 'coin',
        passed: false,
      })
    }
    x += width + (isTop ? 0 : stepGap)
  }

  return { obstacles: spawned, length: x - startX }
}

export function createObstacle(state: GameState): Obstacle {
  const x = state.worldWidth + 20
  const groundLevel = state.config.groundLevel
  const random = state.random

  // Fase 3 (Telhados): prédios altos que exigem wall-jump para escalar.
  if (state.phase === 3 && random() < 0.26) {
    const height = 100 + Math.floor(random() * 77) // 100–176px: os mais altos pedem wall-jump
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - height - 8,
      width: BUILDING_WIDTH,
      height,
      type: 'building',
      passed: false,
    }
  }

  // Spawn grafiteiros com base no score (após certo ponto)
  const canSpawnGraffitiArtist = state.score >= 1000
  if (canSpawnGraffitiArtist && random() < 0.08) {
    const artists: GraffitiArtist[] = ['remo', 'pixo', 'nina']
    const artist = artists[Math.floor(random() * artists.length)]

    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - 80 - 8,
      width: 80,
      height: 80,
      type: 'graffiti-artist',
      graffitiArtist: artist,
      passed: false,
    }
  }

  // Skate (rare): saves the run from one crash. Never while one is active or already coming.
  const canSpawnSkate =
    state.score >= SKATE_SPAWN_SCORE && state.skateMs <= 0 && !state.obstacles.some((obs) => obs.type === 'skate')
  if (canSpawnSkate && random() < SKATE_SPAWN_CHANCE) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - 38,
      width: 64,
      height: 30,
      type: 'skate',
      passed: false,
    }
  }

  const canSpawnSpray = state.score >= 600 && !state.obstacles.some((obs) => obs.type === 'spray')

  if (canSpawnSpray && random() < 0.12) {
    const size = 80
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - size - 8,
      width: size,
      height: size,
      type: 'spray',
      passed: false,
    }
  }

  // Construction beam hanging over the street: duck under it (a jump hits it). More often later on.
  if (state.score >= 700 && random() < 0.14 + 0.04 * (state.phase - 1)) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - DUCK_BAR_TOP,
      width: DUCK_BAR_WIDTH,
      height: DUCK_BAR_TOP - DUCK_BAR_CLEARANCE,
      type: 'duck-bar',
      passed: false,
    }
  }

  if (state.score >= 360 && random() < 0.12) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - 24,
      width: 56,
      height: 24,
      type: 'trampoline',
      passed: false,
    }
  }

  if (random() < PHASE_MIX.cones[state.phase - 1]) return createCones(state, x)

  if (state.score >= 280 && random() < 0.22) {
    const size = 80
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - size - 8,
      width: size,
      height: size,
      type: 'spray',
      passed: false,
    }
  }

  const canSpawnBird = state.score >= 400
  const spawnBird = canSpawnBird && random() < PHASE_MIX.birds[state.phase - 1]

  if (spawnBird) {
    // Low ones are jumped (like a spray), high ones ducked under (like a beam): one clear move each.
    const low = random() < 0.5
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - (low ? BIRD_LOW_ALTITUDE : BIRD_ALTITUDE),
      width: 46,
      height: 28,
      type: 'bird',
      passed: false,
    }
  }

  // Nothing else came up: a spray can, or cones at the very start.
  if (state.score < 280) return createCones(state, x)
  const size = 80

  return {
    id: state.nextObstacleId++,
    x,
    y: groundLevel - size - 8,
    width: size,
    height: size,
    type: 'spray',
    passed: false,
  }
}

/** Traffic cones: one at first, groups of up to 3 later (a longer jump). */
function createCones(state: GameState, x: number): Obstacle {
  const most = state.score < 800 ? 1 : state.score < 2000 ? 2 : 3
  const count = 1 + Math.floor(state.random() * most)
  return {
    id: state.nextObstacleId++,
    x,
    y: state.config.groundLevel - CONE_HEIGHT - 8,
    width: count * CONE_WIDTH + (count - 1) * CONE_SPACING,
    height: CONE_HEIGHT,
    type: 'cone',
    passed: false,
  }
}
