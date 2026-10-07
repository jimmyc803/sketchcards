import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { closeCache, getCachedImage, loadSnapshot, putCachedImage, putRow, readOutbox } from './cache'

describe('cache', () => {
  it('repairs a database that exists without stores', async () => {
    await new Promise<void>((res) => {
      const r = indexedDB.open('sketchcards-u1') // creates an empty v1 database
      r.onsuccess = () => {
        r.result.close()
        res()
      }
    })
    expect(await loadSnapshot('u1')).toEqual({ decks: [], cards: [], progress: [] })
    closeCache()
  })

  it('stores rows with an outbox entry, and images as bytes', async () => {
    const deck = { id: 'd', user_id: 'u2', name: 'D', default_answer_mode: 'flip' as const, new_per_day: null, created_at: 't', updated_at: 't' }
    await putRow('u2', { table: 'decks', kind: 'upsert', key: 'd', row: deck })
    expect((await loadSnapshot('u2')).decks).toEqual([deck])
    expect(await readOutbox('u2')).toHaveLength(1)
    await putCachedImage('u2', 'u2/x.webp', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }))
    const blob = await getCachedImage('u2', 'u2/x.webp')
    expect(blob?.type).toBe('image/webp')
    expect(blob?.size).toBe(3)
    closeCache()
  })
})
