import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Dinosaur from './Dinosaur'
import Obstacles from './Obstacle'
import HUD from './HUD'
import TouchControls from './TouchControls'
import GraffitiDialog from './GraffitiDialog'
import DrawingCanvas from './DrawingCanvas'
import DrawingConfirmation from './DrawingConfirmation'
import Blackbook from './Blackbook'
import { usePhysics } from '../hooks/usePhysics'
import { useGameInput } from '../hooks/useGameInput'
import { ARTIST_SIGNATURES } from '../data/artistSignatures'
import { GAME_MODES, RUNNER_TUNING, FREE_TUNING } from '../data/gameModes'
import {
  DinosaurState,
  Obstacle,
  GameConfig,
  GameMode,
  GraffitiArtist,
  GraffitiArt,
} from '../types/game'
import type { MusicOption } from '../App'
import dayBackground from '../assets/background/9.png'
import nightBackground from '../assets/background/7.png'
import themeTrack from '../assets/soundtrack/SonoTWS - Tired Of People Act II - SonoTWS (youtube).mp3'
import './Game.css'

const BASE_CONFIG: Omit<GameConfig, 'groundLevel'> = {
  playerSize: 100,
  // Jump arc tuned with a frame-by-frame replay of this loop: a full jump now clears a spray
  // with a ~280ms timing window at the starting speed (it used to be impossible).
  jumpPower: 13.5,
  gravity: 0.96,
  riseGravityScale: 0.55,
  fallGravityScale: 0.9,
  obstacleWidth: 36,
  obstacleHeight: 62,
  initialSpeed: RUNNER_TUNING.initialSpeed,
  maxSpeed: RUNNER_TUNING.maxSpeed,
  scrollSpeed: 1,
}

const FRAME_TIME = 1000 / 60
const JUMP_BUFFER_MS = 130
const COYOTE_TIME_MS = 90
const SKATE_DURATION_MS = 15000
const SKATE_SPEED_MULTIPLIER = 1.28
const LIGHTNING_DURATION_MS = 3000
const JUMP_BOOST_DURATION_MS = 4500
const JUMP_BOOST_MULTIPLIER = 1.2
const DUCK_HEIGHT = 80
const BIRD_ALTITUDE = 104 // bird top above the ground: duck under it or jump over it
const TRAMPOLINE_BOOST = 1.12
const COIN_SCORE = 25
const GRAFFITI_SIGNATURE_SCORE = 150
const BACKGROUND_TRANSITION_START = 900
const BACKGROUND_TRANSITION_END = 1700
const POWERUP_SIZE = 84
const TRAIN_PLATFORM_WIDTH = 240
const TRAIN_PLATFORM_HEIGHT = 80

// --- Phase system (Fase 1 Rua / Fase 2 Metrô / Fase 3 Telhados) ---
const PHASE_2_SCORE = 1200
const PHASE_3_SCORE = 3500

// --- Variable jump height (Mario) ---
const JUMP_CUT_MULTIPLIER = 0.6 // velocity kept when the jump button is released mid-rise
const MIN_JUMP_HEIGHT = 115 // a quick tap still rises this much, enough to clear a spray

// --- Fast fall (Chrome dino): holding down mid-air drops quicker ---
const FAST_FALL_GRAVITY = 2.5
const FAST_FALL_MIN_VELOCITY = 3

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
const WALL_CONTACT_INSET_X = 14
const ROOF_STEP_TOLERANCE = 8 // matches the platform landing tolerance

// Smaller screens get a scaled-down world with at least this much room (in game pixels),
// so there is time to see what's coming; the HUD and touch buttons stay full size.
const MIN_WORLD_WIDTH = 820
const MIN_WORLD_HEIGHT = 560

function getPhase(score: number): 1 | 2 | 3 {
  if (score >= PHASE_3_SCORE) return 3
  if (score >= PHASE_2_SCORE) return 2
  return 1
}

function approach(value: number, target: number, step: number) {
  return value < target ? Math.min(target, value + step) : Math.max(target, value - step)
}

/**
 * Free mode: buildings are solid walls. Clamps a horizontal move so the player stops at a
 * building face, and reports the side that was hit (1 = wall on the right, -1 = on the left).
 */
