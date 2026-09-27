import { Image, StyleSheet, Text, View } from 'react-native'
import type { GameView } from '../shared'
import { DAY_BACKGROUND, NIGHT_BACKGROUND } from '../sprites'
import { COLORS, FONTS, UI } from '../theme'
import ChaserSprite, { CaughtCop } from './ChaserSprite'
import ObstacleSprite from './ObstacleSprite'
import PlayerSprite from './PlayerSprite'

/** Night falls over this long after the phase 2 checkpoint (the web uses a CSS transition). */
const NIGHT_FADE_MS = 1200

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
  /** Game over: how far the cop's grab has gone (0..1), or null while playing. */
  caughtProgress: number | null
}

export default function World({ view, clock, width, height, scale, groundLevel, facing, moving, caughtProgress }: WorldProps) {
  const { player } = view
  const night = view.phase >= 2
  const blend = view.phase === 2 ? Math.min(1, view.phaseMs / NIGHT_FADE_MS) : night ? 1 : 0

  return (
    <View
      pointerEvents="none"
      style={[styles.world, { width, height, transform: [{ scale }] }]}
    >
      {/* Explicit size: without it a bundled image keeps its own 2304x1296 size instead of covering. */}
      <Image source={DAY_BACKGROUND} resizeMode="cover" style={[styles.background, { width, height, opacity: 1 - blend }]} />
      <Image source={NIGHT_BACKGROUND} resizeMode="cover" style={[styles.background, { width, height, opacity: blend }]} />
      {/* Floor, obstacles and player move down together when the camera follows the player up. */}
      <View style={[styles.scene, { width, height, transform: [{ translateY: view.cameraY }] }]}>
        <View
          style={[
            styles.ground,
            {
              top: groundLevel,
              height: height - groundLevel,
              backgroundColor: night ? COLORS.groundNight : COLORS.ground,
              borderTopColor: night ? COLORS.groundEdgeNight : COLORS.groundEdge,
            },
          ]}
        />
        {view.obstacles.map((obstacle) => (
          <ObstacleSprite key={obstacle.id} obstacle={obstacle} clock={clock} tagProgress={view.tagProgress} />
        ))}
        {view.chaser && caughtProgress === null && <ChaserSprite chaser={view.chaser} groundLevel={groundLevel} clock={clock} />}
        {caughtProgress !== null && <CaughtCop playerX={player.x} groundLevel={groundLevel} progress={caughtProgress} />}
        {view.introStage === 'tag' && (
          // Spray coming out of the can while the player tags the wall.
          <View style={[styles.mist, { left: player.x + 84 + (Math.floor(clock / 125) % 2) * 4, top: player.y + 40 }]}>
            <View style={[styles.mistDot, { left: 0, top: 10, backgroundColor: '#ff4d9d' }]} />
            <View style={[styles.mistDot, { left: 14, top: 2, backgroundColor: '#ff4d9d', opacity: 0.7 }]} />
            <View style={[styles.mistDot, { left: 18, top: 18, backgroundColor: '#ffd23f' }]} />
            <View style={[styles.mistDot, { left: 30, top: 8, backgroundColor: '#ff4d9d', opacity: 0.5 }]} />
          </View>
        )}
        {view.introStage === 'alert' && (
          <View style={[styles.alert, { left: player.x + 40, top: player.y - 44 }]}>
            <Text style={styles.alertText}>!</Text>
          </View>
        )}
        <PlayerSprite
          player={view.player}
          clock={clock}
          moving={moving}
          facing={facing}
          wallCling={view.wallClingSide !== 0}
          dashing={view.dashing}
        />
      </View>
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
  scene: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 6,
  },
  mist: {
    position: 'absolute',
    width: 46,
    height: 36,
  },
  mistDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alert: {
    position: 'absolute',
    width: 34,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#140f1f',
    backgroundColor: '#ffd23f',
  },
  alertText: {
    color: UI.ink,
    fontFamily: FONTS.display,
    fontSize: 22,
  },
})
