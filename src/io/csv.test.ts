import { describe, expect, it } from 'vitest'
import { csvToCards, parseCsv } from './csv'

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas and newlines in fields, CRLF and BOM', () => {
    const { rows } = parseCsv('﻿front,back\r\n"a, b","say ""hi"""\r\n"multi\nline",x\n')
    expect(rows).toEqual([
      ['front', 'back'],
      ['a, b', 'say "hi"'],
      ['multi\nline', 'x'],
    ])
  })
  it('reports an unclosed quote with its line number', () => {
    expect(parseCsv('front,back\nok,fine\n"broken,x\n').error).toMatch(/Line 3/)
  })
  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n,\nc,d').rows).toEqual([['a', 'b'], ['c', 'd']])
  })
})

describe('csvToCards', () => {
  it('reads front,back,tags with a header in any order', () => {
    const r = csvToCards('tags,back,front\n"bio; chem",answer,question')
    expect(r).toEqual({ cards: [{ front: 'question', back: 'answer', tags: ['bio', 'chem'] }], errors: [], warnings: [] })
  })
  it('falls back to positional columns without a header, with a warning', () => {
    const r = csvToCards('q1,a1,t\nq2,a2')
    expect(r.cards).toHaveLength(2)
    expect(r.warnings[0]).toMatch(/No header/)
  })
  it('gives row-numbered errors and keeps the good rows', () => {
    const r = csvToCards('front,back\ngood,1\n,missing front\nonlyone')
    expect(r.cards.map((c) => c.front)).toEqual(['good'])
    expect(r.errors).toEqual(['Row 3: the front is empty.', 'Row 4: expected at least 2 columns (front, back), found 1.'])
  })
  it('explains a missing back column and an empty file', () => {
    expect(csvToCards('front,answer\nq,a').errors[0]).toMatch(/no "back"/)
    expect(csvToCards('').errors[0]).toMatch(/empty/)
  })
})
