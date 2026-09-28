/**
 * Vandal Game engine: all game rules, with no React and no DOM. A front end (the web
 * Game component today, an Expo app later) creates a state, calls stepGame once per frame
 * with the held input, forwards button presses to pressJump/releaseJump/pressDash, reacts to
 * the returned events and draws getView(state).
 */
import type {
  Checkpoint,
  DinosaurState,
  GameConfig,
  GameMode,
  GamePhase,
  GraffitiArtist,
  HeldInput,
  Obstacle,
} from '../types/game'
import { FREE_TUNING, RUNNER_TUNING } from '../data/gameModes'
import {
  BASE_CONFIG,
  BASE_X,
  CAMERA_FOLLOW_DOWN,
  CAMERA_FOLLOW_UP,
  CAMERA_TOP_MARGIN,
  CHASER_ENTER_MS,
  CHASER_FREE_CHASE_MS,
  CHASER_FREE_SPEED,
  CHASER_GAP,
  CHASER_KEEP_UP,
  CHASER_MIN_GAP,
  CHASER_SPEED,
  CHECKPOINT_BONUS,
  CHECKPOINT_DROP_HEIGHT,
  CLIMB_DROP_FRAMES,
  CLIMB_RETRY_SPAWNS,
  COIN_SCORE,
  COYOTE_TIME_MS,
  ENGINE_VERSION,
  MAX_CATCH_UP_MS,
  TICK_MS,
  DASH_COOLDOWN_MS,
  DASH_DURATION_MS,
  DASH_LUNGE,
  DASH_LUNGE_DECAY,
  DUCK_HEIGHT,
  FAST_FALL_GRAVITY,
  FAST_FALL_MIN_VELOCITY,
  FRAME_TIME,
  GRAFFITI_SIGNATURE_SCORE,
  GRIND_TICK_MS,
  GRIND_TICK_SCORE,
  GROUND_RATIO,
  INTRO_HOP_POWER,
  INTRO_OFFSET_DECAY,
  INTRO_PLAYER_OFFSET,
  INTRO_RAMP_MS,
  INTRO_RUN_AT_MS,
  INTRO_TAG_MS,
  INTRO_WALL_HEIGHT,
  INTRO_WALL_WIDTH,
  JUMP_BOOST_DURATION_MS,
  JUMP_BOOST_MULTIPLIER,
  JUMP_BUFFER_MS,
  JUMP_CUT_MULTIPLIER,
  LIGHTNING_DURATION_MS,
  MIN_JUMP_HEIGHT,
  MIN_WORLD_HEIGHT,
  MIN_WORLD_WIDTH,
  OBSTACLE_PASSED_SCORE,
  PHASE_2_SCORE,
  PHASE_3_SCORE,
  ROOF_STEP_TOLERANCE,
  SKATE_DURATION_MS,
  RECOVER_MS,
  SLAM_MS,
  SLAM_SLOWDOWN,
  METERS_PER_PX,
  SKATE_SPEED_MULTIPLIER,
  TRAMPOLINE_BOOST,
  WALL_CLING_MAX_MS,
  WALL_CLING_SLIDE,
  WALL_JUMP_POWER_MULT,
} from './config'
import { approach, checkCollision, moveAgainstBuildings, updatePlayerPosition } from './physics'
import { createRandom, newSeed } from './random'
import { createClimb, createFloatingPath, createObstacle, getSpawnGap, spacingAfter } from './spawn'

/** Something the player did at a tick, as saved in a run log. */
export type RunEvent =
  | { tick: number; type: 'held'; held: HeldInput }
  | { tick: number; type: 'jump' | 'jumpEnd' | 'dash' | 'resume' }
  | { tick: number; type: 'signature'; artist: GraffitiArtist }
  | { tick: number; type: 'resize'; width: number; height: number }

/**
 * Everything needed to replay a run exactly (see replayRun): how it started and what the
 * player did at which tick. endTick/score are filled in when the run ends.
 */
export interface RunLog {
  version: number
  mode: GameMode
  width: number
  height: number
  seed: number
  intro: boolean
  checkpoint: Checkpoint | null
  events: RunEvent[]
  endTick?: number
  score?: number
}

/** The cop from the intro: runs in, shouts, chases and falls behind (or gives up). */
export interface Chaser {
  /** Left edge on screen, in game pixels, like an obstacle. */
  x: number
  state: 'enter' | 'shout' | 'chase' | 'giveup'
}

export interface GameState {
  mode: GameMode
  config: GameConfig
  /** Size of the visible world in game pixels (obstacles spawn just past its right edge). */
  worldWidth: number
  worldHeight: number
  random: () => number

  player: DinosaurState
  obstacles: Obstacle[]
  nextObstacleId: number
  // Spawning is distance-based, so it works both with auto-scroll and with the free camera.
  spawnDistance: number
  nextSpawnGap: number

  score: number
  coins: number
  totalCoins: number
  /** Artists signed in this run. */
  signatures: GraffitiArtist[]
  phase: GamePhase
  /** Time since the current phase began (front ends show a banner and fade to night). */
  phaseMs: number
  /** Last checkpoint flag grabbed in this run (or the one the run continued from). */
  checkpoint: Checkpoint | null
  /** Obstacles left before a missed checkpoint climb can show up again. */
  climbCooldown: number
  /** How far the view is moved down to follow the player up (0 = the floor at its place). */
  cameraY: number
  /** The run opens with the tagging intro (see INTRO_* in config). */
  intro: boolean
  /** Time since the run began, intro included. */
  introMs: number
  /** Runner: extra x the player starts with during the intro, easing back to the lane. */
  introOffset: number
  chaser: Chaser | null
  speed: number
  /** Scroll speed including power-up boosts (px per 60fps frame). */
  effectiveSpeed: number

