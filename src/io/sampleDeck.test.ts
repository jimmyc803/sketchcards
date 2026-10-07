import { describe, expect, it } from 'vitest'
import { CANVAS_H, CANVAS_W } from '../data/types'
import { parseDeckFile } from './deckFile'
import { sampleDeck } from './sampleDeck'

describe('sample deck', () => {
  const deck = parseDeckFile(sampleDeck()).decks[0]

  it('is a small Welcome deck with flip and draw cards', () => {
    expect(deck.name).toBe('Welcome')
    expect(deck.cards.length).toBeGreaterThanOrEqual(5)
    expect(deck.cards.filter((c) => c.answer_mode === 'draw')).toHaveLength(2)
  })

  it('draw cards have sketched backs that fit the canvas', () => {
    for (const c of deck.cards.filter((c) => c.answer_mode === 'draw')) {
      expect(c.back_strokes!.length).toBeGreaterThan(3)
      for (const s of c.back_strokes!)
        for (const [x, y] of s.points) {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThanOrEqual(CANVAS_W)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(y).toBeLessThanOrEqual(CANVAS_H)
        }
    }
  })
})
