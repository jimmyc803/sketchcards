import { describe, expect, it } from 'vitest'
import { calendarWeeks, currentStreak, lastNDays, level, longestStreak, totalReviews } from './streak'

const today = '2026-10-07' // a Wednesday

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    expect(currentStreak({ '2026-10-05': 3, '2026-10-06': 1, '2026-10-07': 8 }, today)).toBe(3)
  })
  it('is still alive if you studied yesterday but not yet today', () => {
    expect(currentStreak({ '2026-10-05': 3, '2026-10-06': 1 }, today)).toBe(2)
  })
  it('breaks after a missed day', () => {
    expect(currentStreak({ '2026-10-04': 3, '2026-10-05': 2 }, today)).toBe(0)
    expect(currentStreak({ '2026-10-03': 1, '2026-10-05': 2, '2026-10-06': 1, '2026-10-07': 1 }, today)).toBe(3)
  })
  it('handles month boundaries', () => {
    expect(currentStreak({ '2026-09-30': 1, '2026-10-01': 1 }, '2026-10-01')).toBe(2)
  })
  it('is 0 with no history', () => {
    expect(currentStreak({}, today)).toBe(0)
  })
})

describe('other stats', () => {
  it('longest streak across the whole history', () => {
    expect(longestStreak({ '2026-09-01': 1, '2026-09-02': 1, '2026-09-03': 1, '2026-09-10': 1, '2026-09-11': 1 })).toBe(3)
    expect(longestStreak({})).toBe(0)
  })
  it('last 7 days includes today and excludes older days', () => {
    expect(lastNDays({ '2026-10-07': 5, '2026-10-01': 2, '2026-09-30': 100 }, today, 7)).toBe(7)
  })
  it('totals and shading levels', () => {
    expect(totalReviews({ a: 2, b: 3 })).toBe(5)
    expect([0, 1, 10, 25, 50].map(level)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('calendarWeeks', () => {
  it('builds Sunday-first weeks ending with the week of today', () => {
    const weeks = calendarWeeks({ '2026-10-07': 4 }, today, 4)
    expect(weeks).toHaveLength(4)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    const last = weeks[3]
    expect(last[0].date).toBe('2026-10-04') // Sunday
    expect(last[3]).toEqual({ date: '2026-10-07', count: 4, future: false })
    expect(last[4].future).toBe(true)
    expect(weeks[0][0].date).toBe('2026-09-13')
  })
})
