/**
 * Pen colors. Strokes store the key, not a hex value, so each color can be tuned for light and
 * dark mode (see --pen-* in index.css). "ink" follows the theme: black on light, white on dark.
 */
export const PEN_COLORS = [
  { key: 'ink', label: 'Black' },
  { key: 'red', label: 'Red' },
  { key: 'blue', label: 'Blue' },
  { key: 'green', label: 'Green' },
  { key: 'orange', label: 'Orange' },
  { key: 'purple', label: 'Purple' },
] as const

export type PenColor = (typeof PEN_COLORS)[number]['key']

export function isPenColor(v: unknown): v is PenColor {
  return PEN_COLORS.some((c) => c.key === v)
}

/** CSS color for a stroke; works in SVG fill and (after resolving the var) on canvas. */
export function penColorVar(color: PenColor | undefined) {
  return `var(--pen-${color ?? 'ink'})`
}
