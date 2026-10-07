import { CANVAS_H, CANVAS_W } from '../data/types'
import type { Paper } from '../draw/paper'

const STEP = 50 // virtual units between lines: 15 rows on the 1000×750 canvas

/** Lined / grid / dot paper drawn in the same 1000×750 space as strokes, so they line up anywhere. */
export default function PaperBackground({ paper, className = '' }: { paper: Paper; className?: string }) {
  if (paper === 'blank') return null
  const rows = Array.from({ length: CANVAS_H / STEP - 1 }, (_, i) => (i + 1) * STEP)
  const cols = Array.from({ length: CANVAS_W / STEP - 1 }, (_, i) => (i + 1) * STEP)
  return (
    <svg
      className={`paper ${className}`}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {paper === 'dots' ? (
        <g fill="var(--rule)">
          {rows.flatMap((y) => cols.map((x) => <circle key={`${x},${y}`} cx={x} cy={y} r={2.5} />))}
        </g>
      ) : (
        <g stroke="var(--rule)" strokeWidth={1} vectorEffect="non-scaling-stroke">
          {rows.map((y) => (
            <line key={`h${y}`} x1={0} x2={CANVAS_W} y1={y} y2={y} vectorEffect="non-scaling-stroke" />
          ))}
          {paper === 'grid' &&
            cols.map((x) => <line key={`v${x}`} x1={x} x2={x} y1={0} y2={CANVAS_H} vectorEffect="non-scaling-stroke" />)}
        </g>
      )}
    </svg>
  )
}
