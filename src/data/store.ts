import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import * as cache from './cache'
import { compactOutbox, mergeSnapshot } from './merge'
import type { Card, Deck, OutboxOp, Progress, TableName } from './types'

/**
 * The app's data store. UI reads from an in-memory snapshot (loaded from IndexedDB
 * first, then refreshed from Supabase). Writes apply locally right away, go into an
 * outbox, and are pushed to Supabase when online. Supabase is the source of truth;
 * conflicts resolve last-write-wins on updated_at (enforced by a trigger server-side).
 */

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export interface DataState {
  userId: string | null
  ready: boolean
  /** True once this session has loaded the account's data from Supabase (not just the local cache). */
  serverLoaded: boolean
  decks: Deck[]
  cards: Card[]
  progress: Map<string, Progress>
  pending: number
  sync: SyncStatus
  syncError: string | null
}

let state: DataState = {
  userId: null,
  ready: false,
  serverLoaded: false,
  decks: [],
  cards: [],
  progress: new Map(),
  pending: 0,
  sync: 'idle',
  syncError: null,
}

const listeners = new Set<() => void>()

function set(patch: Partial<DataState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function getState() {
  return state
}

export function useData<T>(select: (s: DataState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => select(state),
  )
}

// ───────────────────────── lifecycle ─────────────────────────

let syncTimer: ReturnType<typeof setInterval> | undefined

export async function startSession(userId: string) {
  if (state.userId === userId) return
  stopSession()
  set({ userId, ready: false })
  const snap = await cache.loadSnapshot(userId)
  const outbox = await cache.readOutbox(userId)
  set({ ...fromSnapshot(snap), pending: outbox.length, ready: snap.decks.length > 0 })
  window.addEventListener('online', syncSoon)
  document.addEventListener('visibilitychange', onVisible)
  syncTimer = setInterval(syncSoon, 5 * 60_000)
  await syncNow()
  set({ ready: true })
}

export function stopSession() {
  window.removeEventListener('online', syncSoon)
  document.removeEventListener('visibilitychange', onVisible)
  clearInterval(syncTimer)
  cache.closeCache()
  set({ userId: null, ready: false, serverLoaded: false, decks: [], cards: [], progress: new Map(), pending: 0, sync: 'idle' })
}

function onVisible() {
  if (document.visibilityState === 'visible') syncSoon()
}

function fromSnapshot(snap: cache.Snapshot) {
  return {
    decks: sortDecks(snap.decks),
    cards: snap.cards,
    progress: new Map(snap.progress.map((p) => [p.card_id, p])),
  }
}

function sortDecks(decks: Deck[]) {
  return [...decks].sort((a, b) => a.name.localeCompare(b.name))
}

// ───────────────────────── sync ─────────────────────────

let syncing: Promise<void> | null = null
let again = false

export function syncSoon() {
  void syncNow()
}

export function syncNow(): Promise<void> {
  if (syncing) {
    again = true
    return syncing
  }
  syncing = (async () => {
    do {
      again = false
      await syncOnce()
    } while (again)
  })().finally(() => (syncing = null))
  return syncing
}

async function syncOnce() {
  const userId = state.userId
  if (!userId) return
  if (!navigator.onLine) {
    set({ sync: 'offline' })
    return
  }
  set({ sync: 'syncing', syncError: null })
  try {
    await flushOutbox(userId)
    const [decks, cards, progress] = await Promise.all([
      fetchAll<Deck>('decks'),
      fetchAll<Card>('cards'),
      fetchAll<Progress>('progress'),
    ])
    if (state.userId !== userId) return
    const pending = await cache.readOutbox(userId)
    const merged = {
      decks: mergeSnapshot(decks, state.decks, (r) => r.id, pending.filter((o) => o.table === 'decks')),
      cards: mergeSnapshot(cards, state.cards, (r) => r.id, pending.filter((o) => o.table === 'cards')),
      progress: mergeSnapshot(
        progress,
        [...state.progress.values()],
        (r) => r.card_id,
        pending.filter((o) => o.table === 'progress'),
      ),
    }
    await cache.saveSnapshot(userId, merged)
    set({ ...fromSnapshot(merged), pending: pending.length, sync: 'idle', serverLoaded: true })
  } catch (err) {
    const offline = !navigator.onLine || isNetworkError(err)
    set({ sync: offline ? 'offline' : 'error', syncError: offline ? null : messageOf(err) })
  }
}

async function fetchAll<T>(table: TableName): Promise<T[]> {
  const rows: T[] = []
  const page = 1000
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + page - 1)
    if (error) throw error
    rows.push(...(data as T[]))
    if (data.length < page) return rows
  }
}

async function flushOutbox(userId: string) {
  await cache.rewriteOutbox(userId, compactOutbox)
  for (const op of await cache.readOutbox(userId)) {
    const keyCol = op.table === 'progress' ? 'card_id' : 'id'
    const { error } =
      op.kind === 'upsert'
        ? await supabase.from(op.table).upsert(op.row as never, { onConflict: keyCol })
        : await supabase.from(op.table).delete().eq(keyCol, op.key)
    if (error && isNetworkError(error)) throw error
    if (error) console.warn(`sketchcards: dropped ${op.kind} on ${op.table}/${op.key}:`, error.message)
    await cache.deleteOutboxOp(userId, op.seq!)
    set({ pending: (await cache.readOutbox(userId)).length })
  }
}

