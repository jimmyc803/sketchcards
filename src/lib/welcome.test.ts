import { describe, expect, it } from 'vitest'
import { decideWelcome } from './welcome'

describe('decideWelcome', () => {
  it('does nothing for accounts already welcomed (even with no decks: they deleted it)', () => {
    expect(decideWelcome({ welcomed: true, serverLoaded: true, deckCount: 0 })).toBe('skip')
  })
  it('waits for the server before deciding', () => {
    expect(decideWelcome({ welcomed: false, serverLoaded: false, deckCount: 0 })).toBe('wait')
  })
  it('creates the sample deck for a brand-new, empty account', () => {
    expect(decideWelcome({ welcomed: false, serverLoaded: true, deckCount: 0 })).toBe('create')
  })
  it('only marks existing accounts that already have decks', () => {
    expect(decideWelcome({ welcomed: false, serverLoaded: true, deckCount: 3 })).toBe('mark-only')
  })
})
