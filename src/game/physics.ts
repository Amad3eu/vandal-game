import type { DinosaurState, GameConfig, Obstacle } from '../types/game'
import { ROOF_STEP_TOLERANCE, WALL_CONTACT_INSET_X } from './config'

const PLAYER_HITBOX_INSET_X = 20
const PLAYER_HITBOX_INSET_BOTTOM = 6

/** Applies gravity for one step and lands the player on the ground. */
export function updatePlayerPosition(
  dino: DinosaurState,
  config: GameConfig,
  deltaFactor = 1,
  gravityMultiplier = 1
): DinosaurState {
  let velocityY = dino.velocityY

  // Apply dynamic gravity: softer ascent, faster fall.
  const gravityScale = velocityY < 0 ? config.riseGravityScale : config.fallGravityScale
  velocityY += config.gravity * gravityScale * gravityMultiplier * deltaFactor

  // Update position
  let newY = dino.y + velocityY * deltaFactor

  // Check if touching ground
  if (newY + dino.height >= config.groundLevel) {
    newY = config.groundLevel - dino.height
    velocityY = 0
    return {
      ...dino,
      y: newY,
      velocityY,
      isJumping: false,
    }
  }

  return {
    ...dino,
    y: newY,
    velocityY,
  }
}

export function checkCollision(dino: DinosaurState, obstacle: Obstacle): boolean {
  // Hitboxes are smaller than the visuals so near misses feel fair: the player's box
  // covers the body, not the empty space around arms and legs.
  const isDucking = Boolean(dino.isDucking)
  const dinoInsetTop = isDucking ? 8 : 10
  const dinoLeft = dino.x + PLAYER_HITBOX_INSET_X
  const dinoTop = dino.y + dinoInsetTop
  const dinoRight = dino.x + dino.width - PLAYER_HITBOX_INSET_X
  const dinoBottom = dino.y + dino.height - PLAYER_HITBOX_INSET_BOTTOM

  const obstacleInsetX = obstacle.type === 'bird'
    ? 8
    : obstacle.type === 'spray'
    ? 14
    : obstacle.type === 'skate'
    ? 10
    : obstacle.type === 'power-lightning' || obstacle.type === 'power-jump'
    ? 4
    : obstacle.type === 'coin'
    ? 5
    : obstacle.type === 'floating-platform'
    ? 2
    : obstacle.type === 'trampoline'
    ? 6
    : obstacle.type === 'duck-bar'
    ? 4
    : 4
  const obstacleInsetY = obstacle.type === 'bird'
    ? 6
    : obstacle.type === 'spray'
    ? 14
    : obstacle.type === 'skate'
    ? 8
    : obstacle.type === 'power-lightning' || obstacle.type === 'power-jump'
    ? 4
    : obstacle.type === 'coin'
    ? 5
    : obstacle.type === 'floating-platform'
    ? 2
    : obstacle.type === 'trampoline'
    ? 6
    : obstacle.type === 'duck-bar'
    ? 2
    : 2
  const obstacleLeft = obstacle.x + obstacleInsetX
  const obstacleTop = obstacle.y + obstacleInsetY
  const obstacleRight = obstacle.x + obstacle.width - obstacleInsetX
  const obstacleBottom = obstacle.y + obstacle.height - obstacleInsetY

  return !(
    dinoLeft > obstacleRight ||
    dinoRight < obstacleLeft ||
    dinoTop > obstacleBottom ||
    dinoBottom < obstacleTop
  )
}

export function approach(value: number, target: number, step: number) {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step)
}

/**
 * Free mode: buildings are solid walls. Clamps a horizontal move so the player stops at a
 * building face, and reports the side that was hit (1 = wall on the right, -1 = on the left).
 */
export function moveAgainstBuildings(dino: DinosaurState, dx: number, obstacles: Obstacle[]) {
  let move = dx
  let wallContact: -1 | 0 | 1 = 0
  const left = dino.x + WALL_CONTACT_INSET_X
  const right = dino.x + dino.width - WALL_CONTACT_INSET_X
  const bottom = dino.y + dino.height

  for (const building of obstacles) {
    if (building.type !== 'building') continue
    if (bottom <= building.y + ROOF_STEP_TOLERANCE) continue // on (or above) the roof

    const wallLeft = building.x + 4
    const wallRight = building.x + building.width - 4
    if (right <= wallLeft + 1) {
      if (move > 0 && right + move > wallLeft) {
        move = wallLeft - right
        wallContact = 1
      }
    } else if (left >= wallRight - 1) {
      if (move < 0 && left + move < wallRight) {
        move = wallRight - left
        wallContact = -1
      }
    } else {
      // Already overlapping (e.g. after a resize): push out through the nearest face.
      const pushLeft = wallLeft - right
      const pushRight = wallRight - left
      move = -pushLeft < pushRight ? pushLeft : pushRight
    }
  }

  return { dx: move, wallContact }
}
