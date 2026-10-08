import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CardImage from '../components/CardImage'
import CsvImport from '../components/CsvImport'
import DeckMenu from '../components/DeckMenu'
import ModePicker from '../components/ModePicker'
import { BackIcon, GearIcon, PlusIcon, PracticeIcon, StudyIcon } from '../components/icons'
import { deckColor } from '../lib/deckColor'
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
      await downloadJson(await exportDecks([deck.id]), `${safeFilename(deck.name)}.sketchcards.json`)
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
      <Link to="/" className="back-link">
        <BackIcon /> My decks
      </Link>
      <div className={`page-head deck-head tab-${deckColor(deck.id)}`}>
        <div>
          <h1>{deck.name}</h1>
          <p className="muted">
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
            {deck.default_answer_mode === 'draw' && ' · drawn answers'}
          </p>
        </div>
        <span className="spacer" />
        <Link className="btn primary" to={`/deck/${deck.id}/new`}>
          <PlusIcon /> Add card
        </Link>
        {cards.length > 0 && (
          <>
            <Link className="btn" to={`/study/${deck.id}`}>
              <StudyIcon /> Study
            </Link>
            <Link
              className="btn"
              to={`/study/${deck.id}?mode=practice`}
              title="Go over every card. Doesn't change when they're due."
            >
              <PracticeIcon /> Practice
            </Link>
          </>
        )}
        <button
          className="btn ghost"
          onClick={() => setSettingsOpen((o) => !o)}
          aria-expanded={settingsOpen}
        >
          <GearIcon /> Deck settings
        </button>
      </div>

      {settingsOpen && (
        <DeckSettings deck={deck} onDelete={removeDeck}>
          <button className="btn" onClick={() => setCsvOpen(true)}>
            Import cards from CSV
          </button>
          <button className="btn" onClick={exportDeck} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export to a file'}
          </button>
        </DeckSettings>
      )}
      {csvOpen && <CsvImport deck={deck} onClose={() => setCsvOpen(false)} />}

      {cards.length > 0 && (
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
      )}

      {cards.length === 0 ? (
        <div className="empty">
          <h2>This deck is empty</h2>
          <p>Each card has a front (the question) and a back (the answer).</p>
          <Link className="btn primary" to={`/deck/${deck.id}/new`}>
            <PlusIcon /> Add your first card
          </Link>
        </div>
      ) : (
        <ul className="card-list">
          {visible.map((c) => (
            <CardRow key={c.id} card={c} decks={decks} due={progress.get(c.id)?.due_date ?? null} />
          ))}
          {visible.length === 0 && <li className="muted">No cards match.</li>}
          <li>
            <Link className="add-row" to={`/deck/${deck.id}/new`}>
              <PlusIcon /> Add a card
            </Link>
          </li>
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
      <div className="field">
        <span>New cards are answered by</span>
        <ModePicker value={deck.default_answer_mode} onChange={(m) => saveDeck({ ...deck, default_answer_mode: m })} />
      </div>
      <div className="row">
        {children}
        <button className="btn danger" onClick={onDelete}>
          Delete deck…
        </button>
      </div>
    </section>
  )
}

function CardRow({ card, decks, due }: { card: Card; decks: Deck[]; due: string | null }) {
  const [moving, setMoving] = useState(false)
  const others = decks.filter((d) => d.id !== card.deck_id)
  return (
    <li className="panel card-row">
      <Link to={`/card/${card.id}`} className="card-row-main" aria-label="Edit card">
        <div className="side">
          <small className="side-label">Front</small>
          <Summary text={card.front_text} image={card.front_image} />
        </div>
        <div className="side">
          <small className="side-label">Back</small>
          <Summary text={card.back_text} image={card.back_image} sketch={!!card.back_strokes?.length} />
        </div>
      </Link>
      <div className="card-row-meta">
        {card.answer_mode === 'draw' && <span className="tag">Draw</span>}
        {card.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
        <span className="muted">{due ? `Due ${due}` : 'Not studied yet'}</span>
      </div>
      <div className="row card-row-actions">
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
            {others.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        ) : (
          <Link className="btn small" to={`/card/${card.id}`}>
            Edit
          </Link>
        )}
        <DeckMenu
          label="More actions for this card"
          items={[
            { label: 'Duplicate', onSelect: () => void duplicateCard(card) },
            ...(others.length ? [{ label: 'Move to another deck', onSelect: () => setMoving(true) }] : []),
            { label: 'Delete card…', onSelect: () => confirm('Delete this card?') && void deleteCard(card.id), danger: true },
          ]}
        />
      </div>
    </li>
  )
}

function Summary({ text, image, sketch }: { text: string; image: string | null; sketch?: boolean }) {
  return (
    <div className="row" style={{ flexWrap: 'nowrap' }}>
      {image && <CardImage src={image} alt="" className="image-thumb" />}
      <span className="side">{text.split('\n')[0] || (image || sketch ? '' : '(empty)')}</span>
      {sketch && <span className="tag">Sketch</span>}
    </div>
  )
}
