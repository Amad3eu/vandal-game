import type { ReactNode } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { SLAM_MS, SLAM_SHAKE_UNTIL, type GameView, type Obstacle } from '../shared'
import { DAY_BACKGROUND, NIGHT_BACKGROUND } from '../sprites'
import { COLORS, FONTS, UI } from '../theme'
import ChaserSprite, { CaughtCop } from './ChaserSprite'
import ObstacleSprite from './ObstacleSprite'
import PlayerSprite from './PlayerSprite'
import SlamEffect from './SlamEffect'

/** Night falls over this long after the phase 2 checkpoint (the web uses a CSS transition). */
const NIGHT_FADE_MS = 1200

/** The street shaking on a skate SLAM (the web's slamShake keyframes, 0.3s). */
const SHAKE: [number, number][] = [[0, 0], [-5, 3], [4, -2], [-3, 1], [0, 0]]
function shakeAt(ms: number): [number, number] {
  const at = Math.min(1, ms / 300) * (SHAKE.length - 1)
  const i = Math.min(SHAKE.length - 2, Math.floor(at))
  const t = at - i
  return [SHAKE[i][0] + (SHAKE[i + 1][0] - SHAKE[i][0]) * t, SHAKE[i][1] + (SHAKE[i + 1][1] - SHAKE[i][1]) * t]
}

/** Obstacles knocked by a SLAM fly off spinning (the web's knockedAway keyframes, 0.75s). */
function Knocked({ obstacle, elapsedMs, children }: { obstacle: Obstacle; elapsedMs: number; children: ReactNode }) {
  const t = Math.min(1, elapsedMs / 750)
  const u = 1 - (1 - t) * (1 - t)
  return (
    <View
      style={{
        position: 'absolute',
        left: obstacle.x,
        top: obstacle.y,
        width: obstacle.width,
        height: obstacle.height,
        opacity: 1 - u,
        transform: [{ translateX: 160 * u }, { translateY: -260 * u }, { rotate: `${540 * u}deg` }, { scale: 1 - 0.4 * u }],
      }}
    >
      {children}
    </View>
  )
}

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
  const slamMs = view.slamProgress === null ? null : view.slamProgress * SLAM_MS
  const [shakeX, shakeY] = view.slamProgress !== null && view.slamProgress < SLAM_SHAKE_UNTIL ? shakeAt(slamMs ?? 0) : [0, 0]

  return (
    <View
      pointerEvents="none"
      style={[styles.world, { width, height, transform: [{ scale }] }]}
    >
      {/* Explicit size: without it a bundled image keeps its own 2304x1296 size instead of covering. */}
      <Image source={DAY_BACKGROUND} resizeMode="cover" style={[styles.background, { width, height, opacity: 1 - blend }]} />
      <Image source={NIGHT_BACKGROUND} resizeMode="cover" style={[styles.background, { width, height, opacity: blend }]} />
      {/* Floor, obstacles and player move down together when the camera follows the player up. */}
      <View style={[styles.scene, { width, height, transform: [{ translateX: shakeX }, { translateY: view.cameraY + shakeY }] }]}>
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
        {view.obstacles.map((obstacle) =>
          obstacle.knocked ? (
            <Knocked key={obstacle.id} obstacle={obstacle} elapsedMs={slamMs ?? 750}>
              <ObstacleSprite obstacle={{ ...obstacle, x: 0, y: 0 }} clock={clock} tagProgress={view.tagProgress} />
            </Knocked>
          ) : (
            <ObstacleSprite key={obstacle.id} obstacle={obstacle} clock={clock} tagProgress={view.tagProgress} />
          )
        )}
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
          hasSkate={view.skateMs > 0}
          slamProgress={view.slamProgress}
          recovering={view.recovering}
        />
        {view.slamProgress !== null && (
          <SlamEffect progress={view.slamProgress} x={player.x} y={player.y} width={player.width} height={player.height} />
        )}
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
