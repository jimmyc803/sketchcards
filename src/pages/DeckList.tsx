import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { makeDeck, saveDeck, useData } from '../data/store'
import type { Deck } from '../data/types'
import ModePicker from '../components/ModePicker'
import { useDefaultNewPerDay } from '../lib/prefs'
import { deckCounts } from '../srs/queue'
import { todayLocal } from '../srs/scheduler'

export default function DeckList() {
  const decks = useData((s) => s.decks)
  const ready = useData((s) => s.ready)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className="page-head">
        <h1>Decks</h1>
        <span className="spacer" />
        <button className="btn primary" onClick={() => setCreating(true)}>
          New deck
        </button>
      </div>

      {creating && <NewDeckForm onDone={() => setCreating(false)} />}

      {decks.length === 0 ? (
        <div className="empty">
          {ready ? <p>No decks yet. Create one to get started.</p> : <p>Loading your decks…</p>}
        </div>
      ) : (
        <div className="deck-grid">
          {decks.map((d) => (
            <DeckTile key={d.id} deck={d} />
          ))}
        </div>
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
    <form className="panel stack" onSubmit={submit} style={{ marginBottom: '1rem' }}>
      <label className="field">
        <span>Deck name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic chemistry" />
      </label>
      <div className="row">
        <span className="muted">Cards default to</span>
        <ModePicker value={mode} onChange={setMode} />
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={onDone}>
          Cancel
        </button>
        <button className="btn primary" disabled={!name.trim()}>
          Create
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

  return (
    <article className="panel deck-tile">
      <h2>
        <Link to={`/deck/${deck.id}`}>{deck.name}</Link>
      </h2>
      <div className="due">
        <strong>{total}</strong> <span className="muted">to study today</span>
        <div className="muted" style={{ fontSize: '0.85rem' }}>
          {due} due · {newCount} new · {cards.length} cards
          {deck.default_answer_mode === 'draw' && ' · ✎ draw'}
        </div>
      </div>
      <div className="row">
        <Link className={`btn ${total ? 'primary' : ''}`} to={`/study/${deck.id}`} aria-disabled={!total}>
          Study
        </Link>
        <Link className="btn" to={`/deck/${deck.id}`}>
          Cards
        </Link>
      </div>
    </article>
  )
}
