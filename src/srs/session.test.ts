import { describe, expect, it } from 'vitest'
import { current, gradeCurrent, isDone, isFirstAttempt, keepOnly, shuffled, startSession } from './session'

describe('study session', () => {
  it('advances on got/close', () => {
    let s = startSession(['a', 'b'])
    s = gradeCurrent(s, 'got')
    expect(current(s)).toBe('b')
    s = gradeCurrent(s, 'close')
    expect(isDone(s)).toBe(true)
    expect(s.firstGrade).toEqual({ a: 'got', b: 'close' })
    expect(s.answered).toBe(2)
  })

  it('re-queues a missed card a few places later until answered correctly', () => {
    let s = startSession(['a', 'b', 'c', 'd', 'e'])
    s = gradeCurrent(s, 'missed')
    expect(s.queue).toEqual(['b', 'c', 'd', 'a', 'e'])
    expect(isFirstAttempt(s, 'a')).toBe(false)
  })

  it('a missed last card comes straight back', () => {
    let s = startSession(['a'])
    s = gradeCurrent(s, 'missed')
    expect(s.queue).toEqual(['a'])
    s = gradeCurrent(s, 'missed')
    expect(s.queue).toEqual(['a'])
    s = gradeCurrent(s, 'got')
    expect(isDone(s)).toBe(true)
    // only the first grade counts for scheduling
    expect(s.firstGrade).toEqual({ a: 'missed' })
  })

  it('skips cards deleted mid-session', () => {
    const s = startSession(['a', 'b', 'c'])
    expect(keepOnly(s, new Set(['a', 'b', 'c']))).toBe(s)
    const t = keepOnly(s, new Set(['a', 'c']))
    expect(t.queue).toEqual(['a', 'c'])
    expect(t.total).toBe(2)
  })

  it('shuffles practice cards without losing or duplicating any', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const out = shuffled(ids, random)
    expect([...out].sort()).toEqual(ids)
    expect(out).not.toEqual(ids)
    expect(ids).toEqual(['a', 'b', 'c', 'd', 'e']) // input untouched
  })
})
