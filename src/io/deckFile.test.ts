import { describe, expect, it } from 'vitest'
import { parseDeckFile } from './deckFile'
import example from '../../examples/amino-acids.json'

const file = (decks: unknown) => ({ app: 'sketchcards', version: 1, exported_at: null, decks })

describe('parseDeckFile', () => {
  it('accepts the example amino acid deck (self-contained Draw deck)', () => {
    const f = parseDeckFile(example)
    expect(f.decks[0].name).toBe('Amino acids')
    expect(f.decks[0].cards).toHaveLength(20)
    expect(f.decks[0].cards.every((c) => c.answer_mode === 'draw' && c.back_image?.startsWith('data:image/svg+xml;base64,'))).toBe(true)
  })

  it('round-trips strokes, data-URL images and progress', () => {
    const f = parseDeckFile(
      file([
        {
          name: 'D',
          default_answer_mode: 'draw',
          new_per_day: 5,
          cards: [
            {
              front_text: 'q',
              front_image: 'data:image/webp;base64,AAAA',
              back_text: 'a',
              back_strokes: [{ pen: true, points: [[1, 2, 0.5]] }],
              answer_mode: 'draw',
              tags: ['x', 3],
              progress: { ease: 2.1, interval_days: 4, repetitions: 2, due_date: '2026-05-01', last_grade: 'got', first_studied_on: '2026-04-01' },
            },
          ],
        },
      ]),
    )
    const c = f.decks[0].cards[0]
    expect(c.front_image).toBe('data:image/webp;base64,AAAA')
    expect(c.back_strokes).toEqual([{ pen: true, points: [[1, 2, 0.5]] }])
    expect(c.tags).toEqual(['x'])
    expect(c.progress).toMatchObject({ ease: 2.1, due_date: '2026-05-01' })
  })

  it('rejects other files with a readable message', () => {
    expect(() => parseDeckFile({ foo: 1 })).toThrow(/sketchcards/)
    expect(() => parseDeckFile(file([{ cards: [] }]))).toThrow(/deck 1 has no name/)
    expect(() => parseDeckFile(file([{ name: 'x', cards: [{ front_image: 'javascript:alert(1)' }] }]))).toThrow(/invalid front_image/)
  })
})
