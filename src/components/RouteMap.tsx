import type { GamePhase } from '../types/game'
import {
  ROUTE_BOX,
  ROUTE_POINTS,
  ROUTE_STOPS,
  flagDue,
  formatDistance,
  pointAt,
  pointsToString,
  routeProgress,
  splitRoute,
} from '../data/routeMap'
import './RouteMap.css'

interface RouteMapProps {
  score: number
  phase: GamePhase
  /** Meters run. */
  distance: number
}

/**
 * The route map in the corner (GTA-style minimap, drawn like a marker on a photo): the run from
 * START to the checkpoint flags, the stretch already done in pink, the player's dot and the
 * distance. The shapes come from src/data/routeMap.ts (shared with the app).
 */
export default function RouteMap({ score, phase, distance }: RouteMapProps) {
  const progress = routeProgress(score, phase)
  const { done, ahead } = splitRoute(progress)
  const [px, py] = pointAt(progress)
  const due = flagDue(score, phase)
  const all = pointsToString(ROUTE_POINTS)
  const [sx, sy] = ROUTE_POINTS[0]

  return (
    <svg className="route-map" viewBox={`0 0 ${ROUTE_BOX.width} ${ROUTE_BOX.height}`} aria-label={`Rota: ${formatDistance(distance)}`} role="img">
      <rect className="route-plate" x="1" y="1" width={ROUTE_BOX.width - 2} height={ROUTE_BOX.height - 2} rx="12" />
      <polyline className="route-shadow" points={all} transform="translate(2.5 2.5)" />
      <polyline className="route-outline" points={all} />
      <polyline className="route-ahead" points={pointsToString(ahead)} />
      <polyline className="route-done" points={pointsToString(done)} />

      {ROUTE_STOPS.map((stop) => {
        const [fx, fy] = pointAt(stop.at)
        const reached = phase >= stop.phase
        const waiting = due && phase === stop.phase - 1
        const labelX = stop.side === 'left' ? fx - 9 : fx + 9
        return (
          <g key={stop.phase} className={`route-flag ${reached ? 'is-reached' : ''} ${waiting ? 'is-due' : ''}`}>
            <line x1={fx} y1={fy} x2={fx} y2={fy - 13} />
            <polygon points={`${fx},${fy - 13} ${fx + 8},${fy - 10} ${fx},${fy - 7}`} />
            <text x={labelX} y={fy - 6} textAnchor={stop.side === 'left' ? 'end' : 'start'}>
              {waiting ? 'SUBA!' : stop.label}
            </text>
          </g>
        )
      })}

      <text className="route-start" x={sx + 8} y={sy + 6}>
        START
      </text>
      <circle className="route-pulse" cx={px} cy={py} r="7" />
      <circle className="route-player" cx={px} cy={py} r="4.2" />
      <text className="route-distance" x="7" y="18">
        {formatDistance(distance)}
      </text>
    </svg>
  )
}
