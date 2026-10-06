import { describe, expect, it } from 'vitest'
import { compactOutbox, mergeSnapshot } from './merge'
import type { OutboxOp } from './types'

type Row = { id: string; v: string; updated_at: string }
const row = (id: string, v: string, t: number): Row => ({ id, v, updated_at: new Date(t * 1000).toISOString() })
const key = (r: Row) => r.id
const up = (k: string, r: Row): OutboxOp => ({ table: 'decks', kind: 'upsert', key: k, row: r as never })
const del = (k: string): OutboxOp => ({ table: 'decks', kind: 'delete', key: k })

describe('mergeSnapshot', () => {
  it('takes the server version when nothing is pending', () => {
    expect(mergeSnapshot([row('a', 'server', 1)], [row('a', 'local', 5)], key, [])).toEqual([row('a', 'server', 1)])
  })

  it('drops local rows the server no longer has (deleted on another device)', () => {
    expect(mergeSnapshot([], [row('a', 'local', 1)], key, [])).toEqual([])
  })

  it('keeps a pending local edit when it is newer', () => {
    const local = row('a', 'local', 5)
    expect(mergeSnapshot([row('a', 'server', 1)], [local], key, [up('a', local)])).toEqual([local])
  })

  it('last write wins: a newer server row beats an older pending edit', () => {
    const local = row('a', 'local', 1)
    expect(mergeSnapshot([row('a', 'server', 5)], [local], key, [up('a', local)])).toEqual([row('a', 'server', 5)])
  })

  it('keeps rows created locally that have not been pushed yet', () => {
    const local = row('b', 'new', 2)
    expect(mergeSnapshot([row('a', 's', 1)], [local], key, [up('b', local)])).toEqual([row('a', 's', 1), local])
  })

  it('hides rows with a pending delete', () => {
    expect(mergeSnapshot([row('a', 's', 1)], [], key, [del('a')])).toEqual([])
  })
})

describe('compactOutbox', () => {
  it('keeps one op per key at the first position with the last content', () => {
    const ops: OutboxOp[] = [
      { ...up('deck', row('deck', 'v1', 1)), seq: 1 },
      { ...up('card', row('card', 'c', 2)), table: 'cards', seq: 2 } as OutboxOp,
      { ...up('deck', row('deck', 'v2', 3)), seq: 3 },
    ]
    const out = compactOutbox(ops)
    expect(out.map((o) => [o.table, o.key, o.seq])).toEqual([
      ['decks', 'deck', 1],
      ['cards', 'card', 2],
    ])
    expect((out[0] as { row: Row }).row.v).toBe('v2')
  })

  it('a delete replaces earlier upserts of the same row', () => {
    const out = compactOutbox([{ ...up('a', row('a', 'x', 1)), seq: 1 }, { ...del('a'), seq: 2 }])
    expect(out).toEqual([{ ...del('a'), seq: 1 }])
  })
})
