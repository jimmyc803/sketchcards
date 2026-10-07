import { describe, expect, it } from 'vitest'
import { current, gradeCurrent, isDone, isFirstAttempt, startSession } from './session'

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
})
