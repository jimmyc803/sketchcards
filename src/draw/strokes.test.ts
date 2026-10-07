import { describe, expect, it } from 'vitest'
import { compactStroke, hitsStroke, parseStrokes, strokePath } from './strokes'

const line = { pen: true, points: [[0, 0, 0.5], [100, 0, 0.5], [200, 0, 0.5]] as [number, number, number][] }

describe('strokes', () => {
  it('renders a closed SVG path', () => {
    const d = strokePath(line)
    expect(d.startsWith('M')).toBe(true)
    expect(d.endsWith('Z')).toBe(true)
  })

  it('renders a single tap as a visible dot', () => {
    const d = strokePath({ pen: false, points: [[50, 50, 0.5]] })
    expect(d).toMatch(/^M/)
    expect(d.length).toBeGreaterThan(20)
  })

  it('hit-tests near the line but not far from it', () => {
    expect(hitsStroke(line, 150, 5, 10)).toBe(true)
    expect(hitsStroke(line, 150, 60, 10)).toBe(false)
  })

  it('compacts precision', () => {
    expect(compactStroke({ pen: true, points: [[1.23456, 2.98765, 0.123456]] }).points[0]).toEqual([1.2, 3, 0.12])
  })

  it('parses valid stroke data and rejects junk', () => {
    expect(parseStrokes([{ pen: 1, points: [[1, 2], [3, 4, 0.7], ['x', 1]] }])).toEqual([
      { pen: true, points: [[1, 2, 0.5], [3, 4, 0.7]] },
    ])
    expect(parseStrokes('nope')).toBeNull()
    expect(parseStrokes([{ points: 'x' }])).toBeNull()
  })
})
