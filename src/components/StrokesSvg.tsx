import { useMemo } from 'react'
import { CANVAS_H, CANVAS_W, type Stroke } from '../data/types'
import { penColorVar } from '../draw/colors'
import { strokePath } from '../draw/strokes'

/** Renders saved strokes as SVG. Colors are CSS variables, so they follow the theme. */
export default function StrokesSvg({
  strokes,
  className,
  label = 'Sketch',
}: {
  strokes: Stroke[]
  className?: string
  label?: string
}) {
  const paths = useMemo(() => strokes.map((s) => ({ d: strokePath(s), color: s.color })), [strokes])
  return (
    <svg
      className={className}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      fill="currentColor"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      {paths.map(({ d, color }, i) => (
        <path key={i} d={d} fill={color ? penColorVar(color) : undefined} />
      ))}
    </svg>
  )
}