  jumpBufferMs: number
  coyoteMs: number
  skateMs: number
  /** Skate SLAM in progress (down on the ground), then blinking while getting back in. */
  slamMs: number
  recoverMs: number
  /** How far the world has moved, in game pixels (for the route map). */
  distance: number
  lightningMs: number
  jumpBoostMs: number
  dashMs: number
  dashCooldownMs: number
  dashLunge: number
  grindTimerMs: number
  grindCombo: number
  wallCling: boolean
  wallClingMs: number
  wallSide: 1 | -1 // side of the wall being gripped
  /** Runner: the building the player is riding (gripping it or wall-jumping up its face). */
  wallId: number | null
  grounded: boolean // on the ground or on a platform, as of the last step
  jumpHeld: boolean
  jumpCutArmed: boolean
  jumpTakeoffY: number
  jumpsUsed: number

  /** Fixed 60Hz ticks simulated so far, and the time not simulated yet (see advanceGame). */
  tick: number
  accumulatorMs: number
  /** Held directions as of the last tick, to log only the changes. */
  held: HeldInput
  /** The run being recorded (createGameState with record: true), or null. */
  log: RunLog | null

  /** Paused by a graffiti encounter until resumeGame. */
  paused: boolean
  gameOver: boolean
  artistEncounterId: number | null
}

export type GameEvent =
  | { type: 'coin' }
  | { type: 'artist'; artist: GraffitiArtist }
  | { type: 'checkpoint'; phase: GamePhase }
  | { type: 'slam' }
  | { type: 'gameOver'; score: number; checkpoint: Checkpoint | null; phase: GamePhase; coins: number; distance: number }

/** What a front end needs to draw a frame. */
export interface GameView {
  player: DinosaurState
  obstacles: Obstacle[]
  score: number
  coins: number
  totalCoins: number
  signatures: GraffitiArtist[]
  phase: GamePhase
  phaseMs: number
  /** Draw the world (floor, obstacles, player) this much lower: the camera following the player up. */
  cameraY: number
  /** Intro beats: spraying the wall, then noticing the cop; null once running. */
  introStage: 'tag' | 'alert' | null
  /** How much of the intro tag is painted (0..1). */
  tagProgress: number
  chaser: Chaser | null
  speed: number
  skateMs: number
  /** 0 → 1 while down after a skate SLAM, null otherwise. */
  slamProgress: number | null
  /** Blinking after a SLAM: can't be hurt. */
  recovering: boolean
  /** Distance run, in meters. */
  distance: number
  lightningMs: number
  jumpBoostMs: number
  dashing: boolean
  dashCooldownMs: number
  grindCombo: number
  /** 0 = not gripping a wall, otherwise the side of the wall. */
  wallClingSide: -1 | 0 | 1
}

interface CreateGameOptions {
  mode: GameMode
  /** World size in game pixels (see fitWorld). */
  width: number
  height: number
  totalCoins?: number
  /** Continue from a checkpoint of an earlier run: its phase, score, speed, coins and signatures. */
  checkpoint?: Checkpoint | null
  /** Open with the tagging intro and the cop (ignored when continuing: the player drops in). */
  intro?: boolean
  /** Seed for the obstacles; a recorded run always has one (a new one if not given). */
  seed?: number
  /** Keep a RunLog of the run in state.log, for replays and score checks. */
  record?: boolean
  /** Custom random source for tests (ignored when a seed is given or the run is recorded). */
  random?: () => number
}

/** How much to scale the world down so a small viewport still shows enough of it. */
export function fitWorld(viewportWidth: number, viewportHeight: number) {
  const scale = Math.min(1, viewportWidth / MIN_WORLD_WIDTH, viewportHeight / MIN_WORLD_HEIGHT)
  return { scale, width: viewportWidth / scale, height: viewportHeight / scale }
}

