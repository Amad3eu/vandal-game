import { Image, StyleSheet, View } from 'react-native'
import type { GameView } from '../shared'
import { DAY_BACKGROUND, NIGHT_BACKGROUND } from '../sprites'
import { COLORS } from '../theme'
import ObstacleSprite from './ObstacleSprite'
import PlayerSprite from './PlayerSprite'

const BACKGROUND_TRANSITION_START = 900
const BACKGROUND_TRANSITION_END = 1700

interface WorldProps {
  view: GameView
  clock: number
  /** World size in game pixels and the scale that fits it on screen (see fitWorld). */
  width: number
  height: number
  scale: number
  groundLevel: number
  facing: 1 | -1
  moving: boolean
}

export default function World({ view, clock, width, height, scale, groundLevel, facing, moving }: WorldProps) {
  const night = view.phase >= 2
  const blend = Math.min(
    1,
    Math.max(0, (view.score - BACKGROUND_TRANSITION_START) / (BACKGROUND_TRANSITION_END - BACKGROUND_TRANSITION_START))
  )

  return (
    <View
      pointerEvents="none"
      style={[styles.world, { width, height, transform: [{ scale }] }]}
    >
      {/* Explicit size: without it a bundled image keeps its own 2304x1296 size instead of covering. */}
      <Image source={DAY_BACKGROUND} resizeMode="cover" style={[styles.background, { width, height, opacity: 1 - blend }]} />
      <Image source={NIGHT_BACKGROUND} resizeMode="cover" style={[styles.background, { width, height, opacity: blend }]} />
      <View
        style={[
          styles.ground,
          {
            top: groundLevel,
            backgroundColor: night ? COLORS.groundNight : COLORS.ground,
            borderTopColor: night ? COLORS.groundEdgeNight : COLORS.groundEdge,
          },
        ]}
      />
      {view.obstacles.map((obstacle) => (
        <ObstacleSprite key={obstacle.id} obstacle={obstacle} clock={clock} />
      ))}
      <PlayerSprite
        player={view.player}
        clock={clock}
        moving={moving}
        facing={facing}
        wallCling={view.wallClingSide !== 0}
        dashing={view.dashing}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  world: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    transformOrigin: 'top left',
  },
  background: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 6,
  },
})
