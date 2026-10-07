import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CANVAS_H, CANVAS_W, type Point, type Stroke } from '../data/types'
import PaperBackground from './PaperBackground'
import { PEN_COLORS, isPenColor, type PenColor } from '../draw/colors'
import { PAPERS, usePaper, type Paper } from '../draw/paper'
import { notePenActivity } from '../draw/penActivity'
import { compactStroke, hitsStroke, strokePath } from '../draw/strokes'

type Tool = 'pen' | 'eraser'
const ERASER_RADIUS = 14
const MIN_PEN_PRESSURE = 0.25
const COLOR_KEY = 'sketchcards.penColor'

function loadPenColor(): PenColor {
  try {
    const v = localStorage.getItem(COLOR_KEY)
    if (isPenColor(v)) return v
  } catch {
    /* storage unavailable */
  }
  return 'ink'
}

/**
 * Freehand canvas. Pointer Events cover Apple Pencil (with pressure), touch and mouse.
 * Strokes are stored in a fixed 1000×750 virtual space, so resizing never loses the drawing.
 * Once a pen has touched the canvas, finger touches are ignored (palm rejection).
 */
export default function DrawPad({
  value,
  onChange,
  label = 'Drawing canvas',
}: {
  value: Stroke[]
  onChange: (strokes: Stroke[]) => void
  label?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const baseRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColorState] = useState<PenColor>(loadPenColor)
  const [paper, setPaper] = usePaper()

  function setColor(c: PenColor) {
    setColorState(c)
    setTool('pen')
    try {
      localStorage.setItem(COLOR_KEY, c)
    } catch {
      /* storage unavailable */
    }
  }
  const [history, setHistory] = useState({ undo: 0, redo: 0 })

  // Mutable drawing state lives in refs so pointer handlers never see stale values.
  const valueRef = useRef(value)
  const undoRef = useRef<Stroke[][]>([])
  const redoRef = useRef<Stroke[][]>([])
  const activeRef = useRef<{ id: number; type: string; stroke: Stroke; erasing: boolean; before: Stroke[] } | null>(null)
  const penSeenRef = useRef(false)
  const frameRef = useRef(0)
  const scaleRef = useRef(1)

  useLayoutEffect(() => {
    valueRef.current = value
  })

  const syncHistory = useCallback(
    () => setHistory({ undo: undoRef.current.length, redo: redoRef.current.length }),
    [],
  )

  // Resolve the --pen-* CSS variables (they change with the theme) to colors the canvas understands.
  const resolveColors = useCallback(() => {
    const style = wrapRef.current && getComputedStyle(wrapRef.current)
    const out = {} as Record<PenColor, string>
    for (const { key } of PEN_COLORS) out[key] = style?.getPropertyValue(`--pen-${key}`).trim() || '#000'
    return out
  }, [])

  const paint = useCallback(
    (canvas: HTMLCanvasElement | null, strokes: Stroke[], last: boolean) => {
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scaleRef.current, 0, 0, scaleRef.current, 0, 0)
      const colors = resolveColors()
      for (const s of strokes) {
        ctx.fillStyle = colors[s.color ?? 'ink']
        ctx.fill(new Path2D(strokePath(s, last)))
      }
    },
    [resolveColors],
  )

  const redrawBase = useCallback(() => paint(baseRef.current, valueRef.current, true), [paint])

  // Size canvases to the element × devicePixelRatio for crisp lines; repaint on resize.
  // Layout effect + an immediate call so the canvas is sized before the first paint.
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const resize = () => {
      const { width } = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.round(width * dpr))
      const h = Math.round((w * CANVAS_H) / CANVAS_W)
      for (const c of [baseRef.current, liveRef.current]) {
        if (c && (c.width !== w || c.height !== h)) {
          c.width = w
          c.height = h
        }
      }
      scaleRef.current = w / CANVAS_W
      redrawBase()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', redrawBase)
    window.addEventListener('themechange', redrawBase)
    return () => {
      ro.disconnect()
      mq.removeEventListener('change', redrawBase)
      window.removeEventListener('themechange', redrawBase)
    }
  }, [redrawBase])

  useEffect(redrawBase, [value, redrawBase])

  // Safari also delivers Pencil input as touch events. Claiming them on the canvas stops iPadOS
  // from taking the stroke over (Scribble handwriting, the magnifier, scrolling), which would
  // otherwise cancel it partway. While a stroke is in progress, a resting palm elsewhere on the
  // page can't scroll it either. These must be non-passive listeners, so they're added by hand.
  useEffect(() => {
    const canvas = liveRef.current
    if (!canvas) return
    const claim = (e: TouchEvent) => e.preventDefault()
    const holdPage = (e: TouchEvent) => activeRef.current && e.cancelable && e.preventDefault()
    canvas.addEventListener('touchstart', claim, { passive: false })
    canvas.addEventListener('touchmove', claim, { passive: false })
    document.addEventListener('touchmove', holdPage, { passive: false })
    return () => {
      canvas.removeEventListener('touchstart', claim)
      canvas.removeEventListener('touchmove', claim)
      document.removeEventListener('touchmove', holdPage)
    }
  }, [])

  function toPoint(e: PointerEvent | React.PointerEvent): Point {
    const rect = baseRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H
    // Fast, light Pencil flicks report near-zero pressure; keep a minimum so they stay visible.
    const pressure = e.pointerType === 'pen' ? Math.max(MIN_PEN_PRESSURE, e.pressure || 0.5) : 0.5
    return [x, y, pressure]
  }

  function commit(next: Stroke[], before: Stroke[]) {
    undoRef.current.push(before)
    redoRef.current = []
    onChange(next)
    syncHistory()
  }

  function eraseAt([x, y]: Point) {
    const strokes = valueRef.current
    const kept = strokes.filter((s) => !hitsStroke(s, x, y, ERASER_RADIUS))
    if (kept.length !== strokes.length) {
      valueRef.current = kept
      onChange(kept)
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'pen') {
      penSeenRef.current = true
      notePenActivity()
    }
    if (e.pointerType === 'touch' && penSeenRef.current) return // palm rejection
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (activeRef.current) {
      if (e.pointerType === 'pen' && activeRef.current.type === 'touch') {
        discardActive() // a palm that landed before the Pencil: drop its mark, let the Pencil draw
      } else if (e.pointerType === 'pen' && activeRef.current.type === 'pen') {
        finishActive() // the previous stroke's pen-up never arrived (fast strokes): keep it, start anew
      } else {
        return // one stroke at a time
      }
    }
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* pointer already gone; the stroke still works without capture */
    }
    // buttons bit 32 = the eraser end of pens that have one (Surface, Wacom).
    const erasing = tool === 'eraser' || (e.pointerType === 'pen' && (e.buttons & 32) !== 0)
    const pt = toPoint(e)
    activeRef.current = {
      id: e.pointerId,
      type: e.pointerType,
      stroke: { pen: e.pointerType === 'pen', points: [pt], ...(color !== 'ink' ? { color } : {}) },
      erasing,
      before: valueRef.current,
    }
    if (erasing) eraseAt(pt)
    else scheduleLive()
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const active = activeRef.current
    if (!active || e.pointerId !== active.id) return
    e.preventDefault()
    if (e.pointerType === 'pen') notePenActivity()
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    const pts = (events.length ? events : [e.nativeEvent]).map(toPoint)
    if (active.erasing) pts.forEach(eraseAt)
    else {
      active.stroke.points.push(...pts)
      scheduleLive()
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'pen') notePenActivity()
    const active = activeRef.current
    if (!active || e.pointerId !== active.id) return
    // A touch cancelled by the system (e.g. a palm) shouldn't leave a mark.
    if (e.type === 'pointercancel' && e.pointerType === 'touch') return discardActive()
    finishActive(e.type === 'pointerup' ? toPoint(e) : undefined)
  }

  /** End the stroke in progress and save it (or the eraser's changes) as one undo step. */
  function finishActive(liftPoint?: Point) {
    const active = activeRef.current
    if (!active) return
    activeRef.current = null
    cancelAnimationFrame(frameRef.current)
    paint(liveRef.current, [], true)
    if (active.erasing) {
      if (valueRef.current !== active.before) commit(valueRef.current, active.before)
      return
    }
    // Include where the pen lifted (pressure is 0 on lift, so reuse the last sample's).
    const pts = active.stroke.points
    const last = pts[pts.length - 1]
    if (liftPoint && Math.hypot(liftPoint[0] - last[0], liftPoint[1] - last[1]) > 0.5) {
      pts.push([liftPoint[0], liftPoint[1], last[2]])
    }
    const next = [...valueRef.current, compactStroke(active.stroke)]
    valueRef.current = next
    commit(next, active.before)
    paint(baseRef.current, next, true) // paint now; avoids a one-frame flicker
  }

  function discardActive() {
    const active = activeRef.current
    activeRef.current = null
    cancelAnimationFrame(frameRef.current)
    paint(liveRef.current, [], true)
    if (active?.erasing && valueRef.current !== active.before) {
      valueRef.current = active.before
      onChange(active.before)
    }
  }

  function scheduleLive() {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      const s = activeRef.current?.stroke
      paint(liveRef.current, s ? [s] : [], false)
    })
  }

  const undo = useCallback(() => {
    const prev = undoRef.current.pop()
    if (!prev) return
    redoRef.current.push(valueRef.current)
    onChange(prev)
    syncHistory()
  }, [onChange, syncHistory])

  const redo = useCallback(() => {
    const next = redoRef.current.pop()
    if (!next) return
    undoRef.current.push(valueRef.current)
    onChange(next)
    syncHistory()
  }, [onChange, syncHistory])

  function clear() {
    if (valueRef.current.length) commit([], valueRef.current)
  }

  // ⌘/Ctrl+Z, ⇧⌘Z / Ctrl+Y — but leave text fields their own undo.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return (
    <div className="drawpad">
      <div className="drawpad-tools" role="toolbar" aria-label="Drawing tools">
        <button type="button" className="btn small" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>
          ✎ Pen
        </button>
        <button type="button" className="btn small" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>
          ⌫ Eraser
        </button>
        <div className="swatches" role="group" aria-label="Pen color">
          {PEN_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              className="swatch"
              style={{ '--swatch': `var(--pen-${c.key})` } as React.CSSProperties}
              aria-label={`${c.label} pen`}
              aria-pressed={tool === 'pen' && color === c.key}
              title={c.label}
              onClick={() => setColor(c.key)}
            />
          ))}
        </div>
        <label className="paper-select">
          <span className="sr-only">Paper</span>
          <select value={paper} onChange={(e) => setPaper(e.target.value as Paper)} aria-label="Paper">
            {PAPERS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label} paper
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <button type="button" className="btn small" onClick={undo} disabled={!history.undo} aria-label="Undo">
          ↶ Undo
        </button>
        <button type="button" className="btn small" onClick={redo} disabled={!history.redo} aria-label="Redo">
          ↷ Redo
        </button>
        <button type="button" className="btn small" onClick={clear} disabled={!value.length}>
          Clear
        </button>
      </div>
      <div className="drawpad-surface" ref={wrapRef}>
        <PaperBackground paper={paper} />
        <canvas ref={baseRef} aria-hidden="true" />
        <canvas
          ref={liveRef}
          role="img"
          aria-label={`${label}. ${value.length} strokes. Draw with a pen, finger or mouse.`}
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  )
}