function moveAgainstBuildings(dino: DinosaurState, dx: number, obstacles: Obstacle[]) {
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

interface GameProps {
  mode: GameMode
  highScore: number
  selectedMusic: MusicOption
  onGameOver: (score: number) => void
}

export default function Game({ mode, highScore, selectedMusic, onGameOver }: GameProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<number>()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastTimeRef = useRef<number>(0)
  const containerWidthRef = useRef(1200)
  // Spawning is distance-based, so it works both with auto-scroll and with the free camera.
  const spawnDistanceRef = useRef(0)
  const nextSpawnGapRef = useRef(0)
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
  const wallSideRef = useRef<1 | -1>(1) // side of the wall being gripped
  const phaseRef = useRef<1 | 2 | 3>(1)
  const groundedRef = useRef(true) // on the ground or on a platform, as of the last frame
  const jumpHeldRef = useRef(false)
  const jumpCutArmedRef = useRef(false)
  const jumpTakeoffYRef = useRef(0)

  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const [totalCoins, setTotalCoins] = useState(() => {
    const saved = localStorage.getItem('dinoGameTotalCoins')
    return saved ? parseInt(saved, 10) : 0
  })
  // Signatures are counted per run (the loop used to clear them when the run started).
  const [signatures, setSignatures] = useState<GraffitiArtist[]>([])
  const [gameSpeed, setGameSpeed] = useState(BASE_CONFIG.initialSpeed)
  const [groundLevel, setGroundLevel] = useState(560)
  const [worldScale, setWorldScale] = useState(1)
  const [skateTimeLeftMs, setSkateTimeLeftMs] = useState(0)
  const [skateFlickering, setSkateFlickering] = useState(false)
  const [lightningTimeLeftMs, setLightningTimeLeftMs] = useState(0)
  const [jumpBoostTimeLeftMs, setJumpBoostTimeLeftMs] = useState(0)
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [dashActive, setDashActive] = useState(false)
  const [dashCooldownMs, setDashCooldownMs] = useState(0)
  const [grindCombo, setGrindCombo] = useState(0)
  const [wallClingSide, setWallClingSide] = useState<-1 | 0 | 1>(0) // 0 = not gripping a wall

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
      velocityX: 0,
      facing: 1,
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

  const { updateDinosaurPosition, checkCollision } = usePhysics(gameConfig)

  // Distance (px) until the next spawn. The runner converts a minimum *time* between
  // obstacles (longer than a full jump) into pixels, so there is always room to land and
  // react at any speed; the free mode uses plain distances because the player sets the pace.
  const getSpawnGap = useCallback(
    (speed: number) => {
      if (mode === 'free') {
        const phaseFactor = 1 - 0.08 * (phaseRef.current - 1)
        return (FREE_TUNING.minGap + Math.random() * (FREE_TUNING.maxGap - FREE_TUNING.minGap)) * phaseFactor
      }
      const progress = Math.min(
        1,
        Math.max(0, (speed - RUNNER_TUNING.initialSpeed) / (RUNNER_TUNING.maxSpeed - RUNNER_TUNING.initialSpeed))
      )
      const lerp = ([start, end]: number[]) => start + (end - start) * progress
      const minMs = lerp(RUNNER_TUNING.minGapMs)
      const maxMs = lerp(RUNNER_TUNING.maxGapMs)
      return speed * ((minMs + Math.random() * (maxMs - minMs)) / FRAME_TIME)
    },
    [mode]
  )

  const createFloatingPath = useCallback((): Obstacle[] => {
    const containerWidth = containerWidthRef.current
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
    const containerWidth = containerWidthRef.current

    // Fase 3 (Telhados): prédios altos que exigem wall-jump para escalar.
    if (phaseRef.current === 3 && Math.random() < 0.26) {
      const height = 100 + Math.floor(Math.random() * 77) // 100–176px: os mais altos pedem wall-jump
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
      const birdY = gameConfig.groundLevel - BIRD_ALTITUDE
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

  // Starts a jump from where the player stands, standing up first if ducked (feet stay put,
  // so jumping from a train roof or while ducked doesn't sink into the floor).
  const launchJump = useCallback(
    (dino: DinosaurState, power: number): DinosaurState => {
      const y = dino.y + dino.height - gameConfig.playerSize
      jumpTakeoffYRef.current = y
      jumpCutArmedRef.current = true
      jumpBufferRef.current = 0
      coyoteTimeRef.current = 0
      groundedRef.current = false
      return {
        ...dino,
        y,
        isDucking: false,
        height: gameConfig.playerSize,
        velocityY: -power,
        isJumping: true,
      }
    },
    [gameConfig.playerSize]
  )

  const handleJump = useCallback(() => {
    jumpHeldRef.current = true
    if (!gameActive || gameOverRef.current) return
    jumpBufferRef.current = JUMP_BUFFER_MS

    const jumpPowerMultiplier = jumpBoostTimerRef.current > 0 ? JUMP_BOOST_MULTIPLIER : 1

    // Wall-jump: launch off a wall we're currently gripping (Hollow Knight).
    if (wallClingRef.current) {
      const wallJumped: DinosaurState = {
        ...launchJump(dinosaurRef.current, gameConfig.jumpPower * WALL_JUMP_POWER_MULT * jumpPowerMultiplier),
        isWallClinging: false,
      }
      if (mode === 'free') {
        wallJumped.velocityX = -wallSideRef.current * FREE_TUNING.wallKick
      } else {
        dashLungeRef.current = Math.max(dashLungeRef.current, 74) // hop forward, over the ledge
      }
      dinosaurRef.current = wallJumped
      wallClingRef.current = false
      wallClingTimerRef.current = 0
      jumpsUsedRef.current = 1
      setDinosaur(wallJumped)
      return
    }

    // Ground jump, or the extra mid-air jump from the Super Pulo power-up. Only the ground
    // jump gets the power-up boost, so a boosted double jump can't fly off the screen.
    const grounded = groundedRef.current
    const maxJumps = jumpBoostTimerRef.current > 0 ? 2 : 1
    if (grounded || jumpsUsedRef.current < maxJumps) {
      const power = grounded ? gameConfig.jumpPower * jumpPowerMultiplier : gameConfig.jumpPower
      const jumped = launchJump(dinosaurRef.current, power)
      dinosaurRef.current = jumped
      jumpsUsedRef.current = grounded ? 1 : jumpsUsedRef.current + 1
      setDinosaur(jumped)
    }
  }, [gameActive, gameConfig.jumpPower, launchJump, mode])

  // Variable jump height (Mario): the loop clips the rise once the button is released.
  const handleJumpEnd = useCallback(() => {
    jumpHeldRef.current = false
  }, [])

  // Dash / esquiva: brief forward lunge with i-frames and a cooldown (Hollow Knight / Subway roll).
  const handleDash = useCallback(() => {
    if (!gameActive || gameOverRef.current) return
    if (dashCooldownRef.current > 0 || dashTimerRef.current > 0) return
    dashTimerRef.current = DASH_DURATION_MS
    dashCooldownRef.current = DASH_COOLDOWN_MS
    // The free mode dashes through velocityX in the loop instead of the runner's lunge.
    dashLungeRef.current = mode === 'runner' ? DASH_LUNGE : 0
    const dashing = {
      ...dinosaurRef.current,
      isDashing: true,
      velocityY: 0, // brief air-hover, both on ground and mid-air
    }
    dinosaurRef.current = dashing
    setDinosaur(dashing)
  }, [gameActive, mode])

  // Ducking is polled every frame from the held input, so it also works when landing with
  // the key already down.
  const { held, press, release } = useGameInput({
    onJump: handleJump,
    onJumpEnd: handleJumpEnd,
    onDash: handleDash,
  })

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
    const updateLayout = () => {
      const viewportWidth = gameContainerRef.current?.clientWidth ?? 1200
      const viewportHeight = gameContainerRef.current?.clientHeight ?? 700
      const scale = Math.min(1, viewportWidth / MIN_WORLD_WIDTH, viewportHeight / MIN_WORLD_HEIGHT)
      setWorldScale(scale)
      // Everything below is in world (game) pixels. The width is cached so the free-mode
      // camera doesn't read layout every frame.
      containerWidthRef.current = viewportWidth / scale
      // Keep physics ground aligned with the visible top of the floor layer.
      const nextGroundLevel = Math.round((viewportHeight / scale) * 0.76)
      setGroundLevel(nextGroundLevel)
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)

    return () => {
      window.removeEventListener('resize', updateLayout)
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

  const groundLevelRef = useRef(groundLevel)
  useEffect(() => {
    // Obstacles move with the floor when it shifts (window resize or phone rotation).
    const groundShift = groundLevel - groundLevelRef.current
    groundLevelRef.current = groundLevel
    if (groundShift !== 0) {
      obstaclesRef.current = obstaclesRef.current.map((obs) => ({ ...obs, y: obs.y + groundShift }))
      setObstacles(obstaclesRef.current)
    }

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

    // Game remounts for every run, so refs and state already start fresh. This effect only
    // (re)starts the loop, so resuming after a graffiti encounter no longer wipes the coins,
    // signatures and power-ups collected so far.
    lastTimeRef.current = 0
    if (!nextSpawnGapRef.current) {
      nextSpawnGapRef.current = getSpawnGap(speedRef.current) * 0.5
    }

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
      const phaseMaxSpeed = gameConfig.maxSpeed + RUNNER_TUNING.phaseSpeedBonus[currentPhase - 1]

      speedRef.current = Math.min(phaseMaxSpeed, speedRef.current + deltaMs * RUNNER_TUNING.accelerationPerMs)
      const dashing = dashTimerRef.current > 0
      const invincible = lightningTimerRef.current > 0 || dashing
      const speedBoost =
        skateTimerRef.current > 0 || lightningTimerRef.current > 0 ? SKATE_SPEED_MULTIPLIER : 1
      const effectiveSpeed = speedRef.current * speedBoost
      const input = held.current
      const moveAxis = mode === 'free' ? Number(input.right) - Number(input.left) : 0

      const previousDino = dinosaurRef.current
      let wallContact: -1 | 0 | 1 = 0

      if (mode === 'free') {
        // Walk with a little acceleration, keep momentum in the air, and stop at buildings.
        let velocityX = previousDino.velocityX ?? 0
        const facing = moveAxis !== 0 ? (moveAxis as 1 | -1) : previousDino.facing ?? 1
        if (dashing) {
          velocityX = facing * FREE_TUNING.dashSpeed
        } else {
          const crouchFactor = previousDino.isDucking ? FREE_TUNING.crouchSpeedFactor : 1
          const topSpeed = FREE_TUNING.walkSpeed * speedBoost * crouchFactor
          const grounded = groundedRef.current
          const rate =
            moveAxis !== 0
              ? grounded ? FREE_TUNING.groundAcceleration : FREE_TUNING.airAcceleration
              : grounded ? FREE_TUNING.groundDeceleration : FREE_TUNING.airDeceleration
          velocityX = approach(velocityX, moveAxis * topSpeed, rate * deltaFactor)
        }

        const moved = moveAgainstBuildings(previousDino, velocityX * deltaFactor, obstaclesRef.current)
        wallContact = moved.wallContact
        if (wallContact !== 0) velocityX = 0
        let x = previousDino.x + moved.dx
        if (x < FREE_TUNING.leftLimit) {
          x = FREE_TUNING.leftLimit
          velocityX = Math.max(0, velocityX)
        }
        dinosaurRef.current = { ...previousDino, x, velocityX, facing }
      }

      if (dashing) {
        // Air-hover during the dash: freeze vertical velocity and glide.
        dinosaurRef.current = { ...dinosaurRef.current, velocityY: 0, isDashing: true }
      } else {
        // Holding down mid-air cancels the rise and drops faster (Chrome dino).
        const fastFalling = input.down && !groundedRef.current && !wallClingRef.current
        let dino = dinosaurRef.current
        if (fastFalling) dino = { ...dino, velocityY: Math.max(dino.velocityY, FAST_FALL_MIN_VELOCITY) }
        dinosaurRef.current = updateDinosaurPosition(dino, deltaFactor, fastFalling ? FAST_FALL_GRAVITY : 1)
        if (dinosaurRef.current.isDashing) {
          dinosaurRef.current = { ...dinosaurRef.current, isDashing: false }
        }
      }

      // Variable jump height: once the button is released the rise is clipped, but never
      // below MIN_JUMP_HEIGHT, so a quick tap still clears a spray.
      if (jumpCutArmedRef.current) {
        const dino = dinosaurRef.current
        if (dino.velocityY >= 0) {
          jumpCutArmedRef.current = false
        } else if (!jumpHeldRef.current && jumpTakeoffYRef.current - dino.y >= MIN_JUMP_HEIGHT) {
          dinosaurRef.current = { ...dino, velocityY: dino.velocityY * JUMP_CUT_MULTIPLIER }
          jumpCutArmedRef.current = false
        }
      }

      if (mode === 'runner') {
        // Horizontal lunge (dash / wall-jump hop) eases back to the base lane.
        dashLungeRef.current *= DASH_LUNGE_DECAY
        if (dashLungeRef.current < 0.6) dashLungeRef.current = 0
        dinosaurRef.current = { ...dinosaurRef.current, x: BASE_X + dashLungeRef.current }
      }

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

      // Wall-cling on building faces (phase 3 verticality). The runner grips the left face it
      // runs into; the free mode grips whichever face the player is pushing against.
      wallClingRef.current = false
      let touchingWall = false
      const airborne = dinosaurRef.current.y + dinosaurRef.current.height < gameConfig.groundLevel - 1
      if (!onPlatform && !dashing && mode === 'free') {
        if (airborne && wallContact !== 0 && moveAxis === wallContact) {
          touchingWall = true
          if (wallClingTimerRef.current < WALL_CLING_MAX_MS) {
            wallClingRef.current = true
            wallSideRef.current = wallContact
            dinosaurRef.current = {
              ...dinosaurRef.current,
              velocityY: Math.min(dinosaurRef.current.velocityY, WALL_CLING_SLIDE),
              isJumping: true,
              isWallClinging: true,
            }
            jumpsUsedRef.current = 0
          }
        }
      } else if (!onPlatform && !dashing) {
        for (const wall of obstaclesRef.current) {
          if (wall.type !== 'building') continue
          const dinoRight = dinosaurRef.current.x + dinosaurRef.current.width
          const dinoBottom = dinosaurRef.current.y + dinosaurRef.current.height
          const dinoTop = dinosaurRef.current.y
          const nearLeftFace = dinoRight >= wall.x - 4 && dinoRight <= wall.x + 24
          const withinWallBand = dinoBottom > wall.y + 12 && dinoTop < wall.y + wall.height - 4
          if (airborne && nearLeftFace && withinWallBand) {
            touchingWall = true
            if (wallClingTimerRef.current < WALL_CLING_MAX_MS) {
              wallClingRef.current = true
              wallSideRef.current = 1
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
      } else {
        if (!touchingWall) wallClingTimerRef.current = 0
        if (dinosaurRef.current.isWallClinging) {
          dinosaurRef.current = { ...dinosaurRef.current, isWallClinging: false }
        }
      }

      const onGround =
        onPlatform ||
        dinosaurRef.current.y + dinosaurRef.current.height >= gameConfig.groundLevel - 1
      groundedRef.current = onGround
      if (!onGround && !dinosaurRef.current.isJumping) {
        // Walked off a roof or train: show the airborne pose instead of running in mid-air.
        dinosaurRef.current = { ...dinosaurRef.current, isJumping: true }
      }

      if (onGround) {
        coyoteTimeRef.current = COYOTE_TIME_MS
        jumpsUsedRef.current = 0
        wallClingTimerRef.current = 0
      }

      // Duck while the down key is held on solid ground (train roofs included), stand up
      // otherwise. The feet stay put, so ducking on a roof doesn't drop through it.
      const wantsDuck = input.down && onGround
      if (wantsDuck !== Boolean(dinosaurRef.current.isDucking)) {
        const height = wantsDuck ? DUCK_HEIGHT : gameConfig.playerSize
        const bottom = dinosaurRef.current.y + dinosaurRef.current.height
        dinosaurRef.current = { ...dinosaurRef.current, isDucking: wantsDuck, height, y: bottom - height }
      }

      if (jumpBufferRef.current > 0 && coyoteTimeRef.current > 0) {
        const jumpPowerMultiplier = jumpBoostTimerRef.current > 0 ? JUMP_BOOST_MULTIPLIER : 1
        dinosaurRef.current = launchJump(dinosaurRef.current, gameConfig.jumpPower * jumpPowerMultiplier)
        jumpsUsedRef.current = 1
      }

      // How far the world moves this frame: constant in the runner; in the free mode the
      // camera only follows once the player walks past the camera line.
      let scroll = effectiveSpeed * deltaFactor
      if (mode === 'free') {
        const cameraX = containerWidthRef.current * FREE_TUNING.cameraLine
        scroll = Math.max(0, dinosaurRef.current.x - cameraX)
        if (scroll > 0) dinosaurRef.current = { ...dinosaurRef.current, x: cameraX }
      }

      // Grind combo while riding a train/building roof (Jet Set Radio). It only counts while
      // the world moves, so the free mode can't farm it by standing or pacing on a roof.
      if (onPlatform && scroll > 0) {
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

      spawnDistanceRef.current += scroll
      if (spawnDistanceRef.current >= nextSpawnGapRef.current) {
        const shouldSpawnPath =
          scoreRef.current >= 500 &&
          Math.random() < 0.18 &&
          !obstaclesRef.current.some((obs) => obs.type === 'floating-platform' || obs.type === 'train')

        const gap = getSpawnGap(effectiveSpeed)
        if (shouldSpawnPath) {
          // Nothing else spawns until the whole train line has scrolled in.
          const path = createFloatingPath()
          const pathLength = path
            .filter((obs) => obs.type === 'train')
            .reduce((length, train) => length + train.width, 0)
          obstaclesRef.current = [...obstaclesRef.current, ...path]
          nextSpawnGapRef.current = pathLength + gap
        } else {
          const obstacle = createObstacle()
          if (mode === 'free' && obstacle.type === 'bird') {
            // Birds fly toward the player: spawn them further out so that, for someone walking
            // at full speed, they arrive spaced like any other obstacle.
            const cameraX = containerWidthRef.current * FREE_TUNING.cameraLine
            obstacle.x += ((obstacle.x - cameraX) * FREE_TUNING.birdDrift) / FREE_TUNING.walkSpeed
          }
          obstaclesRef.current = [...obstaclesRef.current, obstacle]
          nextSpawnGapRef.current = gap
        }
        spawnDistanceRef.current = 0
      }

      const birdDrift = mode === 'free' ? FREE_TUNING.birdDrift * deltaFactor : 0
      let encounterStarted = false
      obstaclesRef.current = obstaclesRef.current
        .map((obs: Obstacle) => ({
          ...obs,
          x: obs.x - scroll - (obs.type === 'bird' ? birdDrift : 0),
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
              encounterStarted = true
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
            // The free mode has no scroll speed to aim with, so it always gets the full bounce.
            const trampolineMultiplier =
              mode === 'free'
                ? TRAMPOLINE_BOOST
                : nextPlatform
                ? Math.min(TRAMPOLINE_BOOST, Math.max(1, 1 + travelFrames / 220))
                : 1.04
            dinosaurRef.current = launchJump(
              dinosaurRef.current,
              gameConfig.jumpPower * trampolineMultiplier * jumpBoostMultiplier
            )
            jumpCutArmedRef.current = false // a bounce is not a button jump: releasing can't clip it
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

      if (encounterStarted) {
        // Pause right here; the loop restarts when the encounter ends.
        setDinosaur(dinosaurRef.current)
        setObstacles(obstaclesRef.current)
        return
      }

      // A building only kills when the player is embedded in its wall (rammed at
      // ground level), never when landing on the roof or gripping the face. In the free
      // mode buildings are solid walls instead, so they never kill.
      const buildingEmbedded = mode === 'runner' && obstaclesRef.current.some((obs: Obstacle) => {
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
      setWallClingSide(wallClingRef.current ? wallSideRef.current : 0)

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
    gameConfig.jumpPower,
    gameConfig.maxSpeed,
    gameConfig.playerSize,
    getSpawnGap,
    held,
    launchJump,
    mode,
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
  const modeInfo = GAME_MODES[mode]
  // Gripping a wall turns the sprite away from it; otherwise it faces the walking direction.
  const visualFacing = wallClingSide !== 0 ? (-wallClingSide as 1 | -1) : dinosaur.facing ?? 1
  const isMoving = mode === 'runner' || Math.abs(dinosaur.velocityX ?? 0) > 0.3

  return (
    <div className={`game-wrapper ${isNight ? 'is-night' : ''} phase-${phase}`}>
      <div
        ref={gameContainerRef}
        className={`game-container ${isNight ? 'is-night' : ''} phase-${phase}`}
      >
        {/* The world is laid out in game pixels and scaled to fit; UI below stays unscaled. */}
        <div
          className="game-world"
          style={{
            width: `${100 / worldScale}%`,
            height: `${100 / worldScale}%`,
            transform: `scale(${worldScale})`,
          }}
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
            isWallClinging={wallClingSide !== 0}
            facing={visualFacing}
            isMoving={isMoving}
          />
          <Obstacles obstacles={obstacles} />
        </div>

        <TouchControls mode={mode} onPress={press} onRelease={release} />

        <div className="controls-hint" aria-hidden="true">
          <span className="controls-hint-title">
            {modeInfo.icon} {modeInfo.title}
          </span>
          {modeInfo.controls.map(([keys, action]) => (
            <span key={keys} className="controls-hint-item">
              <strong>{keys}</strong> {action}
            </span>
          ))}
        </div>

        {grindCombo > 1 && (
          <div className="grind-combo" aria-hidden="true">
            <span className="grind-combo-x">GRIND</span>
            {/* keyed by the value so the pop animation replays on every combo step */}
            <span key={grindCombo} className="grind-combo-value">x{grindCombo}</span>
          </div>
        )}

        <HUD
          mode={mode}
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
