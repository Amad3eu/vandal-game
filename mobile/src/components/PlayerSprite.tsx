import { useRef } from 'react'
import { Image, View } from 'react-native'
import type { DinosaurState } from '../shared'
import { DUCK_FRAMES, JUMP_FRAMES, RUN_FRAMES } from '../sprites'

interface PlayerSpriteProps {
  player: DinosaurState
  /** Milliseconds of play so far; drives the frame animations. */
  clock: number
  moving: boolean
  facing: 1 | -1
  wallCling: boolean
  dashing: boolean
}

const DASH_TRAILS = [
  { offset: 16, scale: 0.9, opacity: 0.55 },
  { offset: 34, scale: 0.8, opacity: 0.35 },
  { offset: 54, scale: 0.7, opacity: 0.18 },
]

// Same geometry as the web's Dinosaur.css: the sprite is 120% of the hit box (170% when
// ducking), centered and standing on the box bottom, drawn 8px lower while running on a floor.
export default function PlayerSprite({ player, clock, moving, facing, wallCling, dashing }: PlayerSpriteProps) {
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

  const transform: ({ rotate: string } | { scaleX: number })[] = []
  if (jumping && !wallCling) transform.push({ rotate: '-5deg' })
  if (facing === -1) transform.push({ scaleX: -1 })
  if (wallCling) transform.push({ rotate: '-4deg' })

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
        style={{ position: 'absolute', left, top, width: size, height: size, transform, transformOrigin: 'bottom' }}
      />
    </>
  )
}
