import type { GamePhase } from '../types/game'
import { PHASE_2_SCORE, PHASE_3_SCORE } from '../game/config'

/**
 * The route map in the corner of the game (web and app): a hand-drawn zigzag from the START to
 * the checkpoint flags, with the player's dot moving along it as the run goes on. Drawn in a
 * 100 x 150 box; each front end only draws these shapes.
 */
export const ROUTE_BOX = { width: 100, height: 150 }

/** From START (bottom) to the top of the map, like a GPS track drawn with a marker. */
export const ROUTE_POINTS: [number, number][] = [
  [46, 138], [51, 131], [44, 125], [52, 119], [47, 112], [56, 106], [50, 99], [58, 92], [52, 86],
  [45, 80], [52, 72], [47, 66], [56, 58], [51, 52], [60, 45], [55, 38], [64, 32], [58, 25],
  [66, 19], [62, 11],
]

/** Where the checkpoint flags sit on the route (0 = START, 1 = top). */
export const ROUTE_STOPS: { at: number; phase: 2 | 3; label: string; side: 'left' | 'right' }[] = [
  { at: 0.36, phase: 2, label: 'METRÔ', side: 'left' },
  { at: 0.7, phase: 3, label: 'TELHADOS', side: 'left' },
]

const lengths = (() => {
  const cumulative = [0]
  for (let i = 1; i < ROUTE_POINTS.length; i++) {
    const [ax, ay] = ROUTE_POINTS[i - 1]
    const [bx, by] = ROUTE_POINTS[i]
    cumulative.push(cumulative[i - 1] + Math.hypot(bx - ax, by - ay))
  }
  return cumulative
})()
const TOTAL = lengths[lengths.length - 1]

/** The point at a fraction of the route, and the index of the segment it's on. */
function locate(fraction: number): { point: [number, number]; segment: number } {
  const target = Math.min(1, Math.max(0, fraction)) * TOTAL
  for (let i = 1; i < lengths.length; i++) {
    if (lengths[i] >= target) {
      const t = (target - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1)
      const [ax, ay] = ROUTE_POINTS[i - 1]
      const [bx, by] = ROUTE_POINTS[i]
      return { point: [ax + (bx - ax) * t, ay + (by - ay) * t], segment: i }
    }
  }
  return { point: ROUTE_POINTS[ROUTE_POINTS.length - 1], segment: ROUTE_POINTS.length - 1 }
}

export const pointAt = (fraction: number) => locate(fraction).point

/** The route split at the player: the part already run and the part ahead. */
export function splitRoute(fraction: number) {
  const { point, segment } = locate(fraction)
  return {
    done: [...ROUTE_POINTS.slice(0, segment), point],
    ahead: [point, ...ROUTE_POINTS.slice(segment)],
  }
}

/**
 * How far along the route the player is: up to the next flag by score, then waiting at the
 * flag until it's grabbed (the climb shows up there). The last stretch never quite ends.
 */
export function routeProgress(score: number, phase: GamePhase) {
  const flag2 = ROUTE_STOPS[0].at
  const flag3 = ROUTE_STOPS[1].at
  if (phase === 1) return flag2 * Math.min(1, score / PHASE_2_SCORE)
  if (phase === 2) return flag2 + (flag3 - flag2) * Math.min(1, Math.max(0, (score - PHASE_2_SCORE) / (PHASE_3_SCORE - PHASE_2_SCORE)))
  return flag3 + (1 - flag3) * (1 - Math.exp(-Math.max(0, score - PHASE_3_SCORE) / 5000))
}

/** The next flag is due: the climb to it can show up. */
export function flagDue(score: number, phase: GamePhase) {
  return (phase === 1 && score >= PHASE_2_SCORE) || (phase === 2 && score >= PHASE_3_SCORE)
}

export const formatDistance = (meters: number) =>
  meters < 1000 ? `${meters} M` : `${(meters / 1000).toFixed(1).replace('.', ',')} KM`

export const pointsToString = (points: [number, number][]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
