import type { AnswerMode, Grade, Stroke } from '../data/types'
import { parseStrokes } from '../draw/strokes'

/**
 * The portable JSON format for decks and full backups. Images are embedded as data: URLs
 * (other URLs are kept as-is); sketches keep their stroke data.
 */
export interface DeckFile {
  app: 'sketchcards'
  version: 1
  exported_at: string | null
  decks: FileDeck[]
}

export interface FileDeck {
  name: string
  default_answer_mode: AnswerMode
  new_per_day: number | null
  cards: FileCard[]
}

export interface FileCard {
  front_text: string
  front_image: string | null
  back_text: string
  back_image: string | null
  back_strokes: Stroke[] | null
  answer_mode: AnswerMode
  tags: string[]
  progress?: FileProgress
}

export interface FileProgress {
  ease: number
  interval_days: number
  repetitions: number
  due_date: string
  last_grade: Grade | null
  first_studied_on: string
}

const MODES = ['flip', 'draw']
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Validate an untrusted JSON value as a DeckFile. Throws an Error with a readable message. */
export function parseDeckFile(json: unknown): DeckFile {
  const fail = (msg: string): never => {
    throw new Error(`This doesn't look like a sketchcards file: ${msg}`)
  }
  if (!json || typeof json !== 'object') fail('not a JSON object.')
  const f = json as Record<string, unknown>
  if (f.app !== 'sketchcards') fail('missing "app": "sketchcards".')
  if (f.version !== 1) fail(`unsupported version ${String(f.version)}.`)
  if (!Array.isArray(f.decks)) fail('"decks" must be a list.')

  const decks = (f.decks as unknown[]).map((d, i): FileDeck => {
    const deck = (d ?? {}) as Record<string, unknown>
    const where = `deck ${i + 1}`
    if (typeof deck.name !== 'string' || !deck.name.trim()) fail(`${where} has no name.`)
    if (!Array.isArray(deck.cards)) fail(`${where} has no "cards" list.`)
    return {
      name: String(deck.name).trim().slice(0, 200),
      default_answer_mode: MODES.includes(deck.default_answer_mode as string) ? (deck.default_answer_mode as AnswerMode) : 'flip',
      new_per_day: typeof deck.new_per_day === 'number' ? Math.max(0, Math.min(1000, Math.round(deck.new_per_day))) : null,
      cards: (deck.cards as unknown[]).map((c, j) => parseCard(c, `${where}, card ${j + 1}`, fail)),
    }
  })
  return { app: 'sketchcards', version: 1, exported_at: typeof f.exported_at === 'string' ? f.exported_at : null, decks }
}

function parseCard(value: unknown, where: string, fail: (m: string) => never): FileCard {
  if (!value || typeof value !== 'object') fail(`${where} is not an object.`)
  const c = value as Record<string, unknown>
  const str = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : '')
  const img = (k: string) => {
    const v = c[k]
    if (v == null || v === '') return null
    if (typeof v !== 'string' || !/^(data:image\/|https?:\/\/|\/)/.test(v)) fail(`${where} has an invalid ${k}.`)
    return v as string
  }
  let strokes: Stroke[] | null = null
  if (c.back_strokes != null) {
    strokes = parseStrokes(c.back_strokes)
    if (!strokes) fail(`${where} has invalid back_strokes.`)
  }
  const card: FileCard = {
    front_text: str('front_text'),
    front_image: img('front_image'),
    back_text: str('back_text'),
    back_image: img('back_image'),
    back_strokes: strokes?.length ? strokes : null,
    answer_mode: MODES.includes(c.answer_mode as string) ? (c.answer_mode as AnswerMode) : 'flip',
    tags: Array.isArray(c.tags) ? c.tags.filter((t): t is string => typeof t === 'string' && !!t.trim()) : [],
  }
  const p = c.progress as Record<string, unknown> | undefined
  if (p && typeof p === 'object' && typeof p.due_date === 'string' && DATE.test(p.due_date)) {
    card.progress = {
      ease: typeof p.ease === 'number' ? Math.max(1.3, p.ease) : 2.5,
      interval_days: typeof p.interval_days === 'number' ? Math.max(0, Math.round(p.interval_days)) : 0,
      repetitions: typeof p.repetitions === 'number' ? Math.max(0, Math.round(p.repetitions)) : 0,
      due_date: p.due_date,
      last_grade: ['missed', 'close', 'got'].includes(p.last_grade as string) ? (p.last_grade as Grade) : null,
      first_studied_on: typeof p.first_studied_on === 'string' && DATE.test(p.first_studied_on) ? p.first_studied_on : p.due_date,
    }
  }
  return card
}
