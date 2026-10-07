import { parseTags } from '../lib/text'

/** RFC 4180-ish CSV parser: quoted fields, escaped quotes (""), commas and newlines inside quotes. */
export function parseCsv(text: string): { rows: string[][]; error?: string } {
  const src = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let line = 1
  let quoteStartLine = 0

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else {
        if (ch === '\n') line++
        field += ch
      }
    } else if (ch === '"' && field === '') {
      quoted = true
      quoteStartLine = line
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      line++
    } else {
      field += ch
    }
  }
  if (quoted) return { rows, error: `Line ${quoteStartLine}: a quoted field is never closed (missing ").` }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  return { rows: rows.filter((r) => r.some((c) => c.trim() !== '')) }
}

export interface CsvCard {
  front: string
  back: string
  tags: string[]
}

export interface CsvResult {
  cards: CsvCard[]
  errors: string[]
  warnings: string[]
}

/** Turn CSV text with columns front,back,tags into cards, with friendly errors. */
export function csvToCards(text: string): CsvResult {
  const { rows, error } = parseCsv(text)
  if (error) return { cards: [], errors: [error], warnings: [] }
  if (rows.length === 0) return { cards: [], errors: ['The file is empty.'], warnings: [] }

  const warnings: string[] = []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  let cols = { front: 0, back: 1, tags: 2 }
  let body = rows
  let firstLine = 1
  if (header.includes('front')) {
    if (!header.includes('back')) return { cards: [], errors: ['The header has "front" but no "back" column.'], warnings: [] }
    cols = { front: header.indexOf('front'), back: header.indexOf('back'), tags: header.indexOf('tags') }
    body = rows.slice(1)
    firstLine = 2
  } else {
    warnings.push('No header row found, so columns are read as front, back, tags.')
  }

  const cards: CsvCard[] = []
  const errors: string[] = []
  body.forEach((r, i) => {
    const n = i + firstLine
    const front = (r[cols.front] ?? '').trim()
    const back = (r[cols.back] ?? '').trim()
    if (r.length < 2) errors.push(`Row ${n}: expected at least 2 columns (front, back), found ${r.length}.`)
    else if (!front) errors.push(`Row ${n}: the front is empty.`)
    else cards.push({ front, back, tags: cols.tags >= 0 ? parseTags(r[cols.tags] ?? '') : [] })
  })
  if (!cards.length && !errors.length) errors.push('No cards found in the file.')
  return { cards, errors, warnings }
}
