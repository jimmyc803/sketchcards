/**
 * SM-2 style scheduler. Pure: no I/O, no Supabase. Dates are local "YYYY-MM-DD" strings.
 */
import type { Grade } from '../data/types'

export interface SrsState {
  ease: number
  interval_days: number
  repetitions: number
}

export const NEW_CARD: SrsState = { ease: 2.5, interval_days: 0, repetitions: 0 }
export const MIN_EASE = 1.3

export function schedule(prev: SrsState, grade: Grade): SrsState {
  switch (grade) {
    case 'missed':
      return { ease: round2(Math.max(MIN_EASE, prev.ease - 0.2)), interval_days: 0, repetitions: 0 }
    case 'close':
      return { ...prev, interval_days: Math.max(1, Math.round(prev.interval_days * 1.2)) }
    case 'got': {
      const interval =
        prev.repetitions === 0 ? 1 : prev.repetitions === 1 ? 3 : Math.round(prev.interval_days * prev.ease)
      return { ease: round2(prev.ease + 0.05), interval_days: interval, repetitions: prev.repetitions + 1 }
    }
  }
}

/** Next due date. A missed card (interval 0) comes back tomorrow. */
export function nextDue(state: SrsState, today: string): string {
  return addDays(today, Math.max(1, state.interval_days))
}

export function todayLocal(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return todayLocal(new Date(y, m - 1, d + days))
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}
