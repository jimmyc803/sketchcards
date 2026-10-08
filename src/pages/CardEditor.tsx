import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CardFace from '../components/CardFace'
import DrawPad from '../components/DrawPad'
import ImagePicker, { type ImageValue } from '../components/ImagePicker'
import ModePicker from '../components/ModePicker'
import { BackIcon, PlusIcon, SketchIcon } from '../components/icons'
import { imageFromDataTransfer, uploadImage } from '../data/images'
import { makeCard, releaseImagePaths, saveCard, useData } from '../data/store'
import type { AnswerMode, Card, Deck, Stroke } from '../data/types'
import { parseTags } from '../lib/text'

interface Form {
  front_text: string
  back_text: string
  front: ImageValue
  back: ImageValue
  back_strokes: Stroke[] | null
  answer_mode: AnswerMode
  tags: string
}

function emptyForm(deck: Deck, keep?: Pick<Form, 'answer_mode' | 'tags'>): Form {
  return {
    front_text: '',
    back_text: '',
    front: { path: null, file: null },
    back: { path: null, file: null },
    back_strokes: null,
    answer_mode: keep?.answer_mode ?? deck.default_answer_mode,
    tags: keep?.tags ?? '',
  }
}

function formFromCard(c: Card): Form {
  return {
    front_text: c.front_text,
    back_text: c.back_text,
    front: { path: c.front_image, file: null },
    back: { path: c.back_image, file: null },
    back_strokes: c.back_strokes,
    answer_mode: c.answer_mode,
    tags: c.tags.join(', '),
  }
}

export default function CardEditor() {
  const { deckId, cardId } = useParams()
  const card = useData((s) => (cardId ? s.cards.find((c) => c.id === cardId) : undefined))
  const deck = useData((s) => s.decks.find((d) => d.id === (card?.deck_id ?? deckId)))
  const ready = useData((s) => s.ready)
  if (!deck || (cardId && !card)) return <p className="muted">{ready ? 'Card not found.' : 'Loading…'}</p>
  return <EditorBody key={card?.id ?? 'new'} deck={deck} card={card} />
}

