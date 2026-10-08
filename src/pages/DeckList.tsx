import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { deleteDeck, makeDeck, saveDeck, useData } from '../data/store'
import type { Deck } from '../data/types'
import ModePicker from '../components/ModePicker'
import { useDefaultNewPerDay } from '../lib/prefs'
import { deckCounts } from '../srs/queue'
import { todayLocal } from '../srs/scheduler'
import { addSampleDeck, downloadJson, exportDecks, importDeckFile, safeFilename } from '../io/transfer'
import DeckMenu from '../components/DeckMenu'
import InstallHint from '../components/InstallHint'
import StreakLine from '../components/StreakLine'
import { CardsIcon, PlusIcon, PracticeIcon, StudyIcon } from '../components/icons'
import { deckColor } from '../lib/deckColor'

export default function DeckList() {
  const decks = useData((s) => s.decks)
  const ready = useData((s) => s.ready)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const hasSample = decks.some((d) => d.name.startsWith('Welcome'))

  async function run(label: string, fn: () => Promise<Deck[]>) {
    setBusy(label)
    setError(null)
    try {
      const created = await fn()
      if (created.length === 1) navigate(`/deck/${created[0].id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return
    await run('Importing…', async () => {
      let json: unknown
      try {
        json = JSON.parse(await file.text())
      } catch {
        throw new Error(`${file.name} isn't valid JSON.`)
      }
      return importDeckFile(json, (done, total) => setBusy(`Importing ${done}/${total}…`))
    })
  }

  const fileButtons = (
    <>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          void importFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button className="link-btn" onClick={() => fileInput.current?.click()} disabled={!!busy}>
        Import a deck file
      </button>
      <span aria-hidden="true">·</span>
      <button
        className="link-btn"
        onClick={() =>
          (!hasSample || confirm('You already have a Welcome deck. Add another copy?')) &&
          run('Adding sample deck…', addSampleDeck)
        }
        disabled={!!busy}
      >
        Add the sample deck
      </button>
    </>
  )

  return (
    <>
      <div className="page-head">
        <h1>My decks</h1>
        <span className="spacer" />
        {busy && (
          <span className="muted" role="status">
            {busy}
          </span>
        )}
        {!creating && (
          <button className="btn primary" onClick={() => setCreating(true)}>
            <PlusIcon /> New deck
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <StreakLine />
      <InstallHint />

      {creating && <NewDeckForm onDone={() => setCreating(false)} />}

      {decks.length === 0 ? (
        <div className="empty">
          {ready ? (
            <>
              <h2>Make your first deck</h2>
              <ol className="steps">
                <li>
                  <b>New deck</b> for a subject, like “Biology”
                </li>
                <li>
                  <b>Add cards</b>: a question on the front, the answer on the back
                </li>
                <li>
                  <b>Study</b>: we’ll bring each card back when it’s due
                </li>
              </ol>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn primary" onClick={() => setCreating(true)}>
                  <PlusIcon /> New deck
                </button>
              </div>
              <p className="file-actions">{fileButtons}</p>
            </>
          ) : (
            <p>Loading your decks…</p>
          )}
        </div>
      ) : (
        <>
          <div className="deck-grid">
            {decks.map((d) => (
              <DeckTile key={d.id} deck={d} />
            ))}
          </div>
          <p className="file-actions">{fileButtons}</p>
        </>
      )}
    </>
  )
}

function NewDeckForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Deck['default_answer_mode']>('flip')
  const navigate = useNavigate()

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const deck = await saveDeck(makeDeck(name.trim(), mode))
    onDone()
    navigate(`/deck/${deck.id}`)
  }

  return (
    <form className="panel stack new-deck" onSubmit={submit}>
      <h2>New deck</h2>
      <label className="field">
        <span>Name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic chemistry" />
      </label>
      <div className="field">
        <span>How will you answer these cards?</span>
        <ModePicker value={mode} onChange={setMode} />
        <small className="muted">You can change this for any card later.</small>
      </div>
      <div className="row">
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onDone}>
          Cancel
        </button>
        <button className="btn primary" disabled={!name.trim()}>
          Create deck
        </button>
      </div>
    </form>
  )
}

function DeckTile({ deck }: { deck: Deck }) {
  const allCards = useData((s) => s.cards)
  const progress = useData((s) => s.progress)
  const defaultNew = useDefaultNewPerDay()
  const cards = allCards.filter((c) => c.deck_id === deck.id)
  const { due, newCount } = deckCounts({
    cards,
    progress,
    today: todayLocal(),
    newPerDay: deck.new_per_day ?? defaultNew,
  })
  const total = due + newCount
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(deck.name)
  const [status, setStatus] = useState<string | null>(null)

  function finishRename(save: boolean) {
    const next = name.trim()
    if (save && next && next !== deck.name) void saveDeck({ ...deck, name: next })
    else setName(deck.name)
    setRenaming(false)
  }

  async function exportDeck() {
    setStatus('Exporting…')
    try {
      await downloadJson(await exportDecks([deck.id]), `${safeFilename(deck.name)}.sketchcards.json`)
      setStatus(null)
    } catch (e) {
      setStatus(`Export failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  function remove() {
    const what = cards.length ? `"${deck.name}" and its ${cards.length} card${cards.length === 1 ? '' : 's'}` : `"${deck.name}"`
    if (confirm(`Delete ${what}? This can't be undone. (Tip: Export first to keep a copy.)`)) void deleteDeck(deck.id)
  }

  return (
    <article className={`panel deck-tile tab-${deckColor(deck.id)}`}>
      <div className="deck-tile-head">
        {renaming ? (
          <input
            autoFocus
            aria-label="Deck name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => finishRename(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') finishRename(true)
              if (e.key === 'Escape') finishRename(false)
            }}
          />
        ) : (
          <h2>
            <Link to={`/deck/${deck.id}`}>{deck.name}</Link>
          </h2>
        )}
        <DeckMenu
          label={`More actions for ${deck.name}`}
          items={[
            { label: 'Rename', onSelect: () => (setName(deck.name), setRenaming(true)) },
            { label: 'Export to a file', onSelect: () => void exportDeck() },
            { label: 'Delete deck…', onSelect: remove, danger: true },
          ]}
        />
      </div>
      {status && (
        <p className="muted" role="status" style={{ margin: 0, fontSize: '0.85rem' }}>
          {status}
        </p>
      )}
      <p className="deck-meta muted">
        {cards.length} {cards.length === 1 ? 'card' : 'cards'}
        {deck.default_answer_mode === 'draw' && ' · drawn answers'}
      </p>
      <p className="due">
        {cards.length === 0 ? (
          <span className="muted">No cards yet</span>
        ) : total ? (
          <>
            <strong>{total}</strong> to study today
          </>
        ) : (
          <span className="muted">All caught up for today</span>
        )}
      </p>
      <div className="deck-actions">
        {cards.length === 0 ? (
          <Link className="btn primary" to={`/deck/${deck.id}/new`}>
            <PlusIcon /> Add cards
          </Link>
        ) : total ? (
          <Link className="btn primary" to={`/study/${deck.id}`}>
            <StudyIcon /> Study
          </Link>
        ) : (
          <Link className="btn" to={`/study/${deck.id}?mode=practice`} title="Go over every card. Doesn't change when they're due.">
            <PracticeIcon /> Practice
          </Link>
        )}
        <Link className="btn ghost" to={`/deck/${deck.id}`}>
          <CardsIcon /> Open deck
        </Link>
      </div>
    </article>
  )
}
