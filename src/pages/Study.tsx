import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import CardFace from '../components/CardFace'
import Compare from '../components/Compare'
import DrawPad from '../components/DrawPad'
import { getState, saveProgress, useData } from '../data/store'
import type { Card, Deck, Grade, Stroke } from '../data/types'
import { hasVisualReference } from '../lib/cards'
import { penRecentlyActive } from '../draw/penActivity'
import { useDefaultNewPerDay } from '../lib/prefs'
import { gradeProgress, intervalLabel } from '../srs/grading'
import { buildQueue } from '../srs/queue'
import { schedule, NEW_CARD, todayLocal } from '../srs/scheduler'
import * as S from '../srs/session'

interface GradeButton {
  grade: Grade
  label: string
  keys: string[]
}

const GRADES: GradeButton[] = [
  { grade: 'missed', label: 'Missed', keys: ['1'] },
  { grade: 'close', label: 'Close', keys: ['2'] },
  { grade: 'got', label: 'Got it', keys: ['3'] },
]

/** Practice doesn't schedule anything, so it only needs "show me this again" or "next". */
const PRACTICE_GRADES: GradeButton[] = [
  { grade: 'missed', label: 'Again', keys: ['1'] },
  { grade: 'got', label: 'Got it', keys: ['2', '3'] },
]

export default function Study() {
  const { deckId } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const deck = useData((s) => s.decks.find((d) => d.id === deckId))
  const ready = useData((s) => s.ready)
  if (!deck) return <p className="muted">{ready ? 'Deck not found.' : 'Loading…'}</p>
  if (!ready) return <p className="muted">Loading…</p>
  // Keyed by location so "Practice again" (same URL) starts a fresh session.
  const only = params.get('cards')?.split(',').filter(Boolean)
  return (
    <StudySession key={location.key} deck={deck} practice={params.get('mode') === 'practice'} only={only} />
  )
}

/**
 * practice = quiz every card in the deck, shuffled. Missed cards still come back, but grades
 * don't touch the schedule, so practicing never changes due dates.
 */
