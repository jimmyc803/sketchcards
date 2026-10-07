/**
 * Streaks and activity from per-day review counts. Pure: dates are local "YYYY-MM-DD" strings.
 */
import { addDays } from '../srs/scheduler'

export type DayCounts = Record<string, number>

/**
 * Days in a row with at least one review, ending today, or ending yesterday if you haven't
 * studied yet today (the streak is still alive until the day is over).
 */
export function currentStreak(days: DayCounts, today: string): number {
  let day = days[today] ? today : addDays(today, -1)
  let n = 0
  while (days[day]) {
    n++
    day = addDays(day, -1)
  }
  return n
}

export function longestStreak(days: DayCounts): number {
  const active = Object.keys(days)
    .filter((d) => days[d] > 0)
    .sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const d of active) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  return best
}

/** Reviews in the last `n` days, including today. */
export function lastNDays(days: DayCounts, today: string, n: number): number {
  let total = 0
  for (let i = 0; i < n; i++) total += days[addDays(today, -i)] ?? 0
  return total
}

export function totalReviews(days: DayCounts): number {
  return Object.values(days).reduce((a, b) => a + b, 0)
}

/** 0–4 shade for the activity calendar. */
export function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count < 10) return 1
  if (count < 25) return 2
  if (count < 50) return 3
  return 4
}

export interface CalendarCell {
  date: string
  count: number
  future: boolean
}

/**
 * A GitHub-style grid: columns are weeks (Sunday first), the last column contains today.
 * Returns `weeks` columns of 7 cells each.
 */
export function calendarWeeks(days: DayCounts, today: string, weeks: number): CalendarCell[][] {
  const [y, m, d] = today.split('-').map(Number)
  const weekday = new Date(y, m - 1, d).getDay() // 0 = Sunday
  const start = addDays(today, -weekday - (weeks - 1) * 7)
  const out: CalendarCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const col: CalendarCell[] = []
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, w * 7 + i)
      col.push({ date, count: days[date] ?? 0, future: date > today })
    }
    out.push(col)
  }
  return out
}
