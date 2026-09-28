import { SLAM_FIRE_SHARE, SLAM_STICKER_UNTIL } from '../data/slam'
import './SlamEffect.css'

// Doom fire frames (scripts/make-fx-sprites.py): burning, then dying out.
const FIRE_FRAMES = Object.entries(
  import.meta.glob<string>('../assets/sprites/fx/fire-*.png', { eager: true, import: 'default' })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)

interface SlamEffectProps {
  /** 0 → 1 over the SLAM (see GameView.slamProgress). */
  progress: number
  /** Player box, in game pixels. */
  x: number
  y: number
  width: number
  height: number
}

/**
 * Skate crash: Doom-style fire climbing over the player, the board flying off and a "SLAM!"
 * sticker (like a skate zine print). The player's fall and getting up are in Dinosaur.
 */
export default function SlamEffect({ progress, x, y, width, height }: SlamEffectProps) {
  const fireIndex = Math.floor((progress / SLAM_FIRE_SHARE) * FIRE_FRAMES.length)
  const fire = fireIndex < FIRE_FRAMES.length ? FIRE_FRAMES[fireIndex] : null
  const fireWidth = width * 1.25
  const fireHeight = fireWidth * (40 / 32)
  return (
    <>
      {fire && (
        <img
          className="slam-fire"
          src={fire}
          alt=""
          draggable={false}
          style={{ left: x + width / 2 - fireWidth / 2, top: y + height + 8 - fireHeight, width: fireWidth, height: fireHeight }}
        />
      )}
      <div className="slam-board" style={{ left: x + width * 0.2, top: y + height - 6 }} aria-hidden="true">
        <span className="slam-board-deck" />
        <span className="slam-board-wheel is-left" />
        <span className="slam-board-wheel is-right" />
      </div>
      {progress < SLAM_STICKER_UNTIL && (
        <div className="slam-sticker" style={{ left: x + width / 2, top: y - 36 }} role="status">
          <span className="slam-burst" />
          <strong>SLAM!</strong>
        </div>
      )}
    </>
  )
}