export function createGameState({
  mode,
  width,
  height,
  totalCoins = 0,
  checkpoint = null,
  intro = false,
  seed,
  record = false,
  random: customRandom,
}: CreateGameOptions): GameState {
  const runSeed = seed ?? (record ? newSeed() : undefined)
  const random = runSeed !== undefined ? createRandom(runSeed) : customRandom ?? Math.random
  const config: GameConfig = { ...BASE_CONFIG, groundLevel: Math.round(height * GROUND_RATIO) }
  const withIntro = intro && !checkpoint
  // Continuing from a checkpoint the player drops in from above, already running.
  const dropIn = checkpoint ? CHECKPOINT_DROP_HEIGHT : 0
  const state: GameState = {
    mode,
    config,
    worldWidth: width,
    worldHeight: height,
    random,
    player: {
      x: BASE_X + (withIntro ? INTRO_PLAYER_OFFSET : 0),
      y: config.groundLevel - config.playerSize - dropIn,
      velocityY: 0,
      velocityX: 0,
      facing: 1,
      isJumping: dropIn > 0,
      isDucking: false,
      width: config.playerSize,
      height: config.playerSize,
    },
    obstacles: [],
    nextObstacleId: 0,
    spawnDistance: 0,
    nextSpawnGap: 0,
    score: checkpoint?.score ?? 0,
    coins: checkpoint?.coins ?? 0,
    totalCoins,
    signatures: checkpoint ? [...checkpoint.signatures] : [],
    phase: checkpoint?.phase ?? 1,
    phaseMs: 0,
    checkpoint,
    climbCooldown: 0,
    cameraY: 0,
    intro: withIntro,
    introMs: 0,
    introOffset: withIntro && mode === 'runner' ? INTRO_PLAYER_OFFSET : 0,
    chaser: withIntro ? { x: -130, state: 'enter' } : null,
    speed: checkpoint?.speed ?? config.initialSpeed,
    effectiveSpeed: checkpoint?.speed ?? config.initialSpeed,
    jumpBufferMs: 0,
    coyoteMs: 0,
    skateMs: 0,
    slamMs: 0,
    recoverMs: 0,
    distance: 0,
    lightningMs: 0,
    jumpBoostMs: 0,
    dashMs: 0,
    dashCooldownMs: 0,
    dashLunge: 0,
    grindTimerMs: 0,
    grindCombo: 0,
    wallCling: false,
    wallClingMs: 0,
    wallSide: 1,
    wallId: null,
    grounded: dropIn === 0,
    jumpHeld: false,
    jumpCutArmed: false,
    jumpTakeoffY: 0,
    jumpsUsed: 0,
    tick: 0,
    accumulatorMs: 0,
    held: { left: false, right: false, down: false },
    log: record
      ? {
          version: ENGINE_VERSION,
          mode,
          width,
          height,
          seed: runSeed ?? 0,
          intro: withIntro,
          checkpoint,
          events: [],
        }
      : null,
    paused: false,
    gameOver: false,
    artistEncounterId: null,
  }
  state.nextSpawnGap = getSpawnGap(state, state.speed) * 0.5
  if (withIntro) {
    // The wall being tagged, right in front of the player; it scrolls away once the run starts.
    state.obstacles.push({
      id: state.nextObstacleId++,
      x: state.player.x + 76,
      y: config.groundLevel + 6 - INTRO_WALL_HEIGHT,
      width: INTRO_WALL_WIDTH,
      height: INTRO_WALL_HEIGHT,
      type: 'wall',
      passed: false,
    })
  }
  return state
}

/** Still in the intro, before the run starts (the world doesn't move, input only skips it). */
function beforeRun(state: GameState) {
  return state.intro && state.introMs < INTRO_RUN_AT_MS
}

/** 0 → 1 as the scroll picks up after the intro. */
function introRamp(state: GameState) {
  if (!state.intro) return 1
  return Math.min(1, Math.max(0, (state.introMs - INTRO_RUN_AT_MS) / INTRO_RAMP_MS))
}

function logEvent(state: GameState, event: RunEvent) {
  state.log?.events.push(event)
}

/** Window resize or phone rotation: move the floor, keeping obstacles and the player on it. */
export function resizeWorld(state: GameState, width: number, height: number) {
  if (width !== state.worldWidth || height !== state.worldHeight) {
    logEvent(state, { tick: state.tick, type: 'resize', width, height })
  }
  state.worldWidth = width
  state.worldHeight = height
  const groundLevel = Math.round(height * GROUND_RATIO)
  const groundShift = groundLevel - state.config.groundLevel
  if (groundShift === 0) return

  state.config = { ...state.config, groundLevel }
  state.cameraY = 0
  state.obstacles = state.obstacles.map((obs) => ({ ...obs, y: obs.y + groundShift }))
  const size = state.config.playerSize
  state.player = {
    ...state.player,
    y: groundLevel - size,
    velocityY: 0,
    isJumping: false,
    isDucking: false,
    width: size,
    height: size,
  }
}

/** The phase whose checkpoint climb is due (the score is there but its flag isn't), if any. */
function dueClimb(state: GameState): 2 | 3 | null {
  if (state.phase === 1 && state.score >= PHASE_2_SCORE) return 2
  if (state.phase === 2 && state.score >= PHASE_3_SCORE) return 3
  return null
}

// Starts a jump from where the player stands, standing up first if ducked (feet stay put,
// so jumping from a train roof or while ducked doesn't sink into the floor).
function launchJump(state: GameState, dino: DinosaurState, power: number): DinosaurState {
  const size = state.config.playerSize
  const y = dino.y + dino.height - size
  state.jumpTakeoffY = y
  state.jumpCutArmed = true
  state.jumpBufferMs = 0
  state.coyoteMs = 0
  state.grounded = false
  return {
    ...dino,
    y,
    isDucking: false,
    height: size,
    velocityY: -power,
    isJumping: true,
  }
}

export function pressJump(state: GameState) {
  logEvent(state, { tick: state.tick, type: 'jump' })
  state.jumpHeld = true
  if (state.paused || state.gameOver || state.slamMs > 0) return
  // Jumping during the intro skips it: the run starts with this jump.
  if (beforeRun(state)) state.introMs = INTRO_RUN_AT_MS
  state.jumpBufferMs = JUMP_BUFFER_MS

  const { jumpPower } = state.config
  const jumpPowerMultiplier = state.jumpBoostMs > 0 ? JUMP_BOOST_MULTIPLIER : 1

  // Wall-jump: launch off a wall we're currently gripping (Hollow Knight).
  if (state.wallCling) {
    const wallJumped: DinosaurState = {
      ...launchJump(state, state.player, jumpPower * WALL_JUMP_POWER_MULT * jumpPowerMultiplier),
      isWallClinging: false,
    }
    // The runner keeps riding the wall (wallId) while rising, until the feet clear the roof.
    if (state.mode === 'free') wallJumped.velocityX = -state.wallSide * FREE_TUNING.wallKick
    state.player = wallJumped
    state.wallCling = false
    state.wallClingMs = 0
    state.jumpsUsed = 1
    return
  }

  // Ground jump, or the extra mid-air jump from the Super Pulo power-up. Only the ground
  // jump gets the power-up boost, so a boosted double jump can't fly off the screen.
  const grounded = state.grounded
  const maxJumps = state.jumpBoostMs > 0 ? 2 : 1
  if (grounded || state.jumpsUsed < maxJumps) {
    const power = grounded ? jumpPower * jumpPowerMultiplier : jumpPower
    state.player = launchJump(state, state.player, power)
    state.jumpsUsed = grounded ? 1 : state.jumpsUsed + 1
  }
}

