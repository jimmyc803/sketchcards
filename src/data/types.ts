import type { PenColor } from '../draw/colors'

export type AnswerMode = 'flip' | 'draw'
export type Grade = 'missed' | 'close' | 'got'

/** One point: [x, y, pressure]. Coordinates are in the virtual canvas space (see CANVAS_W/H). */
export type Point = [number, number, number]

export interface Stroke {
  points: Point[]
  /** true when drawn with a pen (real pressure); false = simulate pressure from speed */
  pen: boolean
  /** Pen color key (see draw/colors.ts). Missing = "ink", which follows the theme. */
  color?: PenColor
}

/** All drawings live in a fixed 4:3 virtual space so they scale to any screen. */
export const CANVAS_W = 1000
export const CANVAS_H = 750

export interface Deck {
  id: string
  user_id: string
  name: string
  default_answer_mode: AnswerMode
  new_per_day: number | null
  created_at: string
  updated_at: string
}

export interface Card {
  id: string
  deck_id: string
  user_id: string
  front_text: string
  front_image: string | null
  back_text: string
  back_image: string | null
  back_strokes: Stroke[] | null
  answer_mode: AnswerMode
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Progress {
  card_id: string
  user_id: string
  ease: number
  interval_days: number
  repetitions: number
  /** YYYY-MM-DD (local date) */
  due_date: string
  last_grade: Grade | null
  first_studied_on: string
  updated_at: string
}

export type TableName = 'decks' | 'cards' | 'progress'

export interface TableRow {
  decks: Deck
  cards: Card
  progress: Progress
}

export const PRIMARY_KEY: Record<TableName, string> = {
  decks: 'id',
  cards: 'id',
  progress: 'card_id',
}

/** A pending local change that hasn't reached Supabase yet. */
export type OutboxOp =
  | { seq?: number; table: TableName; kind: 'upsert'; key: string; row: Deck | Card | Progress }
  | { seq?: number; table: TableName; kind: 'delete'; key: string }
