import { describe, expect, it } from 'vitest'
import type { Card, Progress } from '../data/types'
import { buildQueue, deckCounts } from './queue'

const card = (id: string, created = '2026-01-01T00:00:00Z'): Card => ({
  id,
  deck_id: 'd',
  user_id: 'u',
  front_text: id,
  front_image: null,
  back_text: '',
  back_image: null,
  back_strokes: null,
  answer_mode: 'flip',
  tags: [],
  created_at: created,
  updated_at: created,
})
const prog = (card_id: string, due_date: string, first_studied_on = '2026-01-01'): Progress => ({
  card_id,
  user_id: 'u',
  ease: 2.5,
  interval_days: 1,
  repetitions: 1,
  due_date,
  last_grade: 'got',
  first_studied_on,
  updated_at: '2026-01-01T00:00:00Z',
})

describe('buildQueue', () => {
  const today = '2026-02-10'

  it('includes due and overdue cards (oldest first), not future ones', () => {
    const cards = [card('a'), card('b'), card('c')]
    const progress = new Map([
      ['a', prog('a', '2026-02-10')],
      ['b', prog('b', '2026-02-01')],
      ['c', prog('c', '2026-02-11')],
    ])
    expect(buildQueue({ cards, progress, today, newPerDay: 10 }).map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('adds up to N new cards after due cards, oldest created first', () => {
    const cards = [card('n2', '2026-01-02T00:00:00Z'), card('n1', '2026-01-01T00:00:00Z'), card('n3', '2026-01-03T00:00:00Z'), card('d')]
    const progress = new Map([['d', prog('d', '2026-02-09')]])
    expect(buildQueue({ cards, progress, today, newPerDay: 2 }).map((c) => c.id)).toEqual(['d', 'n1', 'n2'])
  })

  it('counts new cards already introduced today against the limit', () => {
    const cards = [card('x'), card('y'), card('z')]
    const progress = new Map([['x', prog('x', '2026-02-11', today)]])
    expect(buildQueue({ cards, progress, today, newPerDay: 2 }).map((c) => c.id)).toEqual(['y'])
    expect(deckCounts({ cards, progress, today, newPerDay: 2 })).toEqual({ due: 0, newCount: 1, unseen: 2 })
  })

  it('newPerDay 0 means review only', () => {
    expect(buildQueue({ cards: [card('a')], progress: new Map(), today, newPerDay: 0 })).toEqual([])
  })
})
