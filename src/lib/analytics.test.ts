import { describe, expect, it } from 'vitest'
import { anonymizeUrl } from './analytics'

describe('anonymizeUrl', () => {
  it('replaces deck/card IDs and drops query strings', () => {
    expect(
      anonymizeUrl(
        'https://sketchcards-mu.vercel.app/study/3f2a9c1e-1b2c-4d5e-8f90-1234567890ab?mode=practice&cards=aa,bb',
      ),
    ).toBe('https://sketchcards-mu.vercel.app/study/:id')
    expect(anonymizeUrl('https://x.app/card/3F2A9C1E-1B2C-4D5E-8F90-1234567890AB#top')).toBe('https://x.app/card/:id')
    expect(anonymizeUrl('https://x.app/deck/3f2a9c1e-1b2c-4d5e-8f90-1234567890ab/new')).toBe('https://x.app/deck/:id/new')
  })
  it('leaves plain pages alone', () => {
    expect(anonymizeUrl('https://x.app/settings')).toBe('https://x.app/settings')
  })
})
