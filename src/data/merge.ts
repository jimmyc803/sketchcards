import type { OutboxOp } from './types'

interface Timestamped {
  updated_at: string
}

/**
 * Merge a full server snapshot with local state.
 * The server is the source of truth, except for rows that still have pending
 * local changes in the outbox: those keep the local version (or stay deleted).
 * Between two versions of the same row, the newer updated_at wins.
 */
export function mergeSnapshot<T extends Timestamped>(
  server: T[],
  local: T[],
  keyOf: (row: T) => string,
  pending: OutboxOp[],
): T[] {
  const pendingUpserts = new Set(pending.filter((o) => o.kind === 'upsert').map((o) => o.key))
  const pendingDeletes = new Set(pending.filter((o) => o.kind === 'delete').map((o) => o.key))
  const localByKey = new Map(local.map((r) => [keyOf(r), r]))

  const out = new Map<string, T>()
  for (const row of server) {
    const key = keyOf(row)
    if (pendingDeletes.has(key)) continue
    const mine = localByKey.get(key)
    out.set(key, mine && pendingUpserts.has(key) && newer(mine, row) ? mine : row)
  }
  // Rows created locally that the server hasn't seen yet.
  for (const key of pendingUpserts) {
    if (!out.has(key) && localByKey.has(key)) out.set(key, localByKey.get(key)!)
  }
  return [...out.values()]
}

export function newer(a: Timestamped, b: Timestamped) {
  return Date.parse(a.updated_at) >= Date.parse(b.updated_at)
}

/**
 * Collapse an outbox so there is one op per (table, key): it keeps the position of
 * the first op (so a deck is still created before its cards) with the content of the last.
 */
export function compactOutbox(ops: OutboxOp[]): OutboxOp[] {
  const index = new Map<string, number>()
  const out: OutboxOp[] = []
  for (const op of ops) {
    const id = `${op.table}:${op.key}`
    const at = index.get(id)
    if (at === undefined) {
      index.set(id, out.length)
      out.push(op)
    } else {
      out[at] = { ...op, seq: out[at].seq }
    }
  }
  return out
}
