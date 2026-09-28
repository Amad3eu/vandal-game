export type GraffitiArtist = 'remo' | 'pixo' | 'nina'

export type ArtworkType = 'artist-signature' | 'my-signature'

export interface GraffitiArt {
  id: string
  artist: GraffitiArtist
  type: ArtworkType // 'artist-signature' = assinatura coletada, 'my-signature' = minha assinatura
  imageData: string // base64 encoded drawing or signature
  timestamp: number
}

export interface GraffitiArtistInfo {
  name: string
  color: string
  description: string
}

export interface Obstacle {
  id: number
  x: number
  y: number
  width: number
  height: number
  type:
    | 'cactus'
    | 'bird'
    | 'spray'
    | 'skate'
    | 'duck-bar'
    | 'train'
    | 'floating-platform'
    | 'trampoline'
    | 'coin'
    | 'power-lightning'
    | 'power-jump'
    | 'graffiti-artist'
    | 'building'
    | 'checkpoint'
    | 'wall'
  graffitiArtist?: GraffitiArtist
  /** Checkpoint flag: the phase it opens. */
  phase?: GamePhase
  /** Checkpoint flag already grabbed (it stays up, raised). */
  reached?: boolean
  /** Knocked away by a skate SLAM: no longer hurts or holds anything, flies off. */
  knocked?: boolean
  passed: boolean
}

export type GamePhase = 1 | 2 | 3

/** Saved when a checkpoint flag is grabbed; a new run can continue from it. */
export interface Checkpoint {
  phase: GamePhase
  score: number
  /** Scroll speed at the flag, so the continued run isn't slower than where it stopped. */
  speed: number
  coins: number
  signatures: GraffitiArtist[]
}

/** 'runner' = estilo dino do Google (o cenário vem até você); 'free' = andar livre com WASD. */
export type GameMode = 'runner' | 'free'

/**
 * Platform-agnostic player actions. Keyboard, mouse, touch and on-screen buttons all map to
 * these, so another front end (e.g. a React Native app) only needs to call press/release.
 */
export type GameAction = 'left' | 'right' | 'down' | 'jump' | 'dash'

/** Directions the game loop polls every frame while they are held. */
export interface HeldInput {
  left: boolean
  right: boolean
  down: boolean
}

export interface PhaseInfo {
  id: GamePhase
  name: string
  minScore: number
}

export interface DinosaurState {
  x: number
  y: number
  velocityY: number
  isJumping: boolean
  isDucking?: boolean
  isDashing?: boolean
  isWallClinging?: boolean
  /** Horizontal speed (px/frame); only the free mode moves the player sideways. */
  velocityX?: number
  facing?: 1 | -1
  width: number
  height: number
}

export interface GameConfig {
  playerSize: number
  groundLevel: number
  jumpPower: number
  gravity: number
  /** Gravity multipliers while rising / falling (lower = floatier arc). */
  riseGravityScale: number
  fallGravityScale: number
  obstacleWidth: number
  obstacleHeight: number
  initialSpeed: number
  maxSpeed: number
  scrollSpeed: number
}
