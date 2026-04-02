export interface Obstacle {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: 'cactus' | 'bird' | 'skate'
  passed: boolean
}

export interface DinosaurState {
  x: number
  y: number
  velocityY: number
  isJumping: boolean
  isDucking?: boolean
  width: number
  height: number
}

export interface GameConfig {
  playerSize: number
  groundLevel: number
  jumpPower: number
  gravity: number
  obstacleWidth: number
  obstacleHeight: number
  initialSpeed: number
  maxSpeed: number
  scrollSpeed: number
}
