import { memo, useMemo } from 'react'
import Svg, { Rect } from 'react-native-svg'
import { PERSON_SIZE, personPixels } from '../shared'

/**
 * A street artist as a little pixel-art person, standing (the web draws the same pixels).
 * Memoized: the obstacle list re-renders every frame, the drawing only changes with these props.
 */
export default memo(function PixelPerson({ id, color, width, height }: { id: string; color: string; width: number; height: number }) {
  const runs = useMemo(() => personPixels({ id, color, kind: 'graffiti' }), [id, color])
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${PERSON_SIZE.width} ${PERSON_SIZE.height}`}>
      {runs.map((run) => (
        <Rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width + 0.02} height={1.02} fill={run.color} />
      ))}
    </Svg>
  )
})
