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
  graffitiArtist?: GraffitiArtist
  /** Building height variation, so tall walls can differ. */
  passed: boolean
}

export type GamePhase = 1 | 2 | 3

/** 'runner' = estilo dino do Google (o cenário vem até você); 'free' = andar livre com WASD. */
export type GameMode = 'runner' | 'free'

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
