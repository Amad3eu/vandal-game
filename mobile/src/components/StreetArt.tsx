import { memo } from 'react'
import Svg, { Defs, Line, Pattern, Polygon, Rect, Text as SvgText } from 'react-native-svg'
import { CONE_SPACING, CONE_WIDTH } from '../shared'
import { FONTS } from '../theme'

// Obstacles drawn in code (placeholder art until real sprites come), the same as the web's
// Obstacle.tsx. Memoized: the obstacle list re-renders every frame, the drawings don't change.

/** Ramp up to a train roof: a steel slope with hazard stripes along its edge. */
export const RampArt = memo(function RampArt({ id, width, height }: { id: number; width: number; height: number }) {
  const stripes = `ramp-stripes-${id}`
  return (
    <Svg width={width} height={height} viewBox="0 0 180 138" preserveAspectRatio="none">
      <Defs>
        <Pattern id={stripes} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <Rect width="7" height="14" fill="#ffd23f" />
          <Rect x="7" width="7" height="14" fill="#140f1f" />
        </Pattern>
      </Defs>
      <Polygon points="0,130 180,0 180,138 0,138" fill="#3b4150" stroke="#140f1f" strokeWidth="3" />
      {[45, 90, 135].map((x) => (
        <Line key={x} x1={x} y1={130 - (x / 180) * 130 + 6} x2={x} y2="138" stroke="#232733" strokeWidth="5" />
      ))}
      <Polygon points="0,130 180,0 180,12 14,130" fill={`url(#${stripes})`} stroke="#140f1f" strokeWidth="2" />
    </Svg>
  )
})

/** Orange traffic cones with white bands, as many as fit the obstacle. */
export const ConesArt = memo(function ConesArt({ width, height: h }: { width: number; height: number }) {
  const count = Math.max(1, Math.round((width + CONE_SPACING) / (CONE_WIDTH + CONE_SPACING)))
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`}>
      {Array.from({ length: count }, (_, i) => {
        const x = i * (CONE_WIDTH + CONE_SPACING)
        const tip = x + CONE_WIDTH / 2
        return [
          <Polygon key={`c${i}`} points={`${tip - 4},2 ${tip + 4},2 ${x + CONE_WIDTH - 3},${h - 7} ${x + 3},${h - 7}`} fill="#ff7a1a" stroke="#140f1f" strokeWidth="2" />,
          <Polygon key={`a${i}`} points={`${tip - 7},${h * 0.32} ${tip + 7},${h * 0.32} ${tip + 9},${h * 0.46} ${tip - 9},${h * 0.46}`} fill="#fff" />,
          <Polygon key={`b${i}`} points={`${tip - 11},${h * 0.6} ${tip + 11},${h * 0.6} ${tip + 12.5},${h * 0.72} ${tip - 12.5},${h * 0.72}`} fill="#fff" />,
          <Rect key={`r${i}`} x={x} y={h - 8} width={CONE_WIDTH} height="7" rx="2" fill="#2d2a3e" stroke="#140f1f" strokeWidth="2" />,
        ]
      })}
    </Svg>
  )
})

/**
 * A site hoarding hanging on chains over the street, as tall as the obstacle (hitting any of it
 * ends the run) with an "OBRA" sign at its bottom edge: duck under it. Drawn 400px taller, for
 * the chains going up toward the top of the screen.
 */
export const DuckBarArt = memo(function DuckBarArt({ width, height }: { width: number; height: number }) {
  const signTop = height - 46
  return (
    <Svg width={width} height={height + 400} viewBox={`0 -400 76 ${height + 400}`} preserveAspectRatio="none">
      {[16, 60].map((x) => (
        <Line key={x} x1={x} y1="-400" x2={x} y2="4" stroke="#5b5170" strokeWidth="4" strokeDasharray="7 4" />
      ))}
      <Rect x="4" y="0" width="68" height={signTop + 2} fill="#4a3f5c" stroke="#140f1f" strokeWidth="3" />
      {[25, 50].map((x) => (
        <Line key={x} x1={x} y1="3" x2={x} y2={signTop} stroke="#3a3149" strokeWidth="2" />
      ))}
      <SvgText x="38" y={signTop / 2 + 7} textAnchor="middle" fontFamily={FONTS.display} fontSize="20" fill="#ff4d9d" transform={`rotate(-90 38 ${signTop / 2})`}>
        VANDAL
      </SvgText>
      <Rect x="2" y={signTop} width="72" height="44" rx="4" fill="#ffd23f" stroke="#140f1f" strokeWidth="3" />
      <Rect x="6" y={signTop + 4} width="64" height="10" fill="#140f1f" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Polygon key={i} points={`${8 + i * 11},${signTop + 14} ${14 + i * 11},${signTop + 4} ${18 + i * 11},${signTop + 4} ${12 + i * 11},${signTop + 14}`} fill="#ffd23f" />
      ))}
      <SvgText x="38" y={signTop + 36} textAnchor="middle" fontFamily={FONTS.display} fontSize="17" fill="#140f1f">
        OBRA
      </SvgText>
    </Svg>
  )
})
