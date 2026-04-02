import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Dinosaur from './Dinosaur'
import Obstacles from './Obstacle'
import HUD from './HUD'
import { usePhysics } from '../hooks/usePhysics'
import { useGameInput } from '../hooks/useGameInput'
import { DinosaurState, Obstacle, GameConfig } from '../types/game'
import type { DinoColor } from '../App'
import './Game.css'

const BASE_CONFIG: Omit<GameConfig, 'groundLevel'> = {
  playerSize: 64,
  jumpPower: 17,
  gravity: 0.9,
  obstacleWidth: 36,
  obstacleHeight: 62,
  initialSpeed: 5.8,
  maxSpeed: 11.5,
  scrollSpeed: 1,
}

const FRAME_TIME = 1000 / 60
const JUMP_BUFFER_MS = 130
const COYOTE_TIME_MS = 90
const SKATE_DURATION_MS = 15000
const SKATE_SPEED_MULTIPLIER = 1.28

interface GameProps {
  dinosaurColor: DinoColor
  onGameOver: (score: number) => void
}

export default function Game({ dinosaurColor, onGameOver }: GameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)
  const spawnTimerRef = useRef<number>(0)
  const nextSpawnDelayRef = useRef<number>(1100)
  const obstacleCounterRef = useRef<number>(0)
  const gameOverRef = useRef(false)
  const jumpBufferRef = useRef(0)
  const coyoteTimeRef = useRef(0)
  const skateTimerRef = useRef(0)

  const [score, setScore] = useState(0)
  const [highScore] = useState(() => {
    const saved = localStorage.getItem('dinoGameHighScore')
    return saved ? parseInt(saved, 10) : 0
  })
  const [gameSpeed, setGameSpeed] = useState(BASE_CONFIG.initialSpeed)
  const [groundLevel, setGroundLevel] = useState(560)
  const [skateTimeLeftMs, setSkateTimeLeftMs] = useState(0)

  const gameConfig: GameConfig = useMemo(
    () => ({
      ...BASE_CONFIG,
      groundLevel,
    }),
    [groundLevel]
  )

  const initialDino = useMemo<DinosaurState>(
    () => ({
      x: 72,
      y: gameConfig.groundLevel - gameConfig.playerSize,
      velocityY: 0,
      isJumping: false,
      width: gameConfig.playerSize,
      height: gameConfig.playerSize,
    }),
    [gameConfig.groundLevel, gameConfig.playerSize]
  )

  const [dinosaur, setDinosaur] = useState<DinosaurState>(initialDino)
  const dinosaurRef = useRef<DinosaurState>(initialDino)

  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const obstaclesRef = useRef<Obstacle[]>([])
  const scoreRef = useRef(0)
  const speedRef = useRef(BASE_CONFIG.initialSpeed)
  const [gameActive, setGameActive] = useState(true)

  const { updateDinosaurPosition, jump, checkCollision } = usePhysics(gameConfig)

  const getSpawnDelay = useCallback((speed: number) => {
    const min = Math.max(620, 900 - speed * 28)
    const max = Math.max(1180, 1550 - speed * 32)
    return min + Math.random() * (max - min)
  }, [])

  const createObstacle = useCallback((): Obstacle => {
    const containerWidth = gameContainerRef.current?.clientWidth ?? 1200

    const canSpawnSkate =
      scoreRef.current >= 600 &&
      skateTimerRef.current <= 0 &&
      !obstaclesRef.current.some((obs: Obstacle) => obs.type === 'skate')

    if (canSpawnSkate && Math.random() < 0.12) {
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - 22,
        width: 68,
        height: 22,
        type: 'skate',
        passed: false,
      }
    }

    const canSpawnBird = scoreRef.current >= 400
    const spawnBird = canSpawnBird && Math.random() < 0.28

    if (spawnBird) {
      const birdHeight = 28
      const birdWidth = 46
      const birdY = gameConfig.groundLevel - 96
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: birdY,
        width: birdWidth,
        height: birdHeight,
        type: 'bird',
        passed: false,
      }
    }

    const cactusHeight = gameConfig.obstacleHeight + Math.floor(Math.random() * 26) - 8
    const cactusWidth = gameConfig.obstacleWidth + Math.floor(Math.random() * 16) - 4

    return {
      id: obstacleCounterRef.current++,
      x: containerWidth + 20,
      y: gameConfig.groundLevel - cactusHeight,
      width: cactusWidth,
      height: cactusHeight,
      type: 'cactus',
      passed: false,
    }
  }, [gameConfig.groundLevel, gameConfig.obstacleHeight, gameConfig.obstacleWidth])

  const handleJump = useCallback(() => {
    if (gameActive && !gameOverRef.current) {
      jumpBufferRef.current = JUMP_BUFFER_MS

      const onGround =
        dinosaurRef.current.y + dinosaurRef.current.height >= gameConfig.groundLevel - 1
      if (onGround) {
        const jumped = jump(dinosaurRef.current)
        dinosaurRef.current = jumped
        setDinosaur(jumped)
        jumpBufferRef.current = 0
      }
    }
  }, [gameActive, gameConfig.groundLevel, jump])

  useGameInput(handleJump)

  useEffect(() => {
    const updateGroundLevel = () => {
      const containerHeight = gameContainerRef.current?.clientHeight ?? 700
      const nextGroundLevel = Math.round(containerHeight * 0.8)
      setGroundLevel(nextGroundLevel)
    }

    updateGroundLevel()
    window.addEventListener('resize', updateGroundLevel)

    return () => {
      window.removeEventListener('resize', updateGroundLevel)
    }
  }, [])

  useEffect(() => {
    dinosaurRef.current = {
      ...dinosaurRef.current,
      y: groundLevel - gameConfig.playerSize,
      velocityY: 0,
      isJumping: false,
      width: gameConfig.playerSize,
      height: gameConfig.playerSize,
    }
    setDinosaur(dinosaurRef.current)
  }, [groundLevel, gameConfig.playerSize])

  useEffect(() => {
    if (!gameActive) return

    gameOverRef.current = false
    lastTimeRef.current = 0
    spawnTimerRef.current = 0
    skateTimerRef.current = 0
    nextSpawnDelayRef.current = getSpawnDelay(speedRef.current)

    const gameLoop = (timestamp: number) => {
      if (gameOverRef.current) return

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp
      }

      const deltaMs = Math.min(32, timestamp - lastTimeRef.current)
      const deltaFactor = deltaMs / FRAME_TIME
      lastTimeRef.current = timestamp

      jumpBufferRef.current = Math.max(0, jumpBufferRef.current - deltaMs)
      coyoteTimeRef.current = Math.max(0, coyoteTimeRef.current - deltaMs)
      skateTimerRef.current = Math.max(0, skateTimerRef.current - deltaMs)

      speedRef.current = Math.min(
        gameConfig.maxSpeed,
        speedRef.current + deltaMs * 0.00075
      )
      const effectiveSpeed =
        skateTimerRef.current > 0
          ? speedRef.current * SKATE_SPEED_MULTIPLIER
          : speedRef.current

      dinosaurRef.current = updateDinosaurPosition(dinosaurRef.current, deltaFactor)

      const onGround =
        dinosaurRef.current.y + dinosaurRef.current.height >= gameConfig.groundLevel - 1
      if (onGround) {
        coyoteTimeRef.current = COYOTE_TIME_MS
      }

      if (jumpBufferRef.current > 0 && coyoteTimeRef.current > 0) {
        dinosaurRef.current = jump(dinosaurRef.current)
        jumpBufferRef.current = 0
        coyoteTimeRef.current = 0
      }

      spawnTimerRef.current += deltaMs
      if (spawnTimerRef.current >= nextSpawnDelayRef.current) {
        obstaclesRef.current = [...obstaclesRef.current, createObstacle()]
        spawnTimerRef.current = 0
        nextSpawnDelayRef.current = getSpawnDelay(speedRef.current)
      }

      obstaclesRef.current = obstaclesRef.current
        .map((obs: Obstacle) => ({
          ...obs,
          x: obs.x - effectiveSpeed * deltaFactor,
        }))
        .filter((obs: Obstacle) => obs.x + obs.width > -10)
        .flatMap((obs: Obstacle) => {
          if (obs.type === 'skate' && checkCollision(dinosaurRef.current, obs)) {
            skateTimerRef.current = SKATE_DURATION_MS
            return []
          }

          if (!obs.passed && obs.x + obs.width < dinosaurRef.current.x) {
            if (obs.type !== 'skate') {
              scoreRef.current += 100
            }
            return { ...obs, passed: true }
          }
          return obs
        })

      const hasCollision = obstaclesRef.current.some(
        (obs: Obstacle) => obs.type !== 'skate' && checkCollision(dinosaurRef.current, obs)
      )

      if (hasCollision) {
        gameOverRef.current = true
        setGameActive(false)
        onGameOver(scoreRef.current)
        return
      }

      setDinosaur(dinosaurRef.current)
      setObstacles(obstaclesRef.current)
      setScore(scoreRef.current)
      setGameSpeed(effectiveSpeed)
      setSkateTimeLeftMs(skateTimerRef.current)

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [
    checkCollision,
    createObstacle,
    gameActive,
    gameConfig.maxSpeed,
    getSpawnDelay,
    onGameOver,
    updateDinosaurPosition,
  ])

  useEffect(() => {
    obstaclesRef.current = obstacles
  }, [obstacles])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  const speedPercentage = (gameSpeed / gameConfig.maxSpeed) * 100

  return (
    <div className="game-wrapper">
      <div
        ref={gameContainerRef}
        className="game-container"
      >
        <div className="game-background">
          <div className="bg-layer bg-clouds" />
          <div className="bg-layer bg-ground" />
        </div>

        <Dinosaur state={dinosaur} color={dinosaurColor} hasSkate={skateTimeLeftMs > 0} />
        <Obstacles obstacles={obstacles} />

        <HUD
          score={score}
          highScore={highScore}
          gameSpeed={speedPercentage}
          skateTimeLeftMs={skateTimeLeftMs}
        />

        {!gameActive && (
          <div className="game-over-overlay">
            <div className="game-over-message">
              <h2>Fim de Jogo!</h2>
              <p>Clique para voltar ao menu principal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
