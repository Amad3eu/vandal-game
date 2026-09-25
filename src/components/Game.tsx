import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Dinosaur from './Dinosaur'
import Obstacles from './Obstacle'
import HUD from './HUD'
import GraffitiDialog from './GraffitiDialog'
import DrawingCanvas from './DrawingCanvas'
import DrawingConfirmation from './DrawingConfirmation'
import Blackbook from './Blackbook'
import { usePhysics } from '../hooks/usePhysics'
import { useGameInput } from '../hooks/useGameInput'
import { ARTIST_SIGNATURES } from '../data/artistSignatures'
import { DinosaurState, Obstacle, GameConfig, GraffitiArtist, GraffitiArt } from '../types/game'
import type { MusicOption } from '../App'
import dayBackground from '../assets/background/9.png'
import nightBackground from '../assets/background/7.png'
import themeTrack from '../assets/soundtrack/SonoTWS - Tired Of People Act II - SonoTWS (youtube).mp3'
import './Game.css'

const BASE_CONFIG: Omit<GameConfig, 'groundLevel'> = {
  playerSize: 100,
  jumpPower: 14,
  gravity: 0.96,
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
const DUCK_HEIGHT = 80
const TRAMPOLINE_BOOST = 1.12
const COIN_SCORE = 25
const GRAFFITI_SIGNATURE_SCORE = 150
const BACKGROUND_TRANSITION_START = 900
const BACKGROUND_TRANSITION_END = 1700
const POWERUP_SIZE = 84
const TRAIN_PLATFORM_WIDTH = 240
const TRAIN_PLATFORM_HEIGHT = 80

// --- Phase system (Fase 1 Rua / Fase 2 Metrô / Fase 3 Telhados) ---
const PHASE_2_SCORE = 800
const PHASE_3_SCORE = 2000
const PHASE_SPEED_BONUS = [0, 0.9, 2.4] // extra top speed per phase index

// --- Variable jump height (Mario) ---
const JUMP_CUT_MULTIPLIER = 0.42 // velocity kept when the jump button is released mid-rise

// --- Dash / esquiva (Hollow Knight / Subway roll) ---
const DASH_DURATION_MS = 190
const DASH_COOLDOWN_MS = 780
const DASH_LUNGE = 96 // forward pixels of the lunge
const DASH_LUNGE_DECAY = 0.8

// --- Grind combo (Jet Set Radio) ---
const GRIND_TICK_MS = 260
const GRIND_TICK_SCORE = 12

// --- Wall-jump / verticality (Hollow Knight) ---
const WALL_CLING_SLIDE = 1.1 // gentle downward slide while gripping a wall
const WALL_JUMP_POWER_MULT = 1.16
const WALL_CLING_MAX_MS = 520
const BASE_X = 72
const BUILDING_WIDTH = 78

function getPhase(score: number): 1 | 2 | 3 {
  if (score >= PHASE_3_SCORE) return 3
  if (score >= PHASE_2_SCORE) return 2
  return 1
}

interface GameProps {
  selectedMusic: MusicOption
  onGameOver: (score: number) => void
}

export default function Game({ selectedMusic, onGameOver }: GameProps) {
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
  const dashTimerRef = useRef(0)
  const dashCooldownRef = useRef(0)
  const dashLungeRef = useRef(0)
  const grindTimerRef = useRef(0)
  const grindComboRef = useRef(0)
  const wallClingRef = useRef(false)
  const wallClingTimerRef = useRef(0)
  const phaseRef = useRef<1 | 2 | 3>(1)

  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const [totalCoins, setTotalCoins] = useState(() => {
    const saved = localStorage.getItem('dinoGameTotalCoins')
    return saved ? parseInt(saved, 10) : 0
  })
  const [signatures, setSignatures] = useState<GraffitiArtist[]>(() => {
    const saved = localStorage.getItem('dinoGameSignatures')
    return saved ? JSON.parse(saved) : []
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
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [dashActive, setDashActive] = useState(false)
  const [dashCooldownMs, setDashCooldownMs] = useState(0)
  const [grindCombo, setGrindCombo] = useState(0)
  const [wallClinging, setWallClinging] = useState(false)

  // Graffiti interaction states
  const [blackbook, setBlackbook] = useState<GraffitiArt[]>(() => {
    const saved = localStorage.getItem('dinoGameBlackbook')
    return saved ? JSON.parse(saved) : []
  })
  const [currentArtist, setCurrentArtist] = useState<GraffitiArtist | null>(null)
  const [interactionStage, setInteractionStage] = useState<
    'dialog' | 'drawing' | 'confirmation' | 'signature-choice' | 'none'
  >('none')
  const [drawnImage, setDrawnImage] = useState<string | null>(null)
  const [drawingType, setDrawingType] = useState<'graffiti' | 'signature'>('graffiti')
  const [showBlackbook, setShowBlackbook] = useState(false)
  const blackbookRef = useRef<GraffitiArt[]>([])
  const artistEncounterRef = useRef<string | null>(null)

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
  const signaturesRef = useRef<GraffitiArtist[]>([])
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
    const y = gameConfig.groundLevel - TRAIN_PLATFORM_HEIGHT - 8
    const trainCount = 2 + Math.floor(Math.random() * 3) // 2, 3 ou 4 trens lado a lado
    const totalWidth = TRAIN_PLATFORM_WIDTH * trainCount
    const spawned: Obstacle[] = []

    for (let i = 0; i < trainCount; i += 1) {
      spawned.push({
        id: obstacleCounterRef.current++,
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
        id: obstacleCounterRef.current++,
        x: startX + 40 + c * Math.floor((totalWidth - 80) / coinCount),
        y: y - 34,
        width: 18,
        height: 18,
        type: 'coin',
        passed: false,
      })
    }

    const powerType = Math.random() < 0.55 ? 'power-lightning' : 'power-jump'
    spawned.push({
      id: obstacleCounterRef.current++,
      x: startX + totalWidth * 0.52,
      y: y - 54,
      width: POWERUP_SIZE,
      height: POWERUP_SIZE,
      type: powerType,
      passed: false,
    })

    return spawned
  }, [gameConfig.groundLevel])

  const createObstacle = useCallback((): Obstacle => {
    const containerWidth = gameContainerRef.current?.clientWidth ?? 1200

    // Fase 3 (Telhados): prédios altos que exigem wall-jump para escalar.
    if (phaseRef.current === 3 && Math.random() < 0.26) {
      const height = 132 + Math.floor(Math.random() * 84) // 132–216px: os mais altos exigem parede
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - height - 8,
        width: BUILDING_WIDTH,
        height,
        type: 'building',
        passed: false,
      }
    }

    // Spawn grafiteiros com base no score (após certo ponto)
    const canSpawnGraffitiArtist = scoreRef.current >= 1000
    if (canSpawnGraffitiArtist && Math.random() < 0.08) {
      const artists: GraffitiArtist[] = ['remo', 'pixo', 'nina']
      const artist = artists[Math.floor(Math.random() * artists.length)]
      
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - 80 - 8,
        width: 80,
        height: 80,
        type: 'graffiti-artist',
        graffitiArtist: artist,
        passed: false,
      }
    }

    const canSpawnSpray = scoreRef.current >= 600 && !obstaclesRef.current.some((obs: Obstacle) => obs.type === 'spray')

    if (canSpawnSpray && Math.random() < 0.12) {
      const size = 80
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - size - 8,
        width: size,
        height: size,
        type: 'spray',
        passed: false,
      }
    }

    if (scoreRef.current >= 520 && Math.random() < 0.1) {
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - TRAIN_PLATFORM_HEIGHT - 8,
        width: TRAIN_PLATFORM_WIDTH,
        height: TRAIN_PLATFORM_HEIGHT,
        type: 'train',
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
      const size = 80
      return {
        id: obstacleCounterRef.current++,
        x: containerWidth + 20,
        y: gameConfig.groundLevel - size - 8,
        width: size,
        height: size,
        type: 'spray',
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

    const size = 80

    return {
      id: obstacleCounterRef.current++,
      x: containerWidth + 20,
      y: gameConfig.groundLevel - size - 8,
      width: size,
      height: size,
      type: 'spray',
      passed: false,
    }
  }, [gameConfig.groundLevel, gameConfig.obstacleHeight, gameConfig.obstacleWidth])

  const handleJump = useCallback(() => {
    if (gameActive && !gameOverRef.current) {
      jumpBufferRef.current = JUMP_BUFFER_MS

      const onGround =
        dinosaurRef.current.y + dinosaurRef.current.height >= gameConfig.groundLevel - 1
      const jumpPowerMultiplier = jumpBoostTimerRef.current > 0 ? JUMP_BOOST_MULTIPLIER : 1

      // Wall-jump: launch off a wall we're currently gripping (Hollow Knight).
      if (wallClingRef.current) {
        const wallJumped = {
          ...dinosaurRef.current,
          isDucking: false,
          isWallClinging: false,
          height: gameConfig.playerSize,
          velocityY: -(gameConfig.jumpPower * WALL_JUMP_POWER_MULT * jumpPowerMultiplier),
          isJumping: true,
        }
        dinosaurRef.current = wallJumped
        wallClingRef.current = false
        wallClingTimerRef.current = 0
        dashLungeRef.current = Math.max(dashLungeRef.current, 74) // hop forward, over the ledge
        jumpsUsedRef.current = 1
        jumpBufferRef.current = 0
        setDinosaur(wallJumped)
        return
      }

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
      if (!onGround || prev.isJumping || prev.isDucking) {
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

  // Variable jump height: releasing the button early clips an upward jump short (Mario).
  const handleJumpEnd = useCallback(() => {
    if (!gameActive || gameOverRef.current) return
    if (dinosaurRef.current.velocityY < 0 && !wallClingRef.current) {
      const clipped = {
        ...dinosaurRef.current,
        velocityY: dinosaurRef.current.velocityY * JUMP_CUT_MULTIPLIER,
      }
      dinosaurRef.current = clipped
      setDinosaur(clipped)
    }
  }, [gameActive])

  // Dash / esquiva: brief forward lunge with i-frames and a cooldown (Hollow Knight / Subway roll).
  const handleDash = useCallback(() => {
    if (!gameActive || gameOverRef.current) return
    if (dashCooldownRef.current > 0 || dashTimerRef.current > 0) return
    dashTimerRef.current = DASH_DURATION_MS
    dashCooldownRef.current = DASH_COOLDOWN_MS
    dashLungeRef.current = DASH_LUNGE
    const dashing = {
      ...dinosaurRef.current,
      isDashing: true,
      velocityY: 0, // brief air-hover, both on ground and mid-air
    }
    dinosaurRef.current = dashing
    setDinosaur(dashing)
  }, [gameActive])

  useGameInput(handleJump, handleDuckStart, handleDuckEnd, handleJumpEnd, handleDash)

  const handleAcceptArtist = useCallback(() => {
    if (!currentArtist) return
    // First, add artist signature to blackbook
    const artistSig: GraffitiArt = {
      id: `${currentArtist}-sig-${Date.now()}`,
      artist: currentArtist,
      type: 'artist-signature',
      imageData: ARTIST_SIGNATURES[currentArtist],
      timestamp: Date.now(),
    }
    blackbookRef.current = [...blackbookRef.current, artistSig]
    setBlackbook([...blackbookRef.current])

    // Ask if player wants to draw signature for the artist
    setInteractionStage('signature-choice')
  }, [currentArtist])

  const handleRejectArtist = useCallback(() => {
    setInteractionStage('none')
    setCurrentArtist(null)
    artistEncounterRef.current = null
    setGameActive(true)
  }, [])

  const handleDrawingDone = useCallback((imageData: string) => {
    setDrawnImage(imageData)
    setInteractionStage('confirmation')
  }, [])

  const handleConfirmArt = useCallback(() => {
    if (!currentArtist || !drawnImage) return

    // Add art to blackbook with appropriate type
    const newArt: GraffitiArt = {
      id: `${currentArtist}-${drawingType}-${Date.now()}`,
      artist: currentArtist,
      type: drawingType === 'graffiti' ? 'artist-signature' : 'my-signature',
      imageData: drawnImage,
      timestamp: Date.now(),
    }

    const updatedBlackbook = [...blackbookRef.current, newArt]
    setBlackbook(updatedBlackbook)

    // Add signature and score (only once per artist)
    if (!signaturesRef.current.includes(currentArtist)) {
      scoreRef.current += GRAFFITI_SIGNATURE_SCORE
      signaturesRef.current = [...signaturesRef.current, currentArtist]
      setSignatures([...signaturesRef.current])
      localStorage.setItem('dinoGameSignatures', JSON.stringify(signaturesRef.current))
    }

    // Reset interaction state
    setInteractionStage('none')
    setCurrentArtist(null)
    setDrawnImage(null)
    artistEncounterRef.current = null
    setGameActive(true)
  }, [currentArtist, drawnImage])

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
    signaturesRef.current = signatures
  }, [signatures])

  useEffect(() => {
    blackbookRef.current = blackbook
    localStorage.setItem('dinoGameBlackbook', JSON.stringify(blackbook))
  }, [blackbook])

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
    setSignatures([])
    signaturesRef.current = []
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
    dashTimerRef.current = 0
    dashCooldownRef.current = 0
    dashLungeRef.current = 0
    grindTimerRef.current = 0
    grindComboRef.current = 0
    wallClingRef.current = false
    wallClingTimerRef.current = 0
    phaseRef.current = 1
    setPhase(1)
    setDashActive(false)
    setDashCooldownMs(0)
    setGrindCombo(0)
    setWallClinging(false)
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
      dashTimerRef.current = Math.max(0, dashTimerRef.current - deltaMs)
      dashCooldownRef.current = Math.max(0, dashCooldownRef.current - deltaMs)

      // Phase progression (score-driven) lifts the speed ceiling each phase.
      const currentPhase = getPhase(scoreRef.current)
      if (currentPhase !== phaseRef.current) {
        phaseRef.current = currentPhase
        setPhase(currentPhase)
      }
      const phaseMaxSpeed = gameConfig.maxSpeed + PHASE_SPEED_BONUS[currentPhase - 1]

      speedRef.current = Math.min(phaseMaxSpeed, speedRef.current + deltaMs * 0.00075)
      const dashing = dashTimerRef.current > 0
      const invincible = lightningTimerRef.current > 0 || dashing
      const effectiveSpeed =
        skateTimerRef.current > 0 || lightningTimerRef.current > 0
          ? speedRef.current * SKATE_SPEED_MULTIPLIER
          : speedRef.current

      const previousDino = dinosaurRef.current
      if (dashing) {
        // Air-hover during the dash: freeze vertical velocity and glide.
        dinosaurRef.current = { ...dinosaurRef.current, velocityY: 0, isDashing: true }
      } else {
        dinosaurRef.current = updateDinosaurPosition(dinosaurRef.current, deltaFactor)
        if (dinosaurRef.current.isDashing) {
          dinosaurRef.current = { ...dinosaurRef.current, isDashing: false }
        }
      }

      // Horizontal lunge (dash / wall-jump hop) eases back to the base lane.
      dashLungeRef.current *= DASH_LUNGE_DECAY
      if (dashLungeRef.current < 0.6) dashLungeRef.current = 0
      dinosaurRef.current = { ...dinosaurRef.current, x: BASE_X + dashLungeRef.current }

      let onPlatform = false
      for (const platform of obstaclesRef.current) {
        if (
          platform.type !== 'floating-platform' &&
          platform.type !== 'train' &&
          platform.type !== 'building'
        )
          continue

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

      // Wall-cling on building left faces (phase 3 verticality).
      wallClingRef.current = false
      let touchingWall = false
      if (!onPlatform && !dashing) {
        for (const wall of obstaclesRef.current) {
          if (wall.type !== 'building') continue
          const dinoRight = dinosaurRef.current.x + dinosaurRef.current.width
          const dinoBottom = dinosaurRef.current.y + dinosaurRef.current.height
          const dinoTop = dinosaurRef.current.y
          const airborne = dinoBottom < gameConfig.groundLevel - 1
          const nearLeftFace = dinoRight >= wall.x - 4 && dinoRight <= wall.x + 24
          const withinWallBand = dinoBottom > wall.y + 12 && dinoTop < wall.y + wall.height - 4
          if (airborne && nearLeftFace && withinWallBand) {
            touchingWall = true
            if (wallClingTimerRef.current < WALL_CLING_MAX_MS) {
              wallClingRef.current = true
              dinosaurRef.current = {
                ...dinosaurRef.current,
                x: wall.x - dinosaurRef.current.width + 2,
                velocityY: Math.min(dinosaurRef.current.velocityY, WALL_CLING_SLIDE),
                isJumping: true,
                isWallClinging: true,
              }
              jumpsUsedRef.current = 0
            }
            break
          }
        }
      }
      if (wallClingRef.current) {
        wallClingTimerRef.current += deltaMs
      } else if (!touchingWall) {
        wallClingTimerRef.current = 0
        if (dinosaurRef.current.isWallClinging) {
          dinosaurRef.current = { ...dinosaurRef.current, isWallClinging: false }
        }
      }

      const onGround =
        onPlatform ||
        dinosaurRef.current.y + dinosaurRef.current.height >= gameConfig.groundLevel - 1

      if (onGround) {
        coyoteTimeRef.current = COYOTE_TIME_MS
        jumpsUsedRef.current = 0
        wallClingTimerRef.current = 0
      }

      // Grind combo while riding a train/building roof (Jet Set Radio).
      if (onPlatform) {
        grindTimerRef.current += deltaMs
        while (grindTimerRef.current >= GRIND_TICK_MS) {
          grindTimerRef.current -= GRIND_TICK_MS
          grindComboRef.current += 1
          scoreRef.current += GRIND_TICK_SCORE * grindComboRef.current
        }
      } else {
        grindTimerRef.current = 0
        if (onGround) grindComboRef.current = 0
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
          !obstaclesRef.current.some((obs) => obs.type === 'floating-platform' || obs.type === 'train')

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

          if (obs.type === 'graffiti-artist' && checkCollision(dinosaurRef.current, obs)) {
            if (obs.graffitiArtist && !artistEncounterRef.current) {
              // Pause game and start interaction
              setGameActive(false)
              setCurrentArtist(obs.graffitiArtist)
              setInteractionStage('dialog')
              artistEncounterRef.current = obs.id.toString()
            }
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
                  (candidate.type === 'floating-platform' || candidate.type === 'train') &&
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
              obs.type !== 'train' &&
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

      // A building only kills when the player is embedded in its wall (rammed at
      // ground level), never when landing on the roof or gripping the face.
      const buildingEmbedded = obstaclesRef.current.some((obs: Obstacle) => {
        if (obs.type !== 'building') return false
        const dLeft = dinosaurRef.current.x + 6
        const dRight = dinosaurRef.current.x + dinosaurRef.current.width - 6
        const dBottom = dinosaurRef.current.y + dinosaurRef.current.height
        const coreLeft = obs.x + 10
        const coreRight = obs.x + obs.width - 6
        return dRight > coreLeft && dLeft < coreRight && dBottom > obs.y + 44
      })

      let skateShieldHit = false
      if (skateTimerRef.current > 0 && !dashing) {
        skateShieldHit =
          buildingEmbedded ||
          obstaclesRef.current.some(
            (obs: Obstacle) =>
              obs.type !== 'skate' &&
              obs.type !== 'coin' &&
              obs.type !== 'power-lightning' &&
              obs.type !== 'power-jump' &&
              obs.type !== 'floating-platform' &&
              obs.type !== 'train' &&
              obs.type !== 'building' &&
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

      const hasCollision =
        !skateShieldHit &&
        !invincible &&
        (buildingEmbedded ||
          obstaclesRef.current.some(
            (obs: Obstacle) =>
              obs.type !== 'skate' &&
              obs.type !== 'coin' &&
              obs.type !== 'power-lightning' &&
              obs.type !== 'power-jump' &&
              obs.type !== 'floating-platform' &&
              obs.type !== 'train' &&
              obs.type !== 'building' &&
              obs.type !== 'trampoline' &&
              checkCollision(dinosaurRef.current, obs)
          ))

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
      setSignatures(signaturesRef.current)
      setTotalCoins(totalCoinsRef.current)
      setGameSpeed(effectiveSpeed)
      setSkateTimeLeftMs(skateTimerRef.current)
      setLightningTimeLeftMs(lightningTimerRef.current)
      setJumpBoostTimeLeftMs(jumpBoostTimerRef.current)
      setDashActive(dashTimerRef.current > 0)
      setDashCooldownMs(dashCooldownRef.current)
      setGrindCombo(grindComboRef.current)
      setWallClinging(wallClingRef.current)

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
  const isNight = phase >= 2

  return (
    <div className={`game-wrapper ${isNight ? 'is-night' : ''} phase-${phase}`}>
      <div
        ref={gameContainerRef}
        className={`game-container ${isNight ? 'is-night' : ''} phase-${phase}`}
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

        <Dinosaur
          state={dinosaur}
          hasSkate={skateTimeLeftMs > 0}
          skateFlickering={skateFlickering}
          isDashing={dashActive}
          isWallClinging={wallClinging}
        />
        <Obstacles obstacles={obstacles} />

        {grindCombo > 1 && (
          <div className="grind-combo" aria-hidden="true">
            <span className="grind-combo-x">GRIND</span>
            <span className="grind-combo-value">x{grindCombo}</span>
          </div>
        )}

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
          signatures={signatures}
          blackbookCount={blackbook.length}
          onOpenBlackbook={() => setShowBlackbook(true)}
          phase={phase}
          dashCooldownMs={dashCooldownMs}
          grindCombo={grindCombo}
        />

        {currentArtist && interactionStage === 'dialog' && (
          <GraffitiDialog
            artist={currentArtist}
            onAccept={handleAcceptArtist}
            onReject={handleRejectArtist}
            artistSignatureImage={ARTIST_SIGNATURES[currentArtist]}
          />
        )}

        {currentArtist && interactionStage === 'signature-choice' && (
          <div className="signature-choice-overlay">
            <div className="signature-choice-container">
              <h2>Quer desenhar uma assinatura para {currentArtist}?</h2>
              <p>Você já recebeu a assinatura do artista!</p>
              
              <div className="choice-buttons">
                <button
                  className="btn-draw-signature"
                  onClick={() => {
                    setDrawingType('signature')
                    setInteractionStage('drawing')
                  }}
                >
                  📷 Desenhar Minha Assinatura
                </button>
                <button
                  className="btn-skip"
                  onClick={() => {
                    setInteractionStage('none')
                    setCurrentArtist(null)
                    artistEncounterRef.current = null
                    setGameActive(true)
                  }}
                >
                  Não, Obrigado
                </button>
              </div>
            </div>
          </div>
        )}

        {currentArtist && interactionStage === 'drawing' && (
          <DrawingCanvas
            artist={currentArtist}
            onDone={handleDrawingDone}
            onCancel={handleRejectArtist}
            title={drawingType === 'signature' ? 'Sua Assinatura' : 'Seu Graffiti'}
          />
        )}

        {currentArtist && drawnImage && interactionStage === 'confirmation' && (
          <DrawingConfirmation
            imageData={drawnImage}
            artist={currentArtist}
            onConfirm={handleConfirmArt}
            onGoBack={() => {
              setDrawnImage(null)
              setInteractionStage('drawing')
            }}
          />
        )}

        {showBlackbook && (
          <Blackbook arts={blackbook} onClose={() => setShowBlackbook(false)} />
        )}

        {!gameActive && interactionStage === 'none' && (
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
