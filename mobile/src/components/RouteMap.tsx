import type { ReactNode } from 'react'
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg'
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
} from '../shared'
import { FONTS, UI } from '../theme'

interface RouteMapProps {
  score: number
  phase: 1 | 2 | 3
  /** Meters run. */
  distance: number
  /** Milliseconds of play so far; drives the pulse and the blinking flag. */
  clock: number
  width: number
  height: number
}

const PINK = '#ff9ad5'

/** Pink letters with an ink outline (SVG text in React Native has no paint-order). */
function InkText({ x, y, size, color = PINK, anchor = 'start', children }: { x: number; y: number; size: number; color?: string; anchor?: 'start' | 'end'; children: ReactNode }) {
  const common = { x, y, fontFamily: FONTS.display, fontSize: size, textAnchor: anchor } as const
  return (
    <>
      <SvgText {...common} fill={UI.ink} stroke={UI.ink} strokeWidth={3} strokeLinejoin="round">
        {children}
      </SvgText>
      <SvgText {...common} fill={color}>
        {children}
      </SvgText>
    </>
  )
}

/**
 * The route map in the corner, like the web's RouteMap: the run from START to the checkpoint
 * flags, the stretch already done in pink, the player's dot and the distance. The shapes come
 * from src/data/routeMap.ts.
 */
export default function RouteMap({ score, phase, distance, clock, width, height }: RouteMapProps) {
  const progress = routeProgress(score, phase)
  const { done, ahead } = splitRoute(progress)
  const [px, py] = pointAt(progress)
  const due = flagDue(score, phase)
  const all = pointsToString(ROUTE_POINTS)
  const [sx, sy] = ROUTE_POINTS[0]
  const pulse = (clock % 1200) / 1200
  const blinkOff = Math.floor(clock / 300) % 2 === 1

  return (
    <Svg testID="route-map" pointerEvents="none" width={width} height={height} viewBox={`0 0 ${ROUTE_BOX.width} ${ROUTE_BOX.height}`}>
      <Rect x={1} y={1} width={ROUTE_BOX.width - 2} height={ROUTE_BOX.height - 2} rx={12} fill="rgba(20, 15, 31, 0.28)" stroke="rgba(20, 15, 31, 0.35)" strokeWidth={1} />
      <Polyline points={all} transform="translate(2.5 2.5)" fill="none" stroke={UI.ink} strokeWidth={9} strokeOpacity={0.55} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points={all} fill="none" stroke={UI.ink} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points={pointsToString(ahead)} fill="none" stroke="rgba(255, 255, 255, 0.75)" strokeWidth={4} strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
      <Polyline points={pointsToString(done)} fill="none" stroke={PINK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />

      {ROUTE_STOPS.map((stop) => {
        const [fx, fy] = pointAt(stop.at)
        const reached = phase >= stop.phase
        const waiting = due && phase === stop.phase - 1
        return (
          <G key={stop.phase} opacity={waiting && blinkOff ? 0.35 : 1}>
            <Line x1={fx} y1={fy} x2={fx} y2={fy - 13} stroke={UI.ink} strokeWidth={2.5} />
            <Polygon points={`${fx},${fy - 13} ${fx + 8},${fy - 10} ${fx},${fy - 7}`} fill={reached ? UI.green : '#fff'} stroke={UI.ink} strokeWidth={1.5} />
            <InkText x={stop.side === 'left' ? fx - 9 : fx + 9} y={fy - 6} size={7.5} color={waiting ? UI.yellow : PINK} anchor={stop.side === 'left' ? 'end' : 'start'}>
              {waiting ? 'SUBA!' : stop.label}
            </InkText>
          </G>
        )
      })}

      <InkText x={sx + 8} y={sy + 6} size={9}>
        START
      </InkText>
      <Circle cx={px} cy={py} r={7 * (0.6 + 1.2 * pulse)} fill="rgba(255, 210, 63, 0.35)" opacity={0.9 * (1 - pulse)} />
      <Circle cx={px} cy={py} r={4.2} fill={UI.yellow} stroke={UI.ink} strokeWidth={2} />
      <InkText x={7} y={18} size={15}>
        {formatDistance(distance)}
      </InkText>
    </Svg>
  )
}
