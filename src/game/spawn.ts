import type { GraffitiArtist, Obstacle } from '../types/game'
import { FREE_TUNING, RUNNER_TUNING } from '../data/gameModes'
import type { GameState } from './engine'
import {
  BIRD_ALTITUDE,
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
  FRAME_TIME,
  POWERUP_SIZE,
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
  return speed * ((minMs + state.random() * (maxMs - minMs)) / FRAME_TIME)
}

/**
 * Extra distance before the next spawn after obstacles the player stays on or above for
 * longer than a normal jump: riding a single train to its end, a wall-jump over a building,
 * a trampoline bounce. The free mode only needs the train's length: the player sets the pace.
 */
export function spacingAfter(state: GameState, obstacle: Obstacle, speed: number) {
  if (obstacle.type === 'train') return obstacle.width
  if (state.mode !== 'runner') return 0
  if (obstacle.type === 'building') return obstacle.width + speed * BUILDING_EXTRA_AIRTIME_FRAMES
  if (obstacle.type === 'trampoline') return speed * TRAMPOLINE_EXTRA_AIRTIME_FRAMES
  return 0
}

/** A line of 2–4 trains to ride on, with coins on top and a power-up. */
export function createFloatingPath(state: GameState): Obstacle[] {
  const startX = state.worldWidth + 20
  const y = state.config.groundLevel - TRAIN_PLATFORM_HEIGHT - 8
  const trainCount = 2 + Math.floor(state.random() * 3) // 2, 3 ou 4 trens lado a lado
  const totalWidth = TRAIN_PLATFORM_WIDTH * trainCount
  const spawned: Obstacle[] = []

  for (let i = 0; i < trainCount; i += 1) {
    spawned.push({
      id: state.nextObstacleId++,
      x: startX + i * TRAIN_PLATFORM_WIDTH,
      y,
      width: TRAIN_PLATFORM_WIDTH,
      height: TRAIN_PLATFORM_HEIGHT,
      type: 'train',
      passed: false,
    })
  }

  const coinCount = 4
  for (let c = 0; c < coinCount; c += 1) {
    spawned.push({
      id: state.nextObstacleId++,
      x: startX + 40 + c * Math.floor((totalWidth - 80) / coinCount),
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
    x: startX + totalWidth * 0.52,
    y: y - 54,
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    type: powerType,
    passed: false,
  })

  return spawned
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

  if (state.score >= 520 && random() < 0.1) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - TRAIN_PLATFORM_HEIGHT - 8,
      width: TRAIN_PLATFORM_WIDTH,
      height: TRAIN_PLATFORM_HEIGHT,
      type: 'train',
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
  const spawnBird = canSpawnBird && random() < 0.28

  if (spawnBird) {
    return {
      id: state.nextObstacleId++,
      x,
      y: groundLevel - BIRD_ALTITUDE,
      width: 46,
      height: 28,
      type: 'bird',
      passed: false,
    }
  }

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
