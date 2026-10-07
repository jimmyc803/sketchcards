import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Card, Deck, OutboxOp, Progress } from './types'

/** Light local cache so the app opens instantly and survives brief offline periods. */
interface CacheSchema extends DBSchema {
  decks: { key: string; value: Deck }
  cards: { key: string; value: Card }
  progress: { key: string; value: Progress }
  outbox: { key: number; value: OutboxOp }
  // Bytes + type rather than Blob: some Safari setups can't store Blobs in IndexedDB.
  images: { key: string; value: { type: string; data: ArrayBuffer } }
  meta: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<CacheSchema>> | null = null

function db(userId: string) {
  // One database per user so switching accounts never mixes data.
  dbPromise ??= openDB<CacheSchema>(`sketchcards-${userId}`, 1, {
    upgrade(d) {
      d.createObjectStore('decks', { keyPath: 'id' })
      d.createObjectStore('cards', { keyPath: 'id' })
      d.createObjectStore('progress', { keyPath: 'card_id' })
      d.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true })
      d.createObjectStore('images')
      d.createObjectStore('meta')
    },
  })
  return dbPromise
}

export function closeCache() {
  dbPromise?.then((d) => d.close())
  dbPromise = null
}

export interface Snapshot {
  decks: Deck[]
  cards: Card[]
  progress: Progress[]
}

export async function loadSnapshot(userId: string): Promise<Snapshot> {
  const d = await db(userId)
  const [decks, cards, progress] = await Promise.all([d.getAll('decks'), d.getAll('cards'), d.getAll('progress')])
  return { decks, cards, progress }
}

export async function saveSnapshot(userId: string, snap: Snapshot) {
  const d = await db(userId)
  const tx = d.transaction(['decks', 'cards', 'progress'], 'readwrite')
  await Promise.all([tx.objectStore('decks').clear(), tx.objectStore('cards').clear(), tx.objectStore('progress').clear()])
  await Promise.all([
    ...snap.decks.map((r) => tx.objectStore('decks').put(r)),
    ...snap.cards.map((r) => tx.objectStore('cards').put(r)),
    ...snap.progress.map((r) => tx.objectStore('progress').put(r)),
  ])
  await tx.done
}

export async function putRow(userId: string, op: OutboxOp) {
  const d = await db(userId)
  const tx = d.transaction([op.table, 'outbox'], 'readwrite')
  if (op.kind === 'upsert') await tx.objectStore(op.table).put(op.row as never)
  else await tx.objectStore(op.table).delete(op.key)
  await tx.objectStore('outbox').add(withoutSeq(op))
  await tx.done
}

/** Remove rows locally without queueing anything (used when the server cascades the delete). */
export async function deleteLocal(userId: string, table: 'cards' | 'progress', keys: string[]) {
  const d = await db(userId)
  const tx = d.transaction(table, 'readwrite')
  await Promise.all(keys.map((k) => tx.store.delete(k)))
  await tx.done
}

export async function readOutbox(userId: string): Promise<OutboxOp[]> {
  return (await db(userId)).getAll('outbox')
}

/**
 * Rewrite the outbox in a single transaction. `fn` receives the ops (with seq) and returns
 * the ops to keep; kept ops must retain their seq. Nothing written concurrently is lost.
 */
export async function rewriteOutbox(userId: string, fn: (ops: OutboxOp[]) => OutboxOp[]) {
  const d = await db(userId)
  const tx = d.transaction('outbox', 'readwrite')
  const ops = await tx.store.getAll()
  const keep = fn(ops)
  const keepSeqs = new Set(keep.map((o) => o.seq))
  await Promise.all([
    ...ops.filter((o) => !keepSeqs.has(o.seq)).map((o) => tx.store.delete(o.seq!)),
    ...keep.map((o) => tx.store.put(o)),
  ])
  await tx.done
}

export async function deleteOutboxOp(userId: string, seq: number) {
  await (await db(userId)).delete('outbox', seq)
}

export async function getCachedImage(userId: string, path: string): Promise<Blob | undefined> {
  try {
    const hit = await (await db(userId)).get('images', path)
    return hit && new Blob([hit.data], { type: hit.type })
  } catch {
    return undefined
  }
}

/** Best effort: a failed cache write never breaks showing the image. */
export async function putCachedImage(userId: string, path: string, blob: Blob) {
  try {
    await (await db(userId)).put('images', { type: blob.type, data: await blob.arrayBuffer() }, path)
  } catch (err) {
    console.warn('sketchcards: could not cache image offline', err)
  }
}

export async function deleteCachedImage(userId: string, path: string) {
  return (await db(userId)).delete('images', path)
}

function withoutSeq(op: OutboxOp): OutboxOp {
  const copy = { ...op }
  delete copy.seq // let IndexedDB assign the next sequence number
  return copy
}
