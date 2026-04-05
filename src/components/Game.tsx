import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Dinosaur from './Dinosaur'
import Obstacles from './Obstacle'
import HUD from './HUD'
import { usePhysics } from '../hooks/usePhysics'
import { useGameInput } from '../hooks/useGameInput'
import { DinosaurState, Obstacle, GameConfig } from '../types/game'
import type { DinoColor, MusicOption } from '../App'
import dayBackground from '../assets/background/9.png'
import nightBackground from '../assets/background/7.png'
import themeTrack from '../assets/soundtrack/SonoTWS - Tired Of People Act II - SonoTWS (youtube).mp3'
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
const LIGHTNING_DURATION_MS = 3000
const JUMP_BOOST_DURATION_MS = 4500
const JUMP_BOOST_MULTIPLIER = 1.35
const DUCK_HEIGHT = 50
const TRAMPOLINE_BOOST = 1.12
const COIN_SCORE = 25
const BACKGROUND_TRANSITION_START = 900
const BACKGROUND_TRANSITION_END = 1700
const POWERUP_SIZE = 56

interface GameProps {
  dinosaurColor: DinoColor
  selectedMusic: MusicOption
  onGameOver: (score: number) => void
}

export default function Game({ dinosaurColor, selectedMusic, onGameOver }: GameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<number>()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastTimeRef = useRef<number>(0)
  const spawnTimerRef = useRef<number>(0)
  const nextSpawnDelayRef = useRef<number>(1100)
  const obstacleCounterRef = useRef<number>(0)
  const gameOverRef = useRef(false)
  const jumpBufferRef = useRef(0)
  const coyoteTimeRef = useRef(0)
  const skateTimerRef = useRef(0)
  const skateFlickerEndTimeRef = useRef(0)
  const lightningTimerRef = useRef(0)
  const jumpBoostTimerRef = useRef(0)
  const jumpsUsedRef = useRef(0)

  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const [totalCoins, setTotalCoins] = useState(() => {
    const saved = localStorage.getItem('dinoGameTotalCoins')
    return saved ? parseInt(saved, 10) : 0
  })
  const [highScore] = useState(() => {
    const saved = localStorage.getItem('dinoGameHighScore')
    return saved ? parseInt(saved, 10) : 0
  })
  const [gameSpeed, setGameSpeed] = useState(BASE_CONFIG.initialSpeed)
  const [groundLevel, setGroundLevel] = useState(560)
  const [skateTimeLeftMs, setSkateTimeLeftMs] = useState(0)
  const [skateFlickering, setSkateFlickering] = useState(false)
  const [lightningTimeLeftMs, setLightningTimeLeftMs] = useState(0)
  const [jumpBoostTimeLeftMs, setJumpBoostTimeLeftMs] = useState(0)

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
      isDucking: false,
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
  const coinsRef = useRef(0)
  const totalCoinsRef = useRef(0)
  const speedRef = useRef(BASE_CONFIG.initialSpeed)
  const [gameActive, setGameActive] = useState(true)

  const { updateDinosaurPosition, jump, checkCollision } = usePhysics(gameConfig)

  const getSpawnDelay = useCallback((speed: number) => {
    const min = Math.max(620, 900 - speed * 28)
    const max = Math.max(1180, 1550 - speed * 32)
    return min + Math.random() * (max - min)
  }, [])

  const createFloatingPath = useCallback((): Obstacle[] => {
    const containerWidth = gameContainerRef.current?.clientWidth ?? 1200
    const startX = containerWidth + 20
    const segmentCount = 4 + Math.floor(Math.random() * 2)
    const baseY = gameConfig.groundLevel - 150 - Math.floor(Math.random() * 16)
    const spawned: Obstacle[] = []
    let cursorX = startX

    if (Math.random() < 0.65) {
      spawned.push({
        id: obstacleCounterRef.current++,
        x: startX - 88,
        y: gameConfig.groundLevel - 24,
        width: 60,
        height: 24,
        type: 'trampoline',
        passed: false,
      })
    }

    for (let i = 0; i < segmentCount; i += 1) {
      const width = 120 + Math.floor(Math.random() * 36)
      const y = baseY + Math.floor(Math.random() * 16) - 8

      spawned.push({
        id: obstacleCounterRef.current++,
        x: cursorX,
        y,
        width,
        height: 30,
        type: 'floating-platform',
        passed: false,
      })

      const coinCount = 2
      for (let c = 0; c < coinCount; c += 1) {
        spawned.push({
          id: obstacleCounterRef.current++,
          x: cursorX + 28 + c * Math.floor(width * 0.45),
          y: y - 34,
          width: 18,
          height: 18,
          type: 'coin',
          passed: false,
        })
      }

      cursorX += width + 18 + Math.floor(Math.random() * 16)
    }

    const firstPlatform = spawned.find((item) => item.type === 'floating-platform')
    if (firstPlatform) {
      const powerType = Math.random() < 0.55 ? 'power-lightning' : 'power-jump'
      spawned.push({
        id: obstacleCounterRef.current++,
        x: firstPlatform.x + firstPlatform.width * 0.52,
        y: firstPlatform.y - 54,
        width: POWERUP_SIZE,
        height: POWERUP_SIZE,
        type: powerType,
        passed: false,
      })
    }

    return spawned
  }, [gameConfig.groundLevel])

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

    if (scoreRef.current >= 520 && Math.random() < 0.1) {
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - 150,
        width: 110,
        height: 30,
        type: 'floating-platform',
        passed: false,
      }
    }

    if (scoreRef.current >= 360 && Math.random() < 0.12) {
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - 24,
        width: 56,
        height: 24,
        type: 'trampoline',
        passed: false,
      }
    }

    if (scoreRef.current >= 280 && Math.random() < 0.22) {
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - 72,
        width: 78,
        height: 24,
        type: 'duck-bar',
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
      const jumpPowerMultiplier = jumpBoostTimerRef.current > 0 ? JUMP_BOOST_MULTIPLIER : 1

      if (onGround) {
        const jumped = jump(
          {
            ...dinosaurRef.current,
            isDucking: false,
            height: gameConfig.playerSize,
            y: gameConfig.groundLevel - gameConfig.playerSize,
            velocityY: -(gameConfig.jumpPower * jumpPowerMultiplier),
          },
          false
        )
        dinosaurRef.current = jumped
        jumpsUsedRef.current = 1
        setDinosaur(jumped)
        jumpBufferRef.current = 0
        return
      }

      const maxJumps = jumpBoostTimerRef.current > 0 ? 2 : 1
      if (jumpsUsedRef.current < maxJumps) {
        const doubleJumped = jump(
          {
            ...dinosaurRef.current,
            isDucking: false,
            height: gameConfig.playerSize,
            velocityY: -(gameConfig.jumpPower * jumpPowerMultiplier),
          },
          true
        )
        dinosaurRef.current = doubleJumped
        jumpsUsedRef.current += 1
        setDinosaur(doubleJumped)
        jumpBufferRef.current = 0
      }
    }
  }, [gameActive, gameConfig.groundLevel, gameConfig.playerSize, jump])

  const handleDuckStart = useCallback(() => {
    if (!gameActive || gameOverRef.current) return

    setDinosaur((prev) => {
      const onGround = prev.y + prev.height >= gameConfig.groundLevel - 1
      if (!onGround || prev.isJumping) {
        return prev
      }

      const next = {
        ...prev,
        isDucking: true,
        height: DUCK_HEIGHT,
        y: gameConfig.groundLevel - DUCK_HEIGHT,
      }
      dinosaurRef.current = next
      return next
    })
  }, [gameActive, gameConfig.groundLevel])

  const handleDuckEnd = useCallback(() => {
    if (!gameActive || gameOverRef.current) return

    setDinosaur((prev) => {
      if (!prev.isDucking) return prev

      const next = {
        ...prev,
        isDucking: false,
        height: gameConfig.playerSize,
        y: gameConfig.groundLevel - gameConfig.playerSize,
      }
      dinosaurRef.current = next
      return next
    })
  }, [gameActive, gameConfig.groundLevel, gameConfig.playerSize])

  useGameInput(handleJump, handleDuckStart, handleDuckEnd)

  useEffect(() => {
    const updateGroundLevel = () => {
      const containerHeight = gameContainerRef.current?.clientHeight ?? 700
      // Keep physics ground aligned with the visible top of the floor layer.
      const nextGroundLevel = Math.round(containerHeight * 0.76)
      setGroundLevel(nextGroundLevel)
    }

    updateGroundLevel()
    window.addEventListener('resize', updateGroundLevel)

    return () => {
      window.removeEventListener('resize', updateGroundLevel)
    }
  }, [])

  useEffect(() => {
    totalCoinsRef.current = totalCoins
  }, [totalCoins])

  useEffect(() => {
    dinosaurRef.current = {
      ...dinosaurRef.current,
      y: groundLevel - gameConfig.playerSize,
      velocityY: 0,
      isJumping: false,
      isDucking: false,
      width: gameConfig.playerSize,
      height: gameConfig.playerSize,
    }
    setDinosaur(dinosaurRef.current)
  }, [groundLevel, gameConfig.playerSize])

  useEffect(() => {
    if (!gameActive) return

    gameOverRef.current = false
    setCoins(0)
    coinsRef.current = 0
    setSkateFlickering(false)
    setSkateTimeLeftMs(0)
    setLightningTimeLeftMs(0)
    setJumpBoostTimeLeftMs(0)
    lastTimeRef.current = 0
    spawnTimerRef.current = 0
    skateTimerRef.current = 0
    skateFlickerEndTimeRef.current = 0
    lightningTimerRef.current = 0
    jumpBoostTimerRef.current = 0
    jumpsUsedRef.current = 0
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
      lightningTimerRef.current = Math.max(0, lightningTimerRef.current - deltaMs)
      jumpBoostTimerRef.current = Math.max(0, jumpBoostTimerRef.current - deltaMs)

      speedRef.current = Math.min(gameConfig.maxSpeed, speedRef.current + deltaMs * 0.00075)
      const effectiveSpeed =
        skateTimerRef.current > 0 || lightningTimerRef.current > 0
          ? speedRef.current * SKATE_SPEED_MULTIPLIER
          : speedRef.current

      const previousDino = dinosaurRef.current
      dinosaurRef.current = updateDinosaurPosition(dinosaurRef.current, deltaFactor)

      let onPlatform = false
      for (const platform of obstaclesRef.current) {
        if (platform.type !== 'floating-platform') continue

        const dinoLeft = dinosaurRef.current.x + 6
        const dinoRight = dinosaurRef.current.x + dinosaurRef.current.width - 6
        const prevBottom = previousDino.y + previousDino.height
        const nextBottom = dinosaurRef.current.y + dinosaurRef.current.height
        const platformTop = platform.y
        const overlapsX = dinoRight > platform.x + 6 && dinoLeft < platform.x + platform.width - 6
        const fallingIntoTop = previousDino.velocityY >= 0 && prevBottom <= platformTop + 8 && nextBottom >= platformTop

        if (overlapsX && fallingIntoTop) {
          dinosaurRef.current = {
            ...dinosaurRef.current,
            y: platformTop - dinosaurRef.current.height,
            velocityY: 0,
            isJumping: false,
          }
          onPlatform = true
          jumpsUsedRef.current = 0
          break
        }
      }

      const onGround =
        onPlatform ||
        dinosaurRef.current.y + dinosaurRef.current.height >= gameConfig.groundLevel - 1

      if (onGround) {
        coyoteTimeRef.current = COYOTE_TIME_MS
        jumpsUsedRef.current = 0
      }

      if (dinosaurRef.current.isDucking && !onGround) {
        dinosaurRef.current = {
          ...dinosaurRef.current,
          isDucking: false,
          height: gameConfig.playerSize,
        }
      }

      if (jumpBufferRef.current > 0 && coyoteTimeRef.current > 0) {
        dinosaurRef.current = jump(dinosaurRef.current)
        jumpBufferRef.current = 0
        coyoteTimeRef.current = 0
        jumpsUsedRef.current = 1
      }

      spawnTimerRef.current += deltaMs
      if (spawnTimerRef.current >= nextSpawnDelayRef.current) {
        const shouldSpawnPath =
          scoreRef.current >= 500 &&
          Math.random() < 0.18 &&
          !obstaclesRef.current.some((obs) => obs.type === 'floating-platform')

        obstaclesRef.current = shouldSpawnPath
          ? [...obstaclesRef.current, ...createFloatingPath()]
          : [...obstaclesRef.current, createObstacle()]
        spawnTimerRef.current = 0
        nextSpawnDelayRef.current = shouldSpawnPath
          ? getSpawnDelay(speedRef.current) * 1.25
          : getSpawnDelay(speedRef.current)
      }

      obstaclesRef.current = obstaclesRef.current
        .map((obs: Obstacle) => ({
          ...obs,
          x: obs.x - effectiveSpeed * deltaFactor,
        }))
        .filter((obs: Obstacle) => obs.x + obs.width > -10)
        .flatMap((obs: Obstacle) => {
          if (obs.type === 'coin' && checkCollision(dinosaurRef.current, obs)) {
            scoreRef.current += COIN_SCORE
            coinsRef.current += 1
            totalCoinsRef.current += 1
            localStorage.setItem('dinoGameTotalCoins', String(totalCoinsRef.current))
            return []
          }

          if (obs.type === 'power-lightning' && checkCollision(dinosaurRef.current, obs)) {
            lightningTimerRef.current = LIGHTNING_DURATION_MS
            return []
          }

          if (obs.type === 'power-jump' && checkCollision(dinosaurRef.current, obs)) {
            jumpBoostTimerRef.current = JUMP_BOOST_DURATION_MS
            return []
          }

          if (obs.type === 'skate' && checkCollision(dinosaurRef.current, obs)) {
            skateTimerRef.current = SKATE_DURATION_MS
            return []
          }

          if (obs.type === 'trampoline' && checkCollision(dinosaurRef.current, obs)) {
            const nextPlatform = obstaclesRef.current
              .filter(
                (candidate) =>
                  candidate.type === 'floating-platform' &&
                  candidate.x + candidate.width > dinosaurRef.current.x
              )
              .sort((a, b) => a.x - b.x)[0]
            const jumpBoostMultiplier = jumpBoostTimerRef.current > 0 ? JUMP_BOOST_MULTIPLIER : 1
            const travelDistance = nextPlatform ? Math.max(0, nextPlatform.x - dinosaurRef.current.x) : 0
            const travelFrames = travelDistance > 0 ? travelDistance / Math.max(1, effectiveSpeed) : 0
            const trampolineMultiplier = nextPlatform
              ? Math.min(TRAMPOLINE_BOOST, Math.max(1, 1 + travelFrames / 220))
              : 1.04
            dinosaurRef.current = {
              ...dinosaurRef.current,
              isDucking: false,
              height: gameConfig.playerSize,
              velocityY: -gameConfig.jumpPower * trampolineMultiplier * jumpBoostMultiplier,
              isJumping: true,
            }
            jumpsUsedRef.current = 1
            return []
          }

          if (!obs.passed && obs.x + obs.width < dinosaurRef.current.x) {
            if (
              obs.type !== 'skate' &&
              obs.type !== 'trampoline' &&
              obs.type !== 'floating-platform' &&
              obs.type !== 'coin' &&
              obs.type !== 'power-lightning' &&
              obs.type !== 'power-jump'
            ) {
              scoreRef.current += 100
            }
            return { ...obs, passed: true }
          }
          return obs
        })

      let skateShieldHit = false
      if (skateTimerRef.current > 0) {
        skateShieldHit = obstaclesRef.current.some(
          (obs: Obstacle) =>
            obs.type !== 'skate' &&
            obs.type !== 'coin' &&
            obs.type !== 'power-lightning' &&
            obs.type !== 'power-jump' &&
            obs.type !== 'floating-platform' &&
            obs.type !== 'trampoline' &&
            checkCollision(dinosaurRef.current, obs)
        )

        if (skateShieldHit) {
          skateTimerRef.current = 0
          skateFlickerEndTimeRef.current = timestamp + 420
          dinosaurRef.current = {
            ...dinosaurRef.current,
            y: gameConfig.groundLevel - gameConfig.playerSize,
            velocityY: 0,
            isJumping: false,
            isDucking: false,
            height: gameConfig.playerSize,
          }
        }
      }

      const hasCollision = !skateShieldHit && obstaclesRef.current.some(
        (obs: Obstacle) =>
          lightningTimerRef.current <= 0 &&
          obs.type !== 'skate' &&
          obs.type !== 'coin' &&
          obs.type !== 'power-lightning' &&
          obs.type !== 'power-jump' &&
          obs.type !== 'floating-platform' &&
          obs.type !== 'trampoline' &&
          checkCollision(dinosaurRef.current, obs)
      )

      if (hasCollision) {
        gameOverRef.current = true
        setGameActive(false)
        onGameOver(scoreRef.current)
        return
      }

      const shouldFlicker = skateFlickerEndTimeRef.current > timestamp
      if (shouldFlicker !== skateFlickering) {
        setSkateFlickering(shouldFlicker)
      }

      setDinosaur(dinosaurRef.current)
      setObstacles(obstaclesRef.current)
      setScore(scoreRef.current)
      setCoins(coinsRef.current)
      setTotalCoins(totalCoinsRef.current)
      setGameSpeed(effectiveSpeed)
      setSkateTimeLeftMs(skateTimerRef.current)
      setLightningTimeLeftMs(lightningTimerRef.current)
      setJumpBoostTimeLeftMs(jumpBoostTimerRef.current)

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
    createFloatingPath,
    gameActive,
    gameConfig.groundLevel,
    gameConfig.maxSpeed,
    gameConfig.playerSize,
    getSpawnDelay,
    jump,
    onGameOver,
    updateDinosaurPosition,
  ])

  useEffect(() => {
    obstaclesRef.current = obstacles
  }, [obstacles])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }

    if (selectedMusic === 'none') {
      return
    }

    const audio = new Audio(themeTrack)
    audio.loop = true
    audio.volume = 0.45
    audioRef.current = audio
    void audio.play().catch(() => {
      // Browser can block autoplay until first interaction.
    })

    return () => {
      audio.pause()
      audio.currentTime = 0
      if (audioRef.current === audio) {
        audioRef.current = null
      }
    }
  }, [selectedMusic])

  const speedPercentage = (gameSpeed / gameConfig.maxSpeed) * 100
  const backgroundBlend = Math.min(
    1,
    Math.max(0, (score - BACKGROUND_TRANSITION_START) / (BACKGROUND_TRANSITION_END - BACKGROUND_TRANSITION_START))
  )
  const isNight = backgroundBlend > 0.5

  return (
    <div className={`game-wrapper ${isNight ? 'is-night' : ''}`}>
      <div
        ref={gameContainerRef}
        className={`game-container ${isNight ? 'is-night' : ''}`}
      >
        <div className="game-background">
          <div
            className="background-image-layer day"
            style={{ backgroundImage: `url(${dayBackground})`, opacity: `${1 - backgroundBlend}` }}
          />
          <div
            className="background-image-layer night"
            style={{ backgroundImage: `url(${nightBackground})`, opacity: `${backgroundBlend}` }}
          />
          <div className="bg-layer bg-clouds" />
          <div className="bg-layer bg-ground" />
        </div>

        <Dinosaur state={dinosaur} color={dinosaurColor} hasSkate={skateTimeLeftMs > 0} skateFlickering={skateFlickering} />
        <Obstacles obstacles={obstacles} />

        <HUD
          score={score}
          coins={coins}
          totalCoins={totalCoins}
          highScore={highScore}
          gameSpeed={speedPercentage}
          isNight={isNight}
          skateTimeLeftMs={skateTimeLeftMs}
          lightningTimeLeftMs={lightningTimeLeftMs}
          jumpBoostTimeLeftMs={jumpBoostTimeLeftMs}
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