function EditorBody({ deck, card }: { deck: Deck; card?: Card }) {
  const navigate = useNavigate()
  const [form, setForm] = useState<Form>(() => (card ? formFromCard(card) : emptyForm(deck)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const frontRef = useRef<HTMLTextAreaElement>(null)
  const isNew = !card

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))
  const canSave =
    !busy && Boolean(form.front_text.trim() || form.front.path || form.front.file)

  async function save(addAnother: boolean) {
    if (!canSave) return
    setBusy(true)
    setError(null)
    try {
      const front_image = form.front.file ? await uploadImage(form.front.file) : form.front.path
      const back_image = form.back.file ? await uploadImage(form.back.file) : form.back.path
      const fields = {
        front_text: form.front_text.trim(),
        back_text: form.back_text.trim(),
        front_image,
        back_image,
        back_strokes: form.back_strokes?.length ? form.back_strokes : null,
        answer_mode: form.answer_mode,
        tags: parseTags(form.tags),
      }
      await saveCard(card ? { ...card, ...fields } : makeCard(deck.id, fields))
      if (card) await releaseImagePaths([card.front_image, card.back_image].filter((p) => p !== front_image && p !== back_image))
      if (addAnother) {
        setForm(emptyForm(deck, form))
        setSavedCount((n) => n + 1)
        frontRef.current?.focus()
      } else {
        navigate(`/deck/${deck.id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void save(isNew)
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault()
      void save(false)
    }
  }

  function pasteInto(side: 'front' | 'back') {
    return (e: ClipboardEvent) => {
      const file = imageFromDataTransfer(e.clipboardData)
      if (!file) return
      e.preventDefault()
      set(side, { path: form[side].path, file })
    }
  }

  const frontPreview = useObjectUrl(form.front.file)
  const backPreview = useObjectUrl(form.back.file)

  return (
    <div onKeyDown={onKeyDown}>
      <Link to={`/deck/${deck.id}`} className="back-link">
        <BackIcon /> {deck.name}
      </Link>
      <div className="page-head">
        <h1>{isNew ? 'New card' : 'Edit card'}</h1>
        {savedCount > 0 && (
          <span className="saved-note" role="status">
            {savedCount} {savedCount === 1 ? 'card' : 'cards'} saved
          </span>
        )}
      </div>

      <div className="editor">
        <div className="stack">
          <section className="side-editor panel" onPaste={pasteInto('front')} aria-label="Front">
            <label className="field">
              <span className="side-title">
                <b>Front</b> the question
              </span>
              <textarea
                ref={frontRef}
                autoFocus
                value={form.front_text}
                onChange={(e) => set('front_text', e.target.value)}
                placeholder="e.g. What does the mitochondria do?"
              />
            </label>
            <ImagePicker label="Front image" value={form.front} onChange={(v) => set('front', v)} />
          </section>

          <section className="side-editor panel" onPaste={pasteInto('back')} aria-label="Back">
            <label className="field">
              <span className="side-title">
                <b>Back</b> the answer
              </span>
              <textarea
                value={form.back_text}
                onChange={(e) => set('back_text', e.target.value)}
                placeholder="e.g. Makes energy for the cell"
              />
            </label>
            <BackSketch
              strokes={form.back_strokes}
              onChange={(s) => set('back_strokes', s)}
              image={<ImagePicker label="Back image" value={form.back} onChange={(v) => set('back', v)} />}
            />
          </section>

          <section className="panel stack">
            <div className="field">
              <span>When studying, I’ll…</span>
              <ModePicker value={form.answer_mode} onChange={(m) => set('answer_mode', m)} />
            </div>
            <label className="field">
              <span>
                Tags <span className="optional">optional</span>
              </span>
              <input
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="e.g. chapter 3, organelles"
              />
            </label>
          </section>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row editor-actions">
            {isNew ? (
              <>
                <button className="btn primary" disabled={!canSave} onClick={() => save(true)}>
                  <PlusIcon /> {busy ? 'Saving…' : 'Save & add another'}
                </button>
                <button className="btn" disabled={!canSave} onClick={() => save(false)}>
                  Save & go back
                </button>
              </>
            ) : (
              <button className="btn primary" disabled={!canSave} onClick={() => save(false)}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            )}
            <Link className="btn ghost" to={`/deck/${deck.id}`}>
              Cancel
            </Link>
          </div>
          {!canSave && !busy && <p className="muted hint">Write something on the front to save.</p>}
        </div>

        <aside aria-label="Preview" className="stack preview">
          <h2 className="preview-title">Preview</h2>
          <div className="preview-pair">
            <figure>
              <figcaption>Front</figcaption>
              <div className="index-card">
                <CardFace
                  side="front"
                  content={{ text: form.front_text, image: form.front.path, imagePreview: frontPreview }}
                />
              </div>
            </figure>
            <figure>
              <figcaption>Back</figcaption>
              <div className={`index-card ${form.back_strokes?.length ? 'plain' : ''}`}>
                <CardFace
                  side="back"
                  content={{
                    text: form.back_text,
                    image: form.back.path,
                    imagePreview: backPreview,
                    strokes: form.back_strokes,
                  }}
                />
              </div>
            </figure>
          </div>
          <p className="muted hint">
            {form.answer_mode === 'draw'
              ? 'You’ll sketch your answer, then see the back next to it.'
              : 'You’ll see the front, think of the answer, then flip.'}
          </p>
        </aside>
      </div>
    </div>
  )
}

/** Sketch the reference answer with the same canvas used when studying. Saved as strokes. */
function BackSketch({
  strokes,
  onChange,
  image,
}: {
  strokes: Stroke[] | null
  onChange: (s: Stroke[] | null) => void
  image: ReactNode
}) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <div className="row">
        {image}
        <button type="button" className="btn small" onClick={() => setOpen(true)}>
          <SketchIcon /> {strokes?.length ? 'Edit drawing' : 'Draw the answer'}
        </button>
        {!!strokes?.length && (
          <button type="button" className="btn small ghost" onClick={() => onChange(null)}>
            Remove drawing
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="stack">
      <DrawPad value={strokes ?? []} onChange={(s) => onChange(s.length ? s : null)} label="Answer drawing" />
      <div className="row">
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          Draw the answer the way you want to see it when studying.
        </span>
        <span className="spacer" />
        <button type="button" className="btn small primary" onClick={() => setOpen(false)}>
          Done drawing
        </button>
      </div>
    </div>
  )
}

function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return url
}
