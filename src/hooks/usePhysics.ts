import { useCallback } from 'react'
import { DinosaurState, GameConfig, Obstacle } from '../types/game'

export function usePhysics(config: GameConfig) {
  const updateDinosaurPosition = useCallback(
    (dino: DinosaurState, deltaFactor = 1): DinosaurState => {
      let velocityY = dino.velocityY

      // Apply gravity
      velocityY += config.gravity * deltaFactor

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
    // Use slightly smaller hitboxes than visuals to make the game feel fair.
    const isDucking = Boolean(dino.isDucking)
    const dinoInsetX = isDucking ? 8 : 6
    const dinoInsetY = isDucking ? 8 : 4
    const dinoLeft = dino.x + dinoInsetX
    const dinoTop = dino.y + dinoInsetY
    const dinoRight = dino.x + dino.width - dinoInsetX
    const dinoBottom = dino.y + dino.height - dinoInsetY

    const obstacleInsetX = obstacle.type === 'bird'
      ? 8
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
