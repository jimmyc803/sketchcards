import { describe, expect, it } from 'vitest'
import { addDays, NEW_CARD, nextDue, schedule, todayLocal, type SrsState } from './scheduler'

describe('schedule', () => {
  it('new card defaults: ease 2.5, interval 0, repetitions 0', () => {
    expect(NEW_CARD).toEqual({ ease: 2.5, interval_days: 0, repetitions: 0 })
  })

  describe('missed', () => {
    it('resets repetitions and interval, lowers ease by 0.2', () => {
      expect(schedule({ ease: 2.5, interval_days: 10, repetitions: 4 }, 'missed')).toEqual({
        ease: 2.3,
        interval_days: 0,
        repetitions: 0,
      })
    })
    it('never drops ease below 1.3', () => {
      expect(schedule({ ease: 1.4, interval_days: 3, repetitions: 2 }, 'missed').ease).toBe(1.3)
      expect(schedule({ ease: 1.3, interval_days: 3, repetitions: 2 }, 'missed').ease).toBe(1.3)
    })
    it('is due again tomorrow', () => {
      expect(nextDue(schedule(NEW_CARD, 'missed'), '2026-03-10')).toBe('2026-03-11')
    })
  })

  describe('close', () => {
    it('grows interval by 1.2x, rounded, ease and repetitions unchanged', () => {
      expect(schedule({ ease: 2.2, interval_days: 10, repetitions: 3 }, 'close')).toEqual({
        ease: 2.2,
        interval_days: 12,
        repetitions: 3,
      })
    })
    it('interval is at least 1 (new card)', () => {
      expect(schedule(NEW_CARD, 'close').interval_days).toBe(1)
    })
    it('rounds small intervals (2 * 1.2 = 2.4 -> 2)', () => {
      expect(schedule({ ease: 2.5, interval_days: 2, repetitions: 1 }, 'close').interval_days).toBe(2)
    })
  })

  describe('got it', () => {
    it('repetitions 0 -> interval 1', () => {
      expect(schedule(NEW_CARD, 'got')).toEqual({ ease: 2.55, interval_days: 1, repetitions: 1 })
    })
    it('repetitions 1 -> interval 3', () => {
      expect(schedule({ ease: 2.55, interval_days: 1, repetitions: 1 }, 'got')).toEqual({
        ease: 2.6,
        interval_days: 3,
        repetitions: 2,
      })
    })
    it('otherwise interval * ease (using ease before the bump), rounded', () => {
      expect(schedule({ ease: 2.6, interval_days: 3, repetitions: 2 }, 'got')).toEqual({
        ease: 2.65,
        interval_days: 8, // round(3 * 2.6 = 7.8)
        repetitions: 3,
      })
    })
  })

  it('multi-step progression', () => {
    const today = '2026-01-01'
    let s: SrsState = NEW_CARD
    const steps: [Parameters<typeof schedule>[1], SrsState][] = [
      ['got', { ease: 2.55, interval_days: 1, repetitions: 1 }],
      ['got', { ease: 2.6, interval_days: 3, repetitions: 2 }],
      ['got', { ease: 2.65, interval_days: 8, repetitions: 3 }],
      ['close', { ease: 2.65, interval_days: 10, repetitions: 3 }],
      ['got', { ease: 2.7, interval_days: 27, repetitions: 4 }], // round(10 * 2.65 = 26.5)
      ['missed', { ease: 2.5, interval_days: 0, repetitions: 0 }],
      ['got', { ease: 2.55, interval_days: 1, repetitions: 1 }],
      ['got', { ease: 2.6, interval_days: 3, repetitions: 2 }],
    ]
    for (const [grade, expected] of steps) {
      s = schedule(s, grade)
      expect(s).toEqual(expected)
    }
    expect(nextDue(s, today)).toBe('2026-01-04')
  })
})

describe('dates', () => {
  it('formats local dates', () => {
    expect(todayLocal(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-07', 30)).toBe('2026-04-06')
  })
})
