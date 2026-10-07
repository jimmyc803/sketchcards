import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CardImage from '../components/CardImage'
import CsvImport from '../components/CsvImport'
import ModePicker from '../components/ModePicker'
import { deleteCard, deleteDeck, duplicateCard, moveCard, saveDeck, useData } from '../data/store'
import type { Card, Deck } from '../data/types'
import { useDefaultNewPerDay } from '../lib/prefs'
import { downloadJson, exportDecks, safeFilename } from '../io/transfer'

export default function DeckView() {
  const { deckId } = useParams()
  const deck = useData((s) => s.decks.find((d) => d.id === deckId))
  const ready = useData((s) => s.ready)
  if (!deck) return <p className="muted">{ready ? 'Deck not found.' : 'Loading…'}</p>
  return <DeckBody key={deck.id} deck={deck} />
}

function DeckBody({ deck }: { deck: Deck }) {
  const allCards = useData((s) => s.cards)
  const decks = useData((s) => s.decks)
  const progress = useData((s) => s.progress)
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [csvOpen, setCsvOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const navigate = useNavigate()

  async function exportDeck() {
    setExporting(true)
    try {
      downloadJson(await exportDecks([deck.id]), `${safeFilename(deck.name)}.sketchcards.json`)
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : e}`)
    } finally {
      setExporting(false)
    }
  }

  const cards = useMemo(
    () => allCards.filter((c) => c.deck_id === deck.id).sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [allCards, deck.id],
  )
  const tags = useMemo(() => [...new Set(cards.flatMap((c) => c.tags))].sort(), [cards])
  const q = search.trim().toLowerCase()
  const visible = cards.filter(
    (c) =>
      tagFilter.every((t) => c.tags.includes(t)) &&
      (!q || c.front_text.toLowerCase().includes(q) || c.back_text.toLowerCase().includes(q)),
  )

  async function removeDeck() {
    if (!confirm(`Delete "${deck.name}" and its ${cards.length} cards? This can't be undone.`)) return
    await deleteDeck(deck.id)
    navigate('/')
  }

  return (
    <>
      <div className="page-head">
        <h1>{deck.name}</h1>
        <span className="muted">{cards.length} cards</span>
        <span className="spacer" />
        <Link className="btn primary" to={`/study/${deck.id}`}>
          Study
        </Link>
        <Link className="btn" to={`/deck/${deck.id}/new`}>
          Add card
        </Link>
        <button className="btn" onClick={() => setSettingsOpen((o) => !o)} aria-expanded={settingsOpen}>
          Deck settings
        </button>
      </div>

      {settingsOpen && (
        <DeckSettings deck={deck} onDelete={removeDeck}>
          <button className="btn" onClick={() => setCsvOpen(true)}>
            Import CSV
          </button>
          <button className="btn" onClick={exportDeck} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export deck (JSON)'}
          </button>
        </DeckSettings>
      )}
      {csvOpen && <CsvImport deck={deck} onClose={() => setCsvOpen(false)} />}

      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <input
          type="search"
          placeholder="Search cards"
          aria-label="Search cards"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 260 }}
        />
        {tags.length > 0 && (
          <div className="row" role="group" aria-label="Filter by tag">
            {tags.map((t) => (
              <button
                key={t}
                className="tag"
                aria-pressed={tagFilter.includes(t)}
                onClick={() => setTagFilter((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]))}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="empty">
          <p>No cards yet.</p>
          <Link className="btn primary" to={`/deck/${deck.id}/new`}>
            Add your first card
          </Link>
        </div>
      ) : (
        <ul className="card-list">
          {visible.map((c) => (
            <CardRow key={c.id} card={c} decks={decks} due={progress.get(c.id)?.due_date ?? null} />
          ))}
          {visible.length === 0 && <li className="muted">No cards match.</li>}
        </ul>
      )}
    </>
  )
}

function DeckSettings({ deck, onDelete, children }: { deck: Deck; onDelete: () => void; children: ReactNode }) {
  const defaultNew = useDefaultNewPerDay()
  const [name, setName] = useState(deck.name)
  return (
    <section className="panel stack" style={{ marginBottom: '1rem' }} aria-label="Deck settings">
      <div className="row">
        <label className="field" style={{ flex: 1, minWidth: 200 }}>
          <span>Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name.trim() !== deck.name && saveDeck({ ...deck, name: name.trim() })}
          />
        </label>
        <label className="field" style={{ width: 170 }}>
          <span>New cards per day</span>
          <input
            type="number"
            min={0}
            max={1000}
            placeholder={`Default (${defaultNew})`}
            value={deck.new_per_day ?? ''}
            onChange={(e) =>
              saveDeck({
                ...deck,
                new_per_day: e.target.value === '' ? null : Math.max(0, Math.min(1000, Number(e.target.value))),
              })
            }
          />
        </label>
      </div>
      <div className="row">
        <span className="muted">New cards default to</span>
        <ModePicker value={deck.default_answer_mode} onChange={(m) => saveDeck({ ...deck, default_answer_mode: m })} />
        <span className="spacer" />
        {children}
        <button className="btn danger" onClick={onDelete}>
          Delete deck
        </button>
      </div>
    </section>
  )
}

function CardRow({ card, decks, due }: { card: Card; decks: Deck[]; due: string | null }) {
  const [moving, setMoving] = useState(false)
  return (
    <li className="panel card-row">
      <div className="side">
        <Summary text={card.front_text} image={card.front_image} />
        <div className="meta">
          {card.answer_mode === 'draw' && <span className="tag">✎ draw</span>}
          {card.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="side muted">
        <Summary text={card.back_text} image={card.back_image} sketch={!!card.back_strokes?.length} />
        <div style={{ fontSize: '0.8rem' }}>{due ? `Due ${due}` : 'New'}</div>
      </div>
      <div className="row">
        <Link className="btn small" to={`/card/${card.id}`}>
          Edit
        </Link>
        <button className="btn small" onClick={() => duplicateCard(card)}>
          Duplicate
        </button>
        {moving ? (
          <select
            autoFocus
            aria-label="Move to deck"
            defaultValue=""
            onBlur={() => setMoving(false)}
            onChange={(e) => {
              if (e.target.value) void moveCard(card, e.target.value)
              setMoving(false)
            }}
            style={{ width: 'auto' }}
          >
            <option value="" disabled>
              Move to…
            </option>
            {decks
              .filter((d) => d.id !== card.deck_id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        ) : (
          <button className="btn small" onClick={() => setMoving(true)} disabled={decks.length < 2}>
            Move
          </button>
        )}
        <button
          className="btn small danger"
          onClick={() => confirm('Delete this card?') && deleteCard(card.id)}
          aria-label="Delete card"
        >
          Delete
        </button>
      </div>
    </li>
  )
}

function Summary({ text, image, sketch }: { text: string; image: string | null; sketch?: boolean }) {
  return (
    <div className="row" style={{ flexWrap: 'nowrap' }}>
      {image && <CardImage src={image} alt="" className="image-thumb" />}
      <span className="side">{text.split('\n')[0] || (image || sketch ? '' : '—')}</span>
      {sketch && <span className="tag">sketch</span>}
    </div>
  )
}