function StudySession({ deck, practice, only }: { deck: Deck; practice: boolean; only?: string[] }) {
  const buttons = practice ? PRACTICE_GRADES : GRADES
  const defaultNew = useDefaultNewPerDay()
  const [today] = useState(todayLocal)
  // The queue is fixed when the session starts; later syncs don't reshuffle it.
  const [rawSession, setSession] = useState(() => {
    const { cards, progress } = getState()
    const deckCards = cards.filter((c) => c.deck_id === deck.id)
    if (practice) {
      const pool = only ? deckCards.filter((c) => only.includes(c.id)) : deckCards
      return S.startSession(S.shuffled(pool.map((c) => c.id)))
    }
    const queue = buildQueue({ cards: deckCards, progress, today, newPerDay: deck.new_per_day ?? defaultNew })
    return S.startSession(queue.map((c) => c.id))
  })
  const [flipped, setFlipped] = useState(false)
  // The user's sketch for the current card. Never saved anywhere.
  const [drawing, setDrawing] = useState<Stroke[]>([])
  const [overlay, setOverlay] = useState(false)
  const cards = useData((s) => s.cards)
  const progress = useData((s) => s.progress)
  // Cards deleted mid-session (e.g. on another device) are skipped.
  const session = useMemo(() => S.keepOnly(rawSession, new Set(cards.map((c) => c.id))), [rawSession, cards])
  const cardId = S.current(session)
  const card = cards.find((c) => c.id === cardId)

  const grade = useCallback(
    (g: Grade) => {
      if (!card || !flipped) return
      // Advance first so a fast double-press can't grade the same card twice.
      setSession(S.gradeCurrent(session, g))
      setFlipped(false)
      setDrawing([])
      if (!practice && S.isFirstAttempt(session, card.id)) {
        void saveProgress(gradeProgress(progress.get(card.id), g, today, { card_id: card.id, user_id: card.user_id }))
      }
    },
    [card, flipped, session, progress, today, practice],
  )

  // Keyboard: Space/Enter flips, 1/2/3 grade, O toggles overlay. The listener is attached once
  // and reads the latest state through a ref, so fast key presses never hit stale state.
  const keyState = useRef({ flipped, grade, buttons })
  useLayoutEffect(() => {
    keyState.current = { flipped, grade, buttons }
  })
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const { flipped, grade, buttons } = keyState.current
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        keyState.current = { ...keyState.current, flipped: true }
        setFlipped(true)
      } else if (flipped && e.key.toLowerCase() === 'o') {
        setOverlay((o) => !o)
      } else if (flipped) {
        const g = buttons.find((x) => x.keys.includes(e.key))
        if (g) {
          e.preventDefault()
          keyState.current = { ...keyState.current, flipped: false }
          grade(g.grade)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Palm guard: while drawing, a resting palm can "tap" Show answer, a grade button, or the
  // prompt card. Ignore finger taps on the study page right after Pencil use; Pencil taps,
  // mouse clicks and the keyboard are unaffected.
  const isDraw = card?.answer_mode === 'draw'
  useEffect(() => {
    if (!isDraw) return
    let lastType = ''
    const onDown = (e: PointerEvent) => (lastType = e.pointerType)
    const onClick = (e: MouseEvent) => {
      const inStudy = e.target instanceof Element && e.target.closest('.study')
      const isDrawingTool = e.target instanceof Element && e.target.closest('.drawpad-tools')
      if (inStudy && !isDrawingTool && lastType === 'touch' && penRecentlyActive()) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('click', onClick, true)
    }
  }, [isDraw])

  if (session.total === 0) {
    return (
      <div className="empty">
        <h1>{practice ? `${deck.name} has no cards yet` : `You're done with ${deck.name} for today`}</h1>
        {!practice && <p>No cards are due and you've reached today's new-card limit.</p>}
        <div className="row" style={{ justifyContent: 'center' }}>
          {!practice && (
            <Link className="btn primary" to={`/study/${deck.id}?mode=practice`}>
              Practice anyway
            </Link>
          )}
          <Link className="btn" to={`/deck/${deck.id}`}>
            Back to deck
          </Link>
        </div>
        {!practice && <p className="muted">Practice quizzes every card without changing when they're due.</p>}
      </div>
    )
  }
  if (S.isDone(session)) return <Summary deck={deck} session={session} cards={cards} practice={practice} />
  if (!card) return null

  const first = S.isFirstAttempt(session, card.id)
  const prev = progress.get(card.id) ?? NEW_CARD

  return (
    <div className="study">
      <h1 className="sr-only">
        {practice ? 'Practicing' : 'Studying'} {deck.name}
      </h1>
      <div className="row">
        <Link to={`/deck/${deck.id}`} className="muted">
          ← {deck.name}
        </Link>
        {practice && <span className="tag">Practice · schedule unchanged</span>}
        <span className="spacer" />
        <span className="muted" aria-live="polite">
          {session.answered} / {session.total}
          {!first && ' · retry'}
        </span>
      </div>
      <div className="study-progress" aria-hidden="true">
        <div style={{ width: `${(100 * session.answered) / session.total}%` }} />
      </div>

      {card.answer_mode === 'draw' ? (
        <div className="study-stage draw">
          <StudyCard card={card} flipped={flipped} onFlip={() => setFlipped(true)} textOnlyBack />
          {flipped ? (
            <div className="stack">
              {hasVisualReference(card) && (
                <div className="row">
                  <span className="spacer" />
                  <button className="btn small" aria-pressed={overlay} onClick={() => setOverlay((o) => !o)}>
                    Overlay <span className="kbd">o</span>
                  </button>
                </div>
              )}
              <Compare card={card} drawing={drawing} overlay={overlay && hasVisualReference(card)} />
            </div>
          ) : (
            <DrawPad key={`${card.id}:${session.queue.length}:${session.answered}`} value={drawing} onChange={setDrawing} label="Draw your answer" />
          )}
        </div>
      ) : (
        <StudyCard card={card} flipped={flipped} onFlip={() => setFlipped(true)} />
      )}

      {flipped ? (
        <div className={`grades ${practice ? 'grades-2' : ''}`} role="group" aria-label="How did you do?">
          {buttons.map(({ grade: g, label, keys }) => (
            <button key={g} className={`btn grade-${g}`} onClick={() => grade(g)}>
              {label}{' '}
              <small>
                {practice
                  ? g === 'missed'
                    ? 'see it again soon'
                    : 'next card'
                  : first
                    ? intervalLabel(schedule(prev, g).interval_days)
                    : 'retry'}{' '}
                · {keys[0]}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <button className="btn primary" style={{ minHeight: 56 }} onClick={() => setFlipped(true)}>
          Show answer <span className="kbd">space</span>
        </button>
      )}
    </div>
  )
}

function StudyCard({
  card,
  flipped,
  onFlip,
  textOnlyBack = false,
}: {
  card: Card
  flipped: boolean
  onFlip: () => void
  /** In draw mode the visual reference is shown next to the user's drawing instead. */
  textOnlyBack?: boolean
}) {
  const showBack = flipped && (!textOnlyBack || card.back_text.trim())
  return (
    <section
      className="panel study-card"
      onClick={() => !flipped && onFlip()}
      aria-label={flipped ? 'Card, answer shown' : 'Card front. Tap to show the answer'}
    >
      <CardFace side="front" content={{ text: card.front_text, image: card.front_image }} />
      {showBack && (
        <div className="back">
          <CardFace
            side="back"
            content={
              textOnlyBack
                ? { text: card.back_text, image: null }
                : { text: card.back_text, image: card.back_image, strokes: card.back_strokes }
            }
          />
        </div>
      )}
    </section>
  )
}

function Summary({
  deck,
  session,
  cards,
  practice,
}: {
  deck: Deck
  session: S.Session
  cards: Card[]
  practice: boolean
}) {
  const progress = useData((s) => s.progress)
  const rows = useMemo(
    () =>
      Object.entries(session.firstGrade).map(([id, g]) => ({
        card: cards.find((c) => c.id === id),
        grade: g,
        due: progress.get(id)?.due_date,
      })),
    [session.firstGrade, cards, progress],
  )
  const count = (g: Grade) => rows.filter((r) => r.grade === g).length
  const againIds = rows.filter((r) => r.grade === 'missed' && r.card).map((r) => r.card!.id)

  if (practice) {
    return (
      <div className="stack">
        <h1>Practice complete 🎉</h1>
        <p>
          {count('got')} of {rows.length} right on the first try
          {againIds.length > 0 && <> · {againIds.length} needed another go</>}.{' '}
          <span className="muted">Your schedule wasn't changed.</span>
        </p>
        {againIds.length > 0 && (
          <>
            <h2 style={{ fontSize: '1rem' }}>Needed another go</h2>
            <ul className="stack" style={{ margin: 0, paddingLeft: '1.2rem', gap: '0.25rem' }}>
              {rows
                .filter((r) => r.grade === 'missed')
                .map((r, i) => (
                  <li key={i}>{r.card?.front_text.split('\n')[0] || '(image)'}</li>
                ))}
            </ul>
          </>
        )}
        <div className="row">
          {againIds.length > 0 && (
            <Link className="btn primary" to={`/study/${deck.id}?mode=practice&cards=${againIds.join(',')}`}>
              Practice just {againIds.length === 1 ? 'that one' : `those ${againIds.length}`}
            </Link>
          )}
          <Link className={`btn ${againIds.length ? '' : 'primary'}`} to={`/study/${deck.id}?mode=practice`}>
            Practice all again
          </Link>
          <Link className="btn" to="/">
            Back to decks
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <h1>Session complete 🎉</h1>
      <p>
        {rows.length} cards · <span className="error">{count('missed')} missed</span> · {count('close')} close ·{' '}
        {count('got')} got it
      </p>
      <table className="summary-table">
        <thead>
          <tr>
            <th>Card</th>
            <th>First answer</th>
            <th>Next due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{r.card?.front_text.split('\n')[0] || '(image)'}</td>
              <td>{GRADES.find((g) => g.grade === r.grade)?.label}</td>
              <td>{r.due ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row">
        <Link className="btn primary" to="/">
          Back to decks
        </Link>
        <Link className="btn" to={`/study/${deck.id}?mode=practice`}>
          Practice all cards
        </Link>
        <Link className="btn" to={`/deck/${deck.id}`}>
          View deck
        </Link>
      </div>
    </div>
  )
}
