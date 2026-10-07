import type { Point, Stroke } from '../data/types'
import type { DeckFile, FileCard } from './deckFile'

/**
 * The "Welcome" sample deck: a few cards that teach the app itself.
 * Sketched backs are generated here as stroke data (1000×750 virtual canvas).
 */

const P = 0.5 // constant pen pressure → even line weight

/** A straight line, densified so smoothing keeps it straight. */
function line(x1: number, y1: number, x2: number, y2: number): Stroke {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 12))
  const points: Point[] = []
  for (let i = 0; i <= n; i++) points.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n, P])
  return { pen: true, points }
}

/** An arc from angle a0 to a1 (radians, 0 = 3 o'clock, clockwise because y points down). */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Stroke {
  const n = Math.max(8, Math.ceil((Math.abs(a1 - a0) * Math.max(rx, ry)) / 10))
  const points: Point[] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    points.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), P])
  }
  return { pen: true, points }
}

const TAU = Math.PI * 2

/** Handwritten-style lowercase letters, roughly 40 units tall, with the baseline at y. */
function letter(ch: 'a' | 'b' | 'c', x: number, y: number): Stroke[] {
  const r = 18
  switch (ch) {
    case 'a':
      return [arc(x + r, y - r, r, r, 0, TAU), line(x + 2 * r, y - 2 * r - 2, x + 2 * r, y)]
    case 'b':
      return [line(x, y - 4 * r, x, y), arc(x + r, y - r, r, r, Math.PI, Math.PI + TAU)]
    case 'c':
      return [arc(x + r, y - r, r, r, Math.PI * 0.25, Math.PI * 1.75)]
  }
}

export function rightTriangleSketch(): Stroke[] {
  // Right angle at bottom-left (300, 600); legs a (vertical) and b (horizontal), hypotenuse c.
  const [ax, ay, bx, by, cx] = [300, 600, 300, 180, 760]
  return [
    line(ax, by, ax, ay), // a
    line(ax, ay, cx, ay), // b
    line(cx, ay, bx, by), // c
    line(ax + 50, ay, ax + 50, ay - 50), // right-angle marker
    line(ax + 50, ay - 50, ax, ay - 50),
    ...letter('a', ax - 80, (ay + by) / 2 + 20),
    ...letter('b', (ax + cx) / 2 - 18, ay + 105),
    ...letter('c', (ax + cx) / 2 + 30, (ay + by) / 2 - 10),
  ]
}

export function clockSketch(): Stroke[] {
  const [cx, cy, r] = [500, 375, 260]
  const ticks = [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2
    return line(cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40), cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10))
  })
  return [
    arc(cx, cy, r, r, -Math.PI / 2, -Math.PI / 2 + TAU),
    ...ticks,
    line(cx, cy, cx, cy - 200), // minute hand → 12
    line(cx, cy, cx + 140, cy), // hour hand → 3
  ]
}

export function sampleDeck(): DeckFile {
  const flip = (front_text: string, back_text: string): FileCard => ({
    front_text,
    front_image: null,
    back_text,
    back_image: null,
    back_strokes: null,
    answer_mode: 'flip',
    tags: ['welcome'],
  })
  const draw = (front_text: string, back_text: string, back_strokes: Stroke[]): FileCard => ({
    ...flip(front_text, back_text),
    back_strokes,
    answer_mode: 'draw',
    tags: ['welcome', 'drawing'],
  })
  return {
    app: 'sketchcards',
    version: 1,
    exported_at: null,
    decks: [
      {
        name: 'Welcome',
        default_answer_mode: 'flip',
        new_per_day: null,
        cards: [
          flip(
            'Welcome to sketchcards 👋\nHow do you see the answer?',
            'Flip the card: tap it, press Space, or use "Show answer".\nThen grade yourself honestly.',
          ),
          flip(
            'What do Missed, Close and Got it do?',
            'Missed: the card comes back later in this session, and again tomorrow.\nClose: you see it again a bit sooner than usual.\nGot it: the gap grows each time (1 day, 3 days, then longer).\nKeyboard: 1 / 2 / 3.',
          ),
          flip(
            'How do Draw cards work?',
            'A canvas sits next to the prompt. Sketch the answer from memory with a pen, finger or mouse, then flip to compare with the reference. Turn on Overlay to lay the reference over your drawing.\nYour sketch is never saved.',
          ),
          draw(
            'Draw a right triangle and label its sides a, b, c',
            'c is the hypotenuse, opposite the right angle: a² + b² = c²',
            rightTriangleSketch(),
          ),
          draw('Draw a clock face showing 3 o’clock', 'Minute hand on 12, hour hand on 3', clockSketch()),
          flip(
            'How do I make my own cards?',
            'Create a deck with "New deck", then "Add card". Each card can be Flip or Draw, and backs can have text, an image, or a sketch ("Draw on back").\nDeck settings has CSV import and JSON export.',
          ),
        ],
      },
    ],
  }
}
