import { useRef } from 'react'
import { Image, View } from 'react-native'
import { slamPose, type DinosaurState } from '../shared'
import { DUCK_FRAMES, JUMP_FRAMES, RUN_FRAMES } from '../sprites'

interface PlayerSpriteProps {
  player: DinosaurState
  /** Milliseconds of play so far; drives the frame animations. */
  clock: number
  moving: boolean
  facing: 1 | -1
  wallCling: boolean
  dashing: boolean
  /** Riding a skate pickup: the board shows under the feet. */
  hasSkate: boolean
  /** 0 → 1 while down after a skate SLAM, or null. */
  slamProgress: number | null
  /** Blinking after a skate SLAM (can't be hurt). */
  recovering: boolean
}

const DASH_TRAILS = [
  { offset: 16, scale: 0.9, opacity: 0.55 },
  { offset: 34, scale: 0.8, opacity: 0.35 },
  { offset: 54, scale: 0.7, opacity: 0.18 },
]

// Same geometry as the web's Dinosaur.css: the sprite is 120% of the hit box (170% when
// ducking), centered and standing on the box bottom, drawn 8px lower while running on a floor.
export default function PlayerSprite({ player, clock, moving, facing, wallCling, dashing, hasSkate, slamProgress, recovering }: PlayerSpriteProps) {
  const ducking = Boolean(player.isDucking)
  const jumping = Boolean(player.isJumping)
  const pose = ducking ? 'duck' : jumping ? 'jump' : moving ? 'run' : 'idle'

  // Each pose starts on its first frame, like the web's per-pose timers.
  const poseStart = useRef({ pose, at: clock })
  if (poseStart.current.pose !== pose) poseStart.current = { pose, at: clock }
  const elapsed = clock - poseStart.current.at
  const frames = pose === 'duck' ? DUCK_FRAMES : pose === 'jump' ? JUMP_FRAMES : RUN_FRAMES
  const frameMs = pose === 'jump' ? 70 : 90
  const frame = pose === 'idle' ? frames[0] : frames[Math.floor(elapsed / frameMs) % frames.length]

  const grounded = !jumping && !ducking
  const boxTop = player.y + (grounded ? 8 : 0)
  const size = ducking ? 136 : player.height * 1.2
  const left = player.x + player.width / 2 - size / 2
  const top = boxTop + player.height - size

  const transform: ({ rotate: string } | { scaleX: number } | { translateY: number })[] = []
  // The skate SLAM turns the whole body around the hit box center (see src/data/slam.ts).
  let transformOrigin: string | number[] = 'bottom'
  if (slamProgress !== null) {
    const { rotate, drop } = slamPose(slamProgress)
    transform.push({ translateY: drop * player.height }, { rotate: `${rotate}deg` })
    transformOrigin = [size / 2, size - player.height / 2, 0]
  }
  if (jumping && !wallCling) transform.push({ rotate: '-5deg' })
  if (facing === -1) transform.push({ scaleX: -1 })
  if (wallCling) transform.push({ rotate: '-4deg' })
  // Back on the feet after a SLAM: blinking see-through (like the web's steps() animation).
  const opacity = recovering && Math.floor(clock / 90) % 2 === 1 ? 0.3 : 1

  return (
    <>
      {dashing &&
        DASH_TRAILS.map((trail) => (
          <View
            key={trail.offset}
            style={{
              position: 'absolute',
              left: player.x + 8 - trail.offset * facing,
              top: boxTop + player.height * 0.12,
              width: 84 * trail.scale,
              height: player.height * 0.76,
              borderRadius: 18,
              backgroundColor: 'rgba(80, 220, 255, 0.55)',
              opacity: trail.opacity,
            }}
          />
        ))}
      <Image
        testID="player"
        source={frame}
        fadeDuration={0}
        resizeMode="contain"
        style={{ position: 'absolute', left, top, width: size, height: size, opacity, transform, transformOrigin }}
      />
      {hasSkate && (
        // Same box as the web's .player-skate: 86% of the hit box wide, just under the feet.
        <View style={{ position: 'absolute', left: player.x + player.width * 0.07, top: boxTop + player.height * 0.82, width: player.width * 0.86, height: player.height * 0.22, opacity }}>
          <View style={{ height: '50%', borderRadius: 999, borderWidth: 2, borderColor: '#272727', backgroundColor: '#fd9022' }} />
          <View style={[skateWheel, { left: '15%', width: player.width * 0.86 * 0.17, height: player.width * 0.86 * 0.17 }]} />
          <View style={[skateWheel, { right: '15%', width: player.width * 0.86 * 0.17, height: player.width * 0.86 * 0.17 }]} />
        </View>
      )}
    </>
  )
}

const skateWheel = { position: 'absolute', top: '52%', borderRadius: 999, backgroundColor: '#1f1f1f' } as const
