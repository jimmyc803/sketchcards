import { describe, expect, it } from 'vitest'
import { gradeProgress, intervalLabel } from './grading'

const ids = { card_id: 'c', user_id: 'u' }

describe('gradeProgress', () => {
  it('first "got it" on a new card is due tomorrow and records the first study day', () => {
    const p = gradeProgress(undefined, 'got', '2026-05-01', ids)
    expect(p).toMatchObject({ interval_days: 1, repetitions: 1, due_date: '2026-05-02', first_studied_on: '2026-05-01', last_grade: 'got' })
  })

  it('keeps the original first study day', () => {
    const first = gradeProgress(undefined, 'got', '2026-05-01', ids)
    const second = gradeProgress(first, 'got', '2026-05-02', ids)
    expect(second).toMatchObject({ interval_days: 3, due_date: '2026-05-05', first_studied_on: '2026-05-01' })
  })

  it('missed is due tomorrow', () => {
    expect(gradeProgress(undefined, 'missed', '2026-05-01', ids).due_date).toBe('2026-05-02')
  })
})

describe('intervalLabel', () => {
  it('formats', () => {
    expect([0, 1, 3, 45, 400].map(intervalLabel)).toEqual(['tomorrow', 'tomorrow', '3d', '2mo', '1.1y'])
  })
})
