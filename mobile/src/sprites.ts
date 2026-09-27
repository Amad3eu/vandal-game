import type { ImageSourcePropType } from 'react-native'

// Pixel-art sprites, upscaled 4x by scripts/build-sprites.py so they stay crisp on screen.
const walk = [
  require('../assets/sprites/walk/1.png'),
  require('../assets/sprites/walk/2.png'),
  require('../assets/sprites/walk/3.png'),
  require('../assets/sprites/walk/4.png'),
]

// Same cycle as the web version: 1 2 3 4 3 2.
export const RUN_FRAMES: ImageSourcePropType[] = [walk[0], walk[1], walk[2], walk[3], walk[2], walk[1]]

export const JUMP_FRAMES: ImageSourcePropType[] = [
  require('../assets/sprites/jump/1.png'),
  require('../assets/sprites/jump/2.png'),
  require('../assets/sprites/jump/3.png'),
  require('../assets/sprites/jump/4.png'),
  require('../assets/sprites/jump/5.png'),
  require('../assets/sprites/jump/6.png'),
  require('../assets/sprites/jump/7.png'),
]

export const DUCK_FRAMES: ImageSourcePropType[] = [
  require('../assets/sprites/duck/1.png'),
  require('../assets/sprites/duck/2.png'),
  require('../assets/sprites/duck/3.png'),
  require('../assets/sprites/duck/4.png'),
  require('../assets/sprites/duck/5.png'),
  require('../assets/sprites/duck/6.png'),
  require('../assets/sprites/duck/7.png'),
  require('../assets/sprites/duck/8.png'),
  require('../assets/sprites/duck/9.png'),
]

export const SPRAY_FRAMES: ImageSourcePropType[] = [
  require('../assets/sprites/spray/1.png'),
  require('../assets/sprites/spray/2.png'),
  require('../assets/sprites/spray/3.png'),
  require('../assets/sprites/spray/4.png'),
  require('../assets/sprites/spray/5.png'),
  require('../assets/sprites/spray/6.png'),
  require('../assets/sprites/spray/7.png'),
]

export const TRAIN_FRAMES: ImageSourcePropType[] = [
  require('../assets/sprites/train/1.png'),
  require('../assets/sprites/train/2.png'),
  require('../assets/sprites/train/3.png'),
  require('../assets/sprites/train/4.png'),
  require('../assets/sprites/train/5.png'),
  require('../assets/sprites/train/6.png'),
]

// The intro's cop and the wall being tagged.
export const COP_RUN_FRAMES: ImageSourcePropType[] = [
  require('../assets/sprites/cop/cop-run-1.png'),
  require('../assets/sprites/cop/cop-run-2.png'),
  require('../assets/sprites/cop/cop-run-3.png'),
  require('../assets/sprites/cop/cop-run-4.png'),
]
export const COP_SHOUT: ImageSourcePropType = require('../assets/sprites/cop/cop-shout.png')
export const COP_CATCH: ImageSourcePropType = require('../assets/sprites/cop/cop-catch.png')
export const INTRO_WALL: ImageSourcePropType = require('../assets/sprites/intro/wall.png')
export const INTRO_TAG: ImageSourcePropType = require('../assets/sprites/intro/tag.png')

export const POWER_JUMP: ImageSourcePropType = require('../assets/sprites/powerups/jump.png')
export const POWER_LIGHTNING: ImageSourcePropType = require('../assets/sprites/powerups/lightning.png')

// Backgrounds and music are big enough to use from the web project directly.
export const DAY_BACKGROUND: ImageSourcePropType = require('../../src/assets/background/9.png')
export const NIGHT_BACKGROUND: ImageSourcePropType = require('../../src/assets/background/7.png')
export const SOUNDTRACK = require('../../src/assets/soundtrack/SonoTWS - Tired Of People Act II - SonoTWS (youtube).mp3')
