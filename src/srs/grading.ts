import type { Grade, Progress } from '../data/types'
import { NEW_CARD, nextDue, schedule } from './scheduler'

/** New progress row after grading a card (pure; the caller saves it). */
export function gradeProgress(
  prev: Progress | undefined,
  grade: Grade,
  today: string,
  ids: { card_id: string; user_id: string },
): Progress {
  const next = schedule(prev ?? NEW_CARD, grade)
  return {
    ...ids,
    ...next,
    due_date: nextDue(next, today),
    last_grade: grade,
    first_studied_on: prev?.first_studied_on ?? today,
    updated_at: new Date().toISOString(),
  }
}

/** Human label for "when will I see this again", e.g. "tomorrow", "3d", "2mo". */
export function intervalLabel(days: number): string {
  const d = Math.max(1, days)
  if (d === 1) return 'tomorrow'
  if (d < 30) return `${d}d`
  if (d < 365) return `${Math.round(d / 30)}mo`
  return `${(d / 365).toFixed(1)}y`
}
