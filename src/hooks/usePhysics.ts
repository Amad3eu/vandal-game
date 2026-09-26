import { useCallback } from 'react'
import { DinosaurState, GameConfig, Obstacle } from '../types/game'

const PLAYER_HITBOX_INSET_X = 20
const PLAYER_HITBOX_INSET_BOTTOM = 6

export function usePhysics(config: GameConfig) {
  const updateDinosaurPosition = useCallback(
    (dino: DinosaurState, deltaFactor = 1, gravityMultiplier = 1): DinosaurState => {
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
    },
    [config]
  )

  const jump = useCallback(
    (dino: DinosaurState, force = false): DinosaurState => {
      if (dino.isJumping && !force) return dino

      return {
        ...dino,
        velocityY: -config.jumpPower,
        isJumping: true,
      }
    },
    [config]
  )

  const checkCollision = useCallback((dino: DinosaurState, obstacle: Obstacle): boolean => {
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
  }, [])

  return {
    updateDinosaurPosition,
    jump,
    checkCollision,
  }
}
