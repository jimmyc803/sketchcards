import { blobToDataUrl, dataUrlToBlob, fetchImageBlob, uploadImage } from '../data/images'
import { getState, isStoragePath, makeCard, makeDeck, saveCard, saveDeck, saveProgress } from '../data/store'
import type { Card, Deck } from '../data/types'
import { todayLocal } from '../srs/scheduler'
import type { CsvCard } from './csv'
import { parseDeckFile, type DeckFile, type FileCard } from './deckFile'
import { sampleDeck } from './sampleDeck'

/** Build a self-contained export: uploaded images are embedded as data URLs. */
export async function exportDecks(deckIds: string[], withProgress = true): Promise<DeckFile> {
  const { decks, cards, progress } = getState()
  const embed = async (ref: string | null) =>
    ref && isStoragePath(ref) ? blobToDataUrl(await fetchImageBlob(ref)) : ref
  const out: DeckFile = { app: 'sketchcards', version: 1, exported_at: new Date().toISOString(), decks: [] }
  for (const deck of decks.filter((d) => deckIds.includes(d.id))) {
    const deckCards = cards.filter((c) => c.deck_id === deck.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
    const fileCards: FileCard[] = []
    for (const c of deckCards) {
      const p = progress.get(c.id)
      fileCards.push({
        front_text: c.front_text,
        front_image: await embed(c.front_image),
        back_text: c.back_text,
        back_image: await embed(c.back_image),
        back_strokes: c.back_strokes,
        answer_mode: c.answer_mode,
        tags: c.tags,
        ...(withProgress && p
          ? {
              progress: {
                ease: p.ease,
                interval_days: p.interval_days,
                repetitions: p.repetitions,
                due_date: p.due_date,
                last_grade: p.last_grade,
                first_studied_on: p.first_studied_on,
              },
            }
          : {}),
      })
    }
    out.decks.push({
      name: deck.name,
      default_answer_mode: deck.default_answer_mode,
      new_per_day: deck.new_per_day,
      cards: fileCards,
    })
  }
  return out
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function safeFilename(name: string) {
  return name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'deck'
}

/** Import every deck in a file as new decks. Embedded images are uploaded to the user's storage. */
export async function importDeckFile(
  raw: unknown,
  onProgress?: (done: number, total: number) => void,
): Promise<Deck[]> {
  const file = parseDeckFile(raw)
  const hasDataImages = file.decks.some((d) =>
    d.cards.some((c) => c.front_image?.startsWith('data:') || c.back_image?.startsWith('data:')),
  )
  if (hasDataImages && !navigator.onLine) throw new Error("This file contains images, which can only be imported while you're online.")

  const existing = new Set(getState().decks.map((d) => d.name))
  const total = file.decks.reduce((n, d) => n + d.cards.length, 0)
  let done = 0
  const created: Deck[] = []
  const upload = async (ref: string | null) => (ref?.startsWith('data:') ? uploadImage(await dataUrlToBlob(ref)) : ref)

  for (const fd of file.decks) {
    let name = fd.name
    for (let n = 2; existing.has(name); n++) name = `${fd.name} (${n})`
    existing.add(name)
    const deck = await saveDeck({ ...makeDeck(name, fd.default_answer_mode), new_per_day: fd.new_per_day })
    created.push(deck)
    for (const fc of fd.cards) {
      const card: Card = makeCard(deck.id, {
        front_text: fc.front_text,
        front_image: await upload(fc.front_image),
        back_text: fc.back_text,
        back_image: await upload(fc.back_image),
        back_strokes: fc.back_strokes,
        answer_mode: fc.answer_mode,
        tags: fc.tags,
      })
      await saveCard(card)
      if (fc.progress) await saveProgress({ ...fc.progress, card_id: card.id, user_id: card.user_id, updated_at: '' })
      onProgress?.(++done, total)
    }
  }
  return created
}

export async function importCsvCards(deck: Deck, rows: CsvCard[]) {
  for (const r of rows) {
    await saveCard(
      makeCard(deck.id, { front_text: r.front, back_text: r.back, tags: r.tags, answer_mode: deck.default_answer_mode }),
    )
  }
}

export function addSampleDeck(): Promise<Deck[]> {
  return importDeckFile(sampleDeck())
}

export function backupFilename() {
  return `sketchcards-backup-${todayLocal()}.json`
}
