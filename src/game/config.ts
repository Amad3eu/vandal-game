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
/**
 * advanceGame simulates in fixed 60Hz ticks whatever the display's refresh rate, so a jump is
 * the same on a 30, 60, 120 or 144Hz screen (with the frame time as the step, 120Hz players
 * jumped ~2% higher) and a run can be replayed tick by tick.
 */
export const TICK_MS = FRAME_TIME
/** After a hiccup (tab switch, slow phone) at most this much time is caught up at once. */
export const MAX_CATCH_UP_MS = 100
/** Rules version, saved in run logs: bump it when a change alters how a run plays out. */
export const ENGINE_VERSION = 1
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
// From these scores a climb of floating platforms shows up with a checkpoint flag on top.
// Grabbing the flag opens the phase, and a game over can continue from there.
export const PHASE_2_SCORE = 1200
export const PHASE_3_SCORE = 3500
export const CHECKPOINT_BONUS = 250
/** A missed climb comes back after this many other obstacles. */
export const CLIMB_RETRY_SPAWNS = 5
/** Steps up to the flag: the climb to the rooftops (phase 3) is one step higher. */
export const CLIMB_STEPS: Record<2 | 3, number> = { 2: 4, 3: 5 }
export const CLIMB_FIRST_STEP = 88 // first step's top above the ground (as high as a train)
export const CLIMB_STEP_RISE = 80
// Step sizes in frames of running, turned into pixels with the speed when the climb shows up:
// a jump covers more ground when faster, so fixed widths would leave almost no time to jump
// from the higher steps. At the starting speed (6) a step is 288px wide with a 60px gap.
export const CLIMB_STEP_FRAMES = 48
export const CLIMB_GAP_FRAMES = 10
export const CLIMB_TOP_FRAMES = 58
export const CLIMB_PLATFORM_THICKNESS = 22
export const CHECKPOINT_FLAG_WIDTH = 56
export const CHECKPOINT_FLAG_HEIGHT = 130
/** Runner: frames of room after the climb to drop from the top and land. */
export const CLIMB_DROP_FRAMES = 50

// --- Intro (Subway Surfers style): the player tags a wall until a cop shows up, hops and runs ---
export const INTRO_TAG_MS = 1500 // spraying the tag on the wall
export const INTRO_RUN_AT_MS = 2000 // the player notices the cop, hops and the run starts
export const INTRO_RAMP_MS = 700 // the scroll speeds up from 0 to the run speed
export const INTRO_PLAYER_OFFSET = 200 // the player starts further right so the cop fits behind
export const INTRO_OFFSET_DECAY = 0.97 // per frame after the start, back to the runner's lane
export const INTRO_HOP_POWER = 0.7 // the startled hop, as a fraction of a full jump
export const INTRO_WALL_WIDTH = 264
export const INTRO_WALL_HEIGHT = 150
export const CHASER_ENTER_MS = 800 // the cop runs in from the left edge
export const CHASER_SPEED = 7 // px per frame while running in
export const CHASER_GAP = 190 // where the cop stops to shout, behind the player
export const CHASER_MIN_GAP = 120 // the cop never gets closer than this (no catching mid-run)
export const CHASER_KEEP_UP = 0.86 // runner: fraction of the scroll the cop keeps up with
export const CHASER_FREE_SPEED = 4.2 // free mode: slower than walking...
export const CHASER_FREE_CHASE_MS = 2600 // ...and gives up after this
/** Continuing from a checkpoint: the player lands from this high instead of the intro. */
export const CHECKPOINT_DROP_HEIGHT = 240

// --- Vertical camera: follows the player up so the high platforms stay on screen ---
export const CAMERA_TOP_MARGIN = 0.26 // keeps the player's head below this fraction of the height (clear of the HUD)
export const CAMERA_FOLLOW_UP = 0.2
export const CAMERA_FOLLOW_DOWN = 0.14

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