/** Variable jump height (Mario): stepGame clips the rise once the button is released. */
export function releaseJump(state: GameState) {
  logEvent(state, { tick: state.tick, type: 'jumpEnd' })
  state.jumpHeld = false
}

/** Dash / esquiva: brief lunge with i-frames and a cooldown (Hollow Knight / Subway roll). */
export function pressDash(state: GameState) {
  if (state.paused || state.gameOver || beforeRun(state) || state.slamMs > 0) return
  logEvent(state, { tick: state.tick, type: 'dash' })
  if (state.dashCooldownMs > 0 || state.dashMs > 0) return
  state.dashMs = DASH_DURATION_MS
  state.dashCooldownMs = DASH_COOLDOWN_MS
  // The free mode dashes through velocityX instead of the runner's lunge.
  state.dashLunge = state.mode === 'runner' ? DASH_LUNGE : 0
  state.player = {
    ...state.player,
    isDashing: true,
    velocityY: 0, // brief air-hover, both on ground and mid-air
  }
}

/** Ends the graffiti encounter pause. */
export function resumeGame(state: GameState) {
  logEvent(state, { tick: state.tick, type: 'resume' })
  state.paused = false
  state.artistEncounterId = null
}

/** Signing an artist's blackbook scores once per artist per run; returns whether it counted. */
export function awardSignature(state: GameState, artist: GraffitiArtist) {
  if (state.signatures.includes(artist)) return false
  logEvent(state, { tick: state.tick, type: 'signature', artist })
  state.score += GRAFFITI_SIGNATURE_SCORE
  state.signatures = [...state.signatures, artist]
  return true
}

// Things you can touch without dying (pickups, platforms, buildings are handled separately).
function isHazard(obs: Obstacle) {
  return (
    !obs.knocked &&
    obs.type !== 'skate' &&
    obs.type !== 'coin' &&
    obs.type !== 'power-lightning' &&
    obs.type !== 'power-jump' &&
    obs.type !== 'floating-platform' &&
    obs.type !== 'train' &&
    obs.type !== 'building' &&
    obs.type !== 'trampoline' &&
    obs.type !== 'checkpoint' &&
    obs.type !== 'wall'
  )
}

/** The intro's cop: runs in and shouts, then chases until left behind (or gives up). */
function updateChaser(state: GameState, player: DinosaurState, scroll: number, deltaFactor: number) {
  const chaser = state.chaser
  if (!chaser || state.introMs < CHASER_ENTER_MS) return
  const closest = player.x - CHASER_MIN_GAP
  let x = chaser.x
  let chaserState = chaser.state

  if (beforeRun(state)) {
    // Runs in and stops a little behind the player to shout.
    const stop = player.x - CHASER_GAP
    x = Math.min(stop, x + CHASER_SPEED * deltaFactor)
    chaserState = x >= stop ? 'shout' : 'enter'
  } else if (state.mode === 'runner') {
    // Keeps up with most of the scroll, so the player slowly leaves the cop behind.
    x += scroll * CHASER_KEEP_UP - scroll
    chaserState = 'chase'
  } else {
    const chasing = state.introMs - INTRO_RUN_AT_MS < CHASER_FREE_CHASE_MS
    x += (chasing ? CHASER_FREE_SPEED * deltaFactor : 0) - scroll
    chaserState = chasing ? 'chase' : 'giveup'
  }

  x = Math.min(x, closest)
  state.chaser = x < -160 ? null : { x, state: chaserState }
}

/**
 * Advances the game by the real time since the last frame, in fixed 60Hz ticks: 0, 1 or a few
 * per frame depending on the display. Front ends call this once per animation frame.
 */
export function advanceGame(state: GameState, input: HeldInput, elapsedMs: number): GameEvent[] {
  const events: GameEvent[] = []
  if (state.paused || state.gameOver) return events
  state.accumulatorMs += Math.min(MAX_CATCH_UP_MS, Math.max(0, elapsedMs))

  while (state.accumulatorMs >= TICK_MS) {
    if (input.left !== state.held.left || input.right !== state.held.right || input.down !== state.held.down) {
      state.held = { ...input }
      logEvent(state, { tick: state.tick, type: 'held', held: state.held })
    }
    state.accumulatorMs -= TICK_MS
    events.push(...stepGame(state, input, TICK_MS))
    state.tick += 1
    if (state.paused || state.gameOver) break
  }

  if (state.gameOver && state.log) {
    state.log.endTick = state.tick
    state.log.score = state.score
  }
  return events
}

/**
 * One step of the rules. advanceGame calls it with TICK_MS; tests may call it directly with
 * any deltaMs (physics is written in 60fps units scaled by deltaMs).
 */