function isNetworkError(err: unknown) {
  const msg = messageOf(err)
  return /fetch|network|load failed|timed? ?out/i.test(msg)
}

function messageOf(err: unknown) {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return String(err)
}

// ───────────────────────── writes ─────────────────────────

async function write(op: OutboxOp) {
  const userId = state.userId
  if (!userId) throw new Error('Not signed in')
  await cache.putRow(userId, op)
  set({ pending: state.pending + 1 })
  syncSoon()
}

let lastStamp = 0

/** Strictly increasing timestamps, so cards created in a burst keep their order and edits never tie. */
export function now() {
  lastStamp = Math.max(Date.now(), lastStamp + 1)
  return new Date(lastStamp).toISOString()
}

export function newId() {
  return crypto.randomUUID()
}

export async function saveDeck(deck: Deck) {
  const row = { ...deck, updated_at: now() }
  set({ decks: sortDecks([...state.decks.filter((d) => d.id !== row.id), row]) })
  await write({ table: 'decks', kind: 'upsert', key: row.id, row })
  return row
}

export async function deleteDeck(deckId: string) {
  const removedCards = state.cards.filter((c) => c.deck_id === deckId)
  const progress = new Map(state.progress)
  removedCards.forEach((c) => progress.delete(c.id))
  set({
    decks: state.decks.filter((d) => d.id !== deckId),
    cards: state.cards.filter((c) => c.deck_id !== deckId),
    progress,
  })
  // The database cascades cards and progress, so just drop them locally
  // (including any of their changes still waiting in the outbox).
  const userId = state.userId!
  const ids = new Set(removedCards.map((c) => c.id))
  await cache.deleteLocal(userId, 'cards', [...ids])
  await cache.deleteLocal(userId, 'progress', [...ids])
  await cache.rewriteOutbox(userId, (ops) => ops.filter((o) => o.table === 'decks' || !ids.has(o.key)))
  set({ pending: (await cache.readOutbox(userId)).length })
  await write({ table: 'decks', kind: 'delete', key: deckId })
  await releaseImages(removedCards)
}

export async function saveCard(card: Card) {
  const row = { ...card, updated_at: now() }
  set({ cards: [...state.cards.filter((c) => c.id !== row.id), row] })
  await write({ table: 'cards', kind: 'upsert', key: row.id, row })
  return row
}

export async function saveCards(cards: Card[]) {
  for (const c of cards) await saveCard(c)
}

export async function deleteCard(cardId: string) {
  const card = state.cards.find((c) => c.id === cardId)
  const progress = new Map(state.progress)
  progress.delete(cardId)
  set({ cards: state.cards.filter((c) => c.id !== cardId), progress })
  await write({ table: 'cards', kind: 'delete', key: cardId })
  if (card) await releaseImages([card])
}

export async function saveProgress(p: Progress) {
  const row = { ...p, updated_at: now() }
  const progress = new Map(state.progress)
  progress.set(row.card_id, row)
  set({ progress })
  await write({ table: 'progress', kind: 'upsert', key: row.card_id, row })
  return row
}

/** Delete uploaded images no remaining card references (duplicated cards share images). */
async function releaseImages(removed: Card[]) {
  await releaseImagePaths(removed.flatMap((c) => [c.front_image, c.back_image]))
}

export async function releaseImagePaths(paths: (string | null | undefined)[]) {
  const inUse = new Set(state.cards.flatMap((c) => [c.front_image, c.back_image]))
  const orphans = paths.filter((p): p is string => !!p && isStoragePath(p) && !inUse.has(p))
  if (orphans.length === 0 || !navigator.onLine) return
  await supabase.storage.from('card-images').remove([...new Set(orphans)])
}

// ───────────────────────── factories ─────────────────────────

export function makeDeck(name: string, mode: Deck['default_answer_mode'] = 'flip'): Deck {
  const t = now()
  return {
    id: newId(),
    user_id: state.userId!,
    name,
    default_answer_mode: mode,
    new_per_day: null,
    created_at: t,
    updated_at: t,
  }
}

export function makeCard(deckId: string, fields: Partial<Card> = {}): Card {
  const t = now()
  return {
    id: newId(),
    deck_id: deckId,
    user_id: state.userId!,
    front_text: '',
    front_image: null,
    back_text: '',
    back_image: null,
    back_strokes: null,
    answer_mode: 'flip',
    tags: [],
    ...fields,
    created_at: t,
    updated_at: t,
  }
}

export async function duplicateCard(card: Card) {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = card
  void _id
  void _c
  void _u
  return saveCard(makeCard(card.deck_id, rest))
}

export async function moveCard(card: Card, deckId: string) {
  return saveCard({ ...card, deck_id: deckId })
}

/** Storage paths look like "<uid>/<file>"; plain URLs and data: URLs are left alone. */
export function isStoragePath(p: string) {
  return !p.startsWith('/') && !/^[a-z]+:/i.test(p)
}
