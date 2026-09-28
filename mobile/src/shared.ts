// Game rules, tuning and data come straight from the web project (../src), unchanged.
// Metro is allowed to read that folder in metro.config.js.
export * from '../../src/game/engine'
export { GAME_MODES, GAME_MODE_ORDER, RUNNER_TUNING, TOUCH_BUTTON_LABELS } from '../../src/data/gameModes'
export { ARTIST_INFO } from '../../src/data/graffitiArtists'
export { CHECKPOINT_TIP, CONTINUES_PER_CHECKPOINT, PHASES, checkpointKey } from '../../src/data/phases'
export { LOCAL_BOARD_KEY, addLocalScore, localTop, parseLocalBoard, type LocalScore } from '../../src/data/scoreBoard'
export { ARTIST_SIGNATURES } from '../../src/data/artistSignatures'
export { SLAM_MS } from '../../src/game/config'
export { SLAM_FIRE_SHARE, SLAM_SHAKE_UNTIL, SLAM_STICKER_UNTIL, slamPose } from '../../src/data/slam'
export {
  ROUTE_BOX,
  ROUTE_POINTS,
  ROUTE_STOPS,
  flagDue,
  formatDistance,
  pointAt,
  pointsToString,
  routeProgress,
  splitRoute,
} from '../../src/data/routeMap'
export type { Chaser, RunLog } from '../../src/game/engine'
export type {
  Checkpoint,
  DinosaurState,
  GameAction,
  GameMode,
  GraffitiArt,
  GraffitiArtist,
  HeldInput,
  Obstacle,
} from '../../src/types/game'