export function stepGame(state: GameState, input: HeldInput, deltaMs: number): GameEvent[] {
  const events: GameEvent[] = []
  if (state.paused || state.gameOver) return events

  const { mode } = state
  const config = state.config
  const deltaFactor = deltaMs / FRAME_TIME

  state.jumpBufferMs = Math.max(0, state.jumpBufferMs - deltaMs)
  state.coyoteMs = Math.max(0, state.coyoteMs - deltaMs)
  state.skateMs = Math.max(0, state.skateMs - deltaMs)
  if (state.slamMs > 0) {
    state.slamMs = Math.max(0, state.slamMs - deltaMs)
    if (state.slamMs === 0) {
      // Back on the feet: a moment of blinking, and the knocked obstacles are gone.
      state.recoverMs = RECOVER_MS
      state.obstacles = state.obstacles.filter((obs) => !obs.knocked)
    }
  } else {
    state.recoverMs = Math.max(0, state.recoverMs - deltaMs)
  }
  state.lightningMs = Math.max(0, state.lightningMs - deltaMs)
  state.jumpBoostMs = Math.max(0, state.jumpBoostMs - deltaMs)
  state.dashMs = Math.max(0, state.dashMs - deltaMs)
  state.dashCooldownMs = Math.max(0, state.dashCooldownMs - deltaMs)
  state.phaseMs += deltaMs
  const introWasRunning = beforeRun(state)
  state.introMs += deltaMs
  const inIntro = beforeRun(state)

  // Each phase (opened by its checkpoint flag) lifts the speed ceiling.
  const phaseMaxSpeed = config.maxSpeed + RUNNER_TUNING.phaseSpeedBonus[state.phase - 1]

  if (!inIntro) state.speed = Math.min(phaseMaxSpeed, state.speed + deltaMs * RUNNER_TUNING.accelerationPerMs)
  const dashing = state.dashMs > 0
  const slamming = state.slamMs > 0
  const invincible = state.lightningMs > 0 || dashing || slamming || state.recoverMs > 0
  const speedBoost = state.skateMs > 0 || state.lightningMs > 0 ? SKATE_SPEED_MULTIPLIER : 1
  const effectiveSpeed = state.speed * speedBoost
  state.effectiveSpeed = effectiveSpeed
  const moveAxis = mode === 'free' && !inIntro && !slamming ? Number(input.right) - Number(input.left) : 0

  const previous = state.player
  let player = previous
  let wallContact: -1 | 0 | 1 = 0

  if (mode === 'free') {
    // Walk with a little acceleration, keep momentum in the air, and stop at buildings.
    let velocityX = previous.velocityX ?? 0
    const facing = moveAxis !== 0 ? (moveAxis as 1 | -1) : previous.facing ?? 1
    if (dashing) {
      velocityX = facing * FREE_TUNING.dashSpeed
    } else {
      const crouchFactor = previous.isDucking ? FREE_TUNING.crouchSpeedFactor : 1
      const topSpeed = FREE_TUNING.walkSpeed * speedBoost * crouchFactor
      const rate =
        moveAxis !== 0
          ? state.grounded ? FREE_TUNING.groundAcceleration : FREE_TUNING.airAcceleration
          : state.grounded ? FREE_TUNING.groundDeceleration : FREE_TUNING.airDeceleration
      velocityX = approach(velocityX, moveAxis * topSpeed, rate * deltaFactor)
    }

    const moved = moveAgainstBuildings(previous, velocityX * deltaFactor, state.obstacles)
    wallContact = moved.wallContact
    if (wallContact !== 0) velocityX = 0
    let x = previous.x + moved.dx
    if (x < FREE_TUNING.leftLimit) {
      x = FREE_TUNING.leftLimit
      velocityX = Math.max(0, velocityX)
    }
    player = { ...previous, x, velocityX, facing }
  }

  if (dashing) {
    // Air-hover during the dash: freeze vertical velocity and glide.
    player = { ...player, velocityY: 0, isDashing: true }
  } else {
    // Holding down mid-air cancels the rise and drops faster (Chrome dino).
    const fastFalling = input.down && !state.grounded && !state.wallCling
    if (fastFalling) player = { ...player, velocityY: Math.max(player.velocityY, FAST_FALL_MIN_VELOCITY) }
    player = updatePlayerPosition(player, config, deltaFactor, fastFalling ? FAST_FALL_GRAVITY : 1)
    if (player.isDashing) player = { ...player, isDashing: false }
  }

  // Variable jump height: once the button is released the rise is clipped, but never
  // below MIN_JUMP_HEIGHT, so a quick tap still clears a spray.
  if (state.jumpCutArmed) {
    if (player.velocityY >= 0) {
      state.jumpCutArmed = false
    } else if (!state.jumpHeld && state.jumpTakeoffY - player.y >= MIN_JUMP_HEIGHT) {
      player = { ...player, velocityY: player.velocityY * JUMP_CUT_MULTIPLIER }
      state.jumpCutArmed = false
    }
  }

  if (mode === 'runner') {
    // Offset from the base lane (a dash lunge, or where a wall left the player) eases back.
    state.dashLunge *= DASH_LUNGE_DECAY
    if (Math.abs(state.dashLunge) < 0.6) state.dashLunge = 0
    // After the intro the player eases back from where the tagging happened to the lane.
    if (!inIntro && state.introOffset > 0) {
      state.introOffset *= Math.pow(INTRO_OFFSET_DECAY, deltaFactor)
      if (state.introOffset < 0.5) state.introOffset = 0
    }
    // A gripped wall carries the player along as it scrolls, so there is time to wall-jump.
    const ridden = state.wallId === null ? undefined : state.obstacles.find((obs) => obs.id === state.wallId)
    player = { ...player, x: ridden ? ridden.x - player.width + 2 : BASE_X + state.dashLunge + state.introOffset }
  }

  let onPlatform = false
  for (const platform of state.obstacles) {
    if (platform.knocked || (platform.type !== 'floating-platform' && platform.type !== 'train' && platform.type !== 'building')) {
      continue
    }

    const dinoLeft = player.x + 6
    const dinoRight = player.x + player.width - 6
    const prevBottom = previous.y + previous.height
    const nextBottom = player.y + player.height
    const platformTop = platform.y
    const overlapsX = dinoRight > platform.x + 6 && dinoLeft < platform.x + platform.width - 6
    const fallingIntoTop = previous.velocityY >= 0 && prevBottom <= platformTop + 8 && nextBottom >= platformTop

    if (overlapsX && fallingIntoTop) {
      player = { ...player, y: platformTop - player.height, velocityY: 0, isJumping: false }
      onPlatform = true
      state.jumpsUsed = 0
      break
    }
  }

  // Wall-cling on building faces (phase 3 verticality). The runner grips the left face it
  // runs into; the free mode grips whichever face the player is pushing against.
  state.wallCling = false
  let touchingWall = false
  const airborne = player.y + player.height < config.groundLevel - 1
  if (!onPlatform && !dashing && mode === 'free') {
    if (airborne && wallContact !== 0 && moveAxis === wallContact) {
      touchingWall = true
      if (state.wallClingMs < WALL_CLING_MAX_MS) {
        state.wallCling = true
        state.wallSide = wallContact
        player = {
          ...player,
          velocityY: Math.min(player.velocityY, WALL_CLING_SLIDE),
          isJumping: true,
          isWallClinging: true,
        }
        state.jumpsUsed = 0
      }
    }
  } else if (!onPlatform && !dashing) {
    for (const wall of state.obstacles) {
      if (wall.type !== 'building' || wall.knocked) continue
      const dinoRight = player.x + player.width
      const dinoBottom = player.y + player.height
      const dinoTop = player.y
      const nearLeftFace = dinoRight >= wall.x - 4 && dinoRight <= wall.x + 24
      // Same tolerance as landing on the roof, so letting go of the wall near the top always
      // leaves the player close enough to land on it.
      const withinWallBand = dinoBottom > wall.y + ROOF_STEP_TOLERANCE && dinoTop < wall.y + wall.height - 4
      if (airborne && nearLeftFace && withinWallBand) {
        touchingWall = true
        if (state.wallClingMs < WALL_CLING_MAX_MS) {
          state.wallCling = true
          state.wallSide = 1
          state.wallId = wall.id
          player = {
            ...player,
            x: wall.x - player.width + 2,
            velocityY: Math.min(player.velocityY, WALL_CLING_SLIDE),
            isJumping: true,
            isWallClinging: true,
          }
          // Once the wall lets go (feet above the roof, or too long gripping), ease back to the lane.
          state.dashLunge = player.x - BASE_X
          state.jumpsUsed = 0
        }
        break
      }
    }
  }
  if (state.wallCling) {
    state.wallClingMs += deltaMs
  } else {
    state.wallId = null
    if (!touchingWall) state.wallClingMs = 0
    if (player.isWallClinging) player = { ...player, isWallClinging: false }
  }

  const onGround = onPlatform || player.y + player.height >= config.groundLevel - 1
  state.grounded = onGround
  if (!onGround && !player.isJumping) {
    // Walked off a roof or train: show the airborne pose instead of running in mid-air.
    player = { ...player, isJumping: true }
  }

  if (onGround) {
    state.coyoteMs = COYOTE_TIME_MS
    state.jumpsUsed = 0
    state.wallClingMs = 0
  }

  // Duck while the down key is held on solid ground (train roofs included), stand up
  // otherwise. The feet stay put, so ducking on a roof doesn't drop through it.
  const wantsDuck = input.down && onGround
  if (wantsDuck !== Boolean(player.isDucking)) {
    const height = wantsDuck ? DUCK_HEIGHT : config.playerSize
    const bottom = player.y + player.height
    player = { ...player, isDucking: wantsDuck, height, y: bottom - height }
  }

  // The run starts: the player notices the cop and hops off (skipped if the player jumped).
  if (introWasRunning && !inIntro && onGround && state.jumpBufferMs === 0) {
    player = launchJump(state, player, config.jumpPower * INTRO_HOP_POWER)
    state.jumpCutArmed = false
    state.jumpsUsed = 1
  }

  if (state.jumpBufferMs > 0 && state.coyoteMs > 0) {
    const jumpPowerMultiplier = state.jumpBoostMs > 0 ? JUMP_BOOST_MULTIPLIER : 1
    player = launchJump(state, player, config.jumpPower * jumpPowerMultiplier)
    state.jumpsUsed = 1
  }

  // How far the world moves this frame: constant in the runner; in the free mode the
  // camera only follows once the player walks past the camera line.
  let scroll = effectiveSpeed * deltaFactor * introRamp(state) * (slamming ? SLAM_SLOWDOWN : 1)
  if (mode === 'free') {
    const cameraX = state.worldWidth * FREE_TUNING.cameraLine
    scroll = Math.max(0, player.x - cameraX)
    if (scroll > 0) player = { ...player, x: cameraX }
  }

  // Grind combo while riding a train/building roof (Jet Set Radio). It only counts while
  // the world moves, so the free mode can't farm it by standing or pacing on a roof.
  if (onPlatform && scroll > 0) {
    state.grindTimerMs += deltaMs
    while (state.grindTimerMs >= GRIND_TICK_MS) {
      state.grindTimerMs -= GRIND_TICK_MS
      state.grindCombo += 1
      state.score += GRIND_TICK_SCORE * state.grindCombo
    }
  } else {
    state.grindTimerMs = 0
    if (onGround) state.grindCombo = 0
  }

  state.distance += scroll
  state.spawnDistance += scroll
  if (state.spawnDistance >= state.nextSpawnGap) {
    const climbPhase = state.climbCooldown === 0 ? dueClimb(state) : null
    const shouldSpawnPath =
      state.score >= 500 &&
      state.random() < 0.18 &&
      !state.obstacles.some((obs) => obs.type === 'floating-platform' || obs.type === 'train')

    const gap = getSpawnGap(state, effectiveSpeed)
    if (climbPhase) {
      // Nothing else spawns until the climb has scrolled in and there was time to drop from it.
      const climb = createClimb(state, climbPhase, mode === 'free' ? FREE_TUNING.walkSpeed : effectiveSpeed)
      state.obstacles = [...state.obstacles, ...climb.obstacles]
      const dropRoom = mode === 'runner' ? effectiveSpeed * CLIMB_DROP_FRAMES : 0
      state.nextSpawnGap = climb.length + dropRoom + gap
      state.climbCooldown = CLIMB_RETRY_SPAWNS
    } else if (shouldSpawnPath) {
      // Nothing else spawns until the whole train line has scrolled in.
      const path = createFloatingPath(state)
      const pathLength = path
        .filter((obs) => obs.type === 'train')
        .reduce((length, train) => length + train.width, 0)
      state.obstacles = [...state.obstacles, ...path]
      state.nextSpawnGap = pathLength + gap
      state.climbCooldown = Math.max(0, state.climbCooldown - 1)
    } else {
      const obstacle = createObstacle(state)
      if (mode === 'free' && obstacle.type === 'bird') {
        // Birds fly toward the player: spawn them further out so that, for someone walking
        // at full speed, they arrive spaced like any other obstacle.
        const cameraX = state.worldWidth * FREE_TUNING.cameraLine
        obstacle.x += ((obstacle.x - cameraX) * FREE_TUNING.birdDrift) / FREE_TUNING.walkSpeed
      }
      state.obstacles = [...state.obstacles, obstacle]
      state.nextSpawnGap = gap + spacingAfter(state, obstacle, effectiveSpeed)
      state.climbCooldown = Math.max(0, state.climbCooldown - 1)
    }
    state.spawnDistance = 0
  }

  updateChaser(state, player, scroll, deltaFactor)

  const birdDrift = mode === 'free' ? FREE_TUNING.birdDrift * deltaFactor : 0
  const beforeScroll = state.obstacles
  // (typed with `as` so TS doesn't narrow them to null: they're assigned inside the callback)
  let encounteredArtist = null as GraffitiArtist | null
  let reachedPhase = null as GamePhase | null
  state.obstacles = beforeScroll
    .map((obs) => ({
      ...obs,
      x: obs.x - scroll - (obs.type === 'bird' ? birdDrift : 0),
    }))
    .filter((obs) => obs.x + obs.width > -10)
    .flatMap((obs) => {
      if (obs.type === 'coin' && checkCollision(player, obs)) {
        state.score += COIN_SCORE
        state.coins += 1
        state.totalCoins += 1
        events.push({ type: 'coin' })
        return []
      }

      if (obs.type === 'graffiti-artist' && checkCollision(player, obs)) {
        if (obs.graffitiArtist && state.artistEncounterId === null) {
          state.artistEncounterId = obs.id
          encounteredArtist = obs.graffitiArtist
        }
        return []
      }

      if (obs.type === 'checkpoint' && !obs.reached && checkCollision(player, obs)) {
        reachedPhase = obs.phase ?? null
        return { ...obs, reached: true }
      }

      if (obs.type === 'power-lightning' && checkCollision(player, obs)) {
        state.lightningMs = LIGHTNING_DURATION_MS
        return []
      }

      if (obs.type === 'power-jump' && checkCollision(player, obs)) {
        state.jumpBoostMs = JUMP_BOOST_DURATION_MS
        return []
      }

      if (obs.type === 'skate' && checkCollision(player, obs)) {
        state.skateMs = SKATE_DURATION_MS
        return []
      }

      if (obs.type === 'trampoline' && checkCollision(player, obs)) {
        const nextPlatform = beforeScroll
          .filter(
            (candidate) =>
              (candidate.type === 'floating-platform' || candidate.type === 'train') &&
              candidate.x + candidate.width > player.x
          )
          .sort((a, b) => a.x - b.x)[0]
        const jumpBoostMultiplier = state.jumpBoostMs > 0 ? JUMP_BOOST_MULTIPLIER : 1
        const travelDistance = nextPlatform ? Math.max(0, nextPlatform.x - player.x) : 0
        const travelFrames = travelDistance > 0 ? travelDistance / Math.max(1, effectiveSpeed) : 0
        // The free mode has no scroll speed to aim with, so it always gets the full bounce.
        const trampolineMultiplier =
          mode === 'free'
            ? TRAMPOLINE_BOOST
            : nextPlatform
            ? Math.min(TRAMPOLINE_BOOST, Math.max(1, 1 + travelFrames / 220))
            : 1.04
        player = launchJump(state, player, config.jumpPower * trampolineMultiplier * jumpBoostMultiplier)
        state.jumpCutArmed = false // a bounce is not a button jump: releasing can't clip it
        state.jumpsUsed = 1
        return []
      }

      if (!obs.passed && obs.x + obs.width < player.x) {
        if (
          !obs.knocked &&
          obs.type !== 'skate' &&
          obs.type !== 'trampoline' &&
          obs.type !== 'floating-platform' &&
          obs.type !== 'train' &&
          obs.type !== 'checkpoint' &&
          obs.type !== 'wall' &&
          obs.type !== 'coin' &&
          obs.type !== 'power-lightning' &&
          obs.type !== 'power-jump'
        ) {
          state.score += OBSTACLE_PASSED_SCORE
        }
        return { ...obs, passed: true }
      }
      return obs
    })

  if (reachedPhase !== null && reachedPhase > state.phase) {
    state.phase = reachedPhase
    state.phaseMs = 0
    state.score += CHECKPOINT_BONUS
    state.checkpoint = {
      phase: reachedPhase,
      score: state.score,
      speed: state.speed,
      coins: state.coins,
      signatures: [...state.signatures],
    }
    events.push({ type: 'checkpoint', phase: reachedPhase })
  }

  // The camera follows the player up (quickly) and back down (a little slower), so the high
  // platforms stay on screen without the view jumping around on normal jumps.
  const cameraTarget = Math.max(0, state.worldHeight * CAMERA_TOP_MARGIN - player.y)
  const follow = cameraTarget > state.cameraY ? CAMERA_FOLLOW_UP : CAMERA_FOLLOW_DOWN
  state.cameraY += (cameraTarget - state.cameraY) * Math.min(1, follow * deltaFactor)
  if (Math.abs(cameraTarget - state.cameraY) < 0.5) state.cameraY = cameraTarget

  if (encounteredArtist) {
    // Pause right here; the front end shows the dialog and calls resumeGame afterwards.
    state.player = player
    state.paused = true
    events.push({ type: 'artist', artist: encounteredArtist })
    return events
  }

  // A building only kills when the player is embedded in its wall (rammed at
  // ground level), never when landing on the roof or gripping the face. In the free
  // mode buildings are solid walls instead, so they never kill.
  const embedded = (obs: Obstacle) => {
    if (mode !== 'runner' || obs.type !== 'building' || obs.knocked) return false
    const dLeft = player.x + 6
    const dRight = player.x + player.width - 6
    const dBottom = player.y + player.height
    return dRight > obs.x + 10 && dLeft < obs.x + obs.width - 6 && dBottom > obs.y + 44
  }
  const hits = invincible
    ? []
    : state.obstacles.filter((obs) => embedded(obs) || (isHazard(obs) && checkCollision(player, obs)))

  // With a skate the crash is a SLAM: the obstacles hit fly away, the player goes down for a
  // moment, gets up and blinks back in (RECOVER_MS). Without one, the run is over.
  let slammed = false
  if (hits.length > 0 && state.skateMs > 0) {
    slammed = true
    const knocked = new Set(hits.map((obs) => obs.id))
    state.obstacles = state.obstacles.map((obs) => (knocked.has(obs.id) ? { ...obs, knocked: true } : obs))
    state.skateMs = 0
    state.slamMs = SLAM_MS
    state.jumpBufferMs = 0
    player = {
      ...player,
      y: config.groundLevel - config.playerSize,
      velocityY: 0,
      velocityX: 0,
      isJumping: false,
      isDucking: false,
      isDashing: false,
      height: config.playerSize,
    }
    events.push({ type: 'slam' })
  }

  state.player = player

  const hasCollision = hits.length > 0 && !slammed

  if (hasCollision) {
    state.gameOver = true
    events.push({
      type: 'gameOver',
      score: state.score,
      checkpoint: state.checkpoint,
      phase: state.phase,
      coins: state.coins,
      distance: Math.round(state.distance * METERS_PER_PX),
    })
  }

  return events
}

export function getView(state: GameState): GameView {
  return {
    player: state.player,
    obstacles: state.obstacles,
    score: state.score,
    coins: state.coins,
    totalCoins: state.totalCoins,
    signatures: state.signatures,
    phase: state.phase,
    phaseMs: state.phaseMs,
    cameraY: state.cameraY,
    introStage: !beforeRun(state) ? null : state.introMs < INTRO_TAG_MS ? 'tag' : 'alert',
    tagProgress: state.intro ? Math.min(1, state.introMs / INTRO_TAG_MS) : 1,
    chaser: state.chaser,
    speed: state.effectiveSpeed,
    skateMs: state.skateMs,
    slamProgress: state.slamMs > 0 ? 1 - state.slamMs / SLAM_MS : null,
    recovering: state.recoverMs > 0,
    distance: Math.round(state.distance * METERS_PER_PX),
    lightningMs: state.lightningMs,
    jumpBoostMs: state.jumpBoostMs,
    dashing: state.dashMs > 0,
    dashCooldownMs: state.dashCooldownMs,
    grindCombo: state.grindCombo,
    wallClingSide: state.wallCling ? state.wallSide : 0,
  }
}
