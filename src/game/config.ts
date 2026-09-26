import type { GameConfig } from '../types/game'
import { RUNNER_TUNING } from '../data/gameModes'

// Shared rules of the game. Mode-specific tuning (speeds, gaps, walking) lives in
// src/data/gameModes.ts.

export const BASE_CONFIG: Omit<GameConfig, 'groundLevel'> = {
  playerSize: 100,
  // Jump arc tuned with a frame-by-frame replay of the game loop: a full jump clears a spray
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

/** Physics runs in 60fps units; deltaMs / FRAME_TIME scales each step to the real frame time. */
export const FRAME_TIME = 1000 / 60
/** The floor starts at 76% of the world height (matches the 24% ground strip of the web view). */
export const GROUND_RATIO = 0.76

// Smaller screens get a scaled-down world with at least this much room (in game pixels),
// so there is time to see what's coming.
export const MIN_WORLD_WIDTH = 820
export const MIN_WORLD_HEIGHT = 560

export const BASE_X = 72
export const JUMP_BUFFER_MS = 130
export const COYOTE_TIME_MS = 90
export const SKATE_DURATION_MS = 15000
export const SKATE_SPEED_MULTIPLIER = 1.28
export const SKATE_FLICKER_MS = 420
export const LIGHTNING_DURATION_MS = 3000
export const JUMP_BOOST_DURATION_MS = 4500
export const JUMP_BOOST_MULTIPLIER = 1.2
export const DUCK_HEIGHT = 80
export const BIRD_ALTITUDE = 104 // bird top above the ground: duck under it or jump over it
export const TRAMPOLINE_BOOST = 1.12
export const COIN_SCORE = 25
export const OBSTACLE_PASSED_SCORE = 100
export const GRAFFITI_SIGNATURE_SCORE = 150
export const POWERUP_SIZE = 84
export const TRAIN_PLATFORM_WIDTH = 240
export const TRAIN_PLATFORM_HEIGHT = 80
// Runner: extra frames of room after obstacles that keep the player in the air longer than a
// normal jump (a wall-jump over a building, a trampoline bounce).
export const BUILDING_EXTRA_AIRTIME_FRAMES = 40
export const TRAMPOLINE_EXTRA_AIRTIME_FRAMES = 30

// --- Phase system (Fase 1 Rua / Fase 2 Metrô / Fase 3 Telhados) ---
export const PHASE_2_SCORE = 1200
export const PHASE_3_SCORE = 3500

// --- Variable jump height (Mario) ---
export const JUMP_CUT_MULTIPLIER = 0.6 // velocity kept when the jump button is released mid-rise
export const MIN_JUMP_HEIGHT = 115 // a quick tap still rises this much, enough to clear a spray

// --- Fast fall (Chrome dino): holding down mid-air drops quicker ---
export const FAST_FALL_GRAVITY = 2.5
export const FAST_FALL_MIN_VELOCITY = 3

// --- Dash / esquiva (Hollow Knight / Subway roll) ---
export const DASH_DURATION_MS = 190
export const DASH_COOLDOWN_MS = 780
export const DASH_LUNGE = 96 // forward pixels of the lunge
export const DASH_LUNGE_DECAY = 0.8

// --- Grind combo (Jet Set Radio) ---
export const GRIND_TICK_MS = 260
export const GRIND_TICK_SCORE = 12

// --- Wall-jump / verticality (Hollow Knight) ---
export const WALL_CLING_SLIDE = 1.1 // gentle downward slide while gripping a wall
export const WALL_JUMP_POWER_MULT = 1.16
export const WALL_CLING_MAX_MS = 520
export const BUILDING_WIDTH = 78
export const WALL_CONTACT_INSET_X = 14
export const ROOF_STEP_TOLERANCE = 8 // matches the platform landing tolerance
