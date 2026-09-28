/**
 * How the skate SLAM is drawn (web and app), over GameView.slamProgress (0 → 1): the fire
 * climbs over the player, the "SLAM!" sticker pops, the street shakes, and the player falls
 * on their back, lies there and gets up with a hop. Each front end only draws these numbers.
 */

/** Share of the SLAM the fire burns (the rest is getting up). */
export const SLAM_FIRE_SHARE = 0.75
/** The "SLAM!" sticker shows until here. */
export const SLAM_STICKER_UNTIL = 0.82
/** The street shakes until here. */
export const SLAM_SHAKE_UNTIL = 0.3

/**
 * The bail: rotation in degrees around the player's center, and how far the body drops, as a
 * share of the player's height (negative is the hop up).
 */
export function slamPose(progress: number): { rotate: number; drop: number } {
  if (progress < 0.08) return { rotate: (-80 * progress) / 0.08, drop: 0 }
  if (progress < 0.6) return { rotate: -80, drop: 0.22 }
  if (progress < 0.85) {
    const t = (progress - 0.6) / 0.25
    return { rotate: -80 * (1 - t), drop: 0.22 * (1 - t) - 0.14 * Math.sin(t * Math.PI) }
  }
  return { rotate: 0, drop: 0 }
}
