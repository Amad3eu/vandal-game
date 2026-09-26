// Game rules, tuning and data come straight from the web project (../src), unchanged.
// Metro is allowed to read that folder in metro.config.js.
export * from '../../src/game/engine'
export { GAME_MODES, GAME_MODE_ORDER, RUNNER_TUNING, TOUCH_BUTTON_LABELS } from '../../src/data/gameModes'
export { ARTIST_INFO } from '../../src/data/graffitiArtists'
export { ARTIST_SIGNATURES } from '../../src/data/artistSignatures'
export type {
  DinosaurState,
  GameAction,
  GameMode,
  GraffitiArt,
  GraffitiArtist,
  HeldInput,
  Obstacle,
} from '../../src/types/game'
