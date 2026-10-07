import { getStroke } from 'perfect-freehand'
import type { Stroke } from '../data/types'
import { isPenColor } from './colors'

/** Stroke size is in virtual canvas units (the canvas is 1000 units wide). */
export const PEN_SIZE = 9

function options(stroke: Stroke, last: boolean) {
  return {
    size: PEN_SIZE,
    thinning: stroke.pen ? 0.6 : 0.5,
    smoothing: 0.5,
    // Less streamlining for a pen, so the live line keeps up with the Pencil tip.
    streamline: stroke.pen ? 0.25 : 0.45,
    simulatePressure: !stroke.pen,
    last,
  }
}

/** Outline polygon for a stroke, as an SVG path "d" string (also usable with Path2D). */
export function strokePath(stroke: Stroke, last = true): string {
  return outlineToPath(getStroke(stroke.points, options(stroke, last)))
}

function outlineToPath(points: number[][]): string {
  const n = points.length
  if (n === 0) return ''
  if (n < 3) {
    const [x, y] = points[0]
    const r = PEN_SIZE / 2
    return `M${f(x - r)},${f(y)}a${r},${r} 0 1,0 ${PEN_SIZE},0a${r},${r} 0 1,0 ${-PEN_SIZE},0`
  }
  // Quadratic curves through midpoints: smooth and compact.
  let d = `M${f(points[0][0])},${f(points[0][1])}Q`
  for (let i = 0; i < n; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[(i + 1) % n]
    d += `${f(x0)},${f(y0)} ${f((x0 + x1) / 2)},${f((y0 + y1) / 2)} `
  }
  return d + 'Z'
}

function f(n: number) {
  return Math.round(n * 10) / 10
}

/** Is a point within `radius` of any point of the stroke? Used by the stroke eraser. */
export function hitsStroke(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const r2 = (radius + PEN_SIZE / 2) ** 2
  const pts = stroke.points
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[Math.min(i + 1, pts.length - 1)]
    if (distToSegment2(x, y, ax, ay, bx, by) <= r2) return true
  }
  return false
}

function distToSegment2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return (px - cx) ** 2 + (py - cy) ** 2
}

/** Reduce precision so stored strokes stay small. */
export function compactStroke(stroke: Stroke): Stroke {
  return {
    pen: stroke.pen,
    ...(stroke.color && stroke.color !== 'ink' ? { color: stroke.color } : {}),
    points: stroke.points.map(([x, y, p]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(p * 100) / 100]),
  }
}

/** Validate untrusted stroke data (from imports). Returns null if it isn't usable. */
export function parseStrokes(value: unknown): Stroke[] | null {
  if (!Array.isArray(value)) return null
  const out: Stroke[] = []
  for (const s of value) {
    if (!s || typeof s !== 'object' || !Array.isArray((s as Stroke).points)) return null
    const points = (s as Stroke).points.filter(
      (p): p is [number, number, number] => Array.isArray(p) && p.length >= 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n)),
    )
    const color = (s as Stroke).color
    out.push({
      pen: Boolean((s as Stroke).pen),
      ...(isPenColor(color) && color !== 'ink' ? { color } : {}),
      points: points.map(([x, y, p]) => [x, y, p ?? 0.5]),
    })
  }
  return out
}
