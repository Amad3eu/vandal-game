import { Image, View } from 'react-native'
import Svg, { Polygon, Text as SvgText } from 'react-native-svg'
import { SLAM_FIRE_SHARE, SLAM_MS, SLAM_STICKER_UNTIL } from '../shared'
import { FIRE_FRAMES } from '../sprites'
import { FONTS, UI } from '../theme'

interface SlamEffectProps {
  /** 0 → 1 over the SLAM (see GameView.slamProgress). */
  progress: number
  /** Player box, in game pixels. */
  x: number
  y: number
  width: number
  height: number
}

// Two-color print of skate zines: cream letters, deep green ink (same as the web's SlamEffect.css).
const CREAM = '#fdf6c3'
const GREEN = '#0b4a3c'
const STICKER = { width: 150, height: 90 }
// The web's clip-path star burst, in % of the box.
const BURST = [
  [50, 0], [60, 26], [88, 8], [76, 36], [100, 42], [78, 56], [96, 82], [66, 70],
  [58, 100], [46, 74], [20, 96], [26, 66], [0, 64], [22, 48], [4, 22], [34, 30],
]
const burst = (inset: number) =>
  BURST.map(([px, py]) => {
    const w = STICKER.width - inset * 2
    const h = STICKER.height - inset * 2
    return `${inset + (px / 100) * w},${inset + (py / 100) * h}`
  }).join(' ')

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const backOut = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2

/** The board shoots up spinning and falls off to the left (the web's slamBoard keyframes). */
function boardFlight(elapsedMs: number) {
  const t = Math.min(1, elapsedMs / 1000)
  const opacity = 1 - t
  if (t < 0.45) {
    const u = easeOut(t / 0.45)
    return { x: -30 * u, y: -170 * u, rotate: -300 * u, opacity }
  }
  const u = easeOut((t - 0.45) / 0.55)
  return { x: -30 - 60 * u, y: -170 + 230 * u, rotate: -300 - 260 * u, opacity }
}

/**
 * Skate crash: Doom-style fire climbing over the player, the board flying off and a "SLAM!"
 * sticker. The player's fall and getting up are in PlayerSprite; timings in src/data/slam.ts.
 */
export default function SlamEffect({ progress, x, y, width, height }: SlamEffectProps) {
  const elapsed = progress * SLAM_MS
  const fireIndex = Math.floor((progress / SLAM_FIRE_SHARE) * FIRE_FRAMES.length)
  const fireWidth = width * 1.25
  const fireHeight = fireWidth * (40 / 32)
  const board = boardFlight(elapsed)
  const pop = backOut(Math.min(1, elapsed / 280))

  return (
    <>
      {fireIndex < FIRE_FRAMES.length && (
        <Image
          testID="slam-fire"
          source={FIRE_FRAMES[fireIndex]}
          fadeDuration={0}
          style={{ position: 'absolute', left: x + width / 2 - fireWidth / 2, top: y + height + 8 - fireHeight, width: fireWidth, height: fireHeight }}
        />
      )}

      <View
        style={{
          position: 'absolute',
          left: x + width * 0.2,
          top: y + height - 6,
          width: 64,
          height: 18,
          opacity: board.opacity,
          transform: [{ translateX: board.x }, { translateY: board.y }, { rotate: `${board.rotate}deg` }],
        }}
      >
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 6, borderRadius: 999, borderWidth: 3, borderColor: UI.ink, backgroundColor: CREAM }} />
        <View style={[wheel, { left: 8 }]} />
        <View style={[wheel, { right: 8 }]} />
      </View>

      {progress < SLAM_STICKER_UNTIL && (
        <View
          testID="slam-sticker"
          style={{
            position: 'absolute',
            left: x + width / 2 - STICKER.width / 2,
            top: y - 36,
            width: STICKER.width,
            height: STICKER.height,
            opacity: Math.min(1, pop),
            transform: [{ rotate: '-8deg' }, { scale: 2.2 - 1.2 * pop }],
          }}
        >
          <Svg width={STICKER.width} height={STICKER.height}>
            <Polygon points={burst(0)} fill={GREEN} />
            <Polygon points={burst(6)} fill={CREAM} />
            {/* Shadow, outline, then the letters: SVG text in React Native has no paint-order. */}
            <SvgText x={78} y={59} fontFamily={FONTS.display} fontSize={30} textAnchor="middle" fill={GREEN}>
              SLAM!
            </SvgText>
            <SvgText x={75} y={56} fontFamily={FONTS.display} fontSize={30} textAnchor="middle" fill={GREEN} stroke={GREEN} strokeWidth={3} strokeLinejoin="round">
              SLAM!
            </SvgText>
            <SvgText x={75} y={56} fontFamily={FONTS.display} fontSize={30} textAnchor="middle" fill={CREAM}>
              SLAM!
            </SvgText>
          </Svg>
        </View>
      )}
    </>
  )
}

const wheel = { position: 'absolute', bottom: 0, width: 11, height: 11, borderRadius: 6, borderWidth: 3, borderColor: UI.ink, backgroundColor: GREEN } as const
