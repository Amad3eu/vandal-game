import { memo, useMemo } from 'react'
import type { ArtistKind } from '../data/encounters'
import { PERSON_SIZE, personPixels } from '../data/pixelPerson'

/** A street artist as a little pixel-art person, standing (see src/data/pixelPerson.ts). */
function PixelPerson({ id, color, kind, className }: { id: string; color: string; kind: ArtistKind; className?: string }) {
  const runs = useMemo(() => personPixels({ id, color, kind }), [id, color, kind])
  return (
    <svg
      className={className}
      viewBox={`0 0 ${PERSON_SIZE.width} ${PERSON_SIZE.height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {runs.map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width + 0.02} height={1.02} fill={run.color} />
      ))}
    </svg>
  )
}

// The obstacle list re-renders every frame; the drawing only changes with these props.
export default memo(PixelPerson)
