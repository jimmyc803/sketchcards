import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CardFace from '../components/CardFace'
import ImagePicker, { type ImageValue } from '../components/ImagePicker'
import ModePicker from '../components/ModePicker'
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
      <div className="page-head">
        <h1>{isNew ? 'New card' : 'Edit card'}</h1>
        <Link to={`/deck/${deck.id}`} className="muted">
          in {deck.name}
        </Link>
        {savedCount > 0 && (
          <span className="muted" role="status">
            ✓ {savedCount} saved
          </span>
        )}
      </div>

      <div className="editor">
        <div className="stack">
          <section className="side-editor panel" onPaste={pasteInto('front')} aria-label="Front">
            <label className="field">
              <span>Front</span>
              <textarea
                ref={frontRef}
                autoFocus
                value={form.front_text}
                onChange={(e) => set('front_text', e.target.value)}
                placeholder="Prompt, e.g. Tryptophan (Trp, W)"
              />
            </label>
            <ImagePicker label="Front image" value={form.front} onChange={(v) => set('front', v)} />
          </section>

          <section className="side-editor panel" onPaste={pasteInto('back')} aria-label="Back">
            <label className="field">
              <span>Back</span>
              <textarea
                value={form.back_text}
                onChange={(e) => set('back_text', e.target.value)}
                placeholder="Answer"
              />
            </label>
            <ImagePicker label="Back image" value={form.back} onChange={(v) => set('back', v)} />
            <BackSketch strokes={form.back_strokes} onChange={(s) => set('back_strokes', s)} />
          </section>

          <section className="panel row">
            <span className="muted">Answer mode</span>
            <ModePicker value={form.answer_mode} onChange={(m) => set('answer_mode', m)} />
            <label className="field" style={{ flex: 1, minWidth: 180 }}>
              <span className="sr-only">Tags</span>
              <input
                value={form.tags}
                onChange={(e) => set('tags', e.target.value)}
                placeholder="Tags, comma separated"
                aria-label="Tags"
              />
            </label>
          </section>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            {isNew && (
              <button className="btn primary" disabled={!canSave} onClick={() => save(true)}>
                Save &amp; add another <span className="kbd">⌘↵</span>
              </button>
            )}
            <button className={`btn ${isNew ? '' : 'primary'}`} disabled={!canSave} onClick={() => save(false)}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <Link className="btn ghost" to={`/deck/${deck.id}`}>
              Cancel
            </Link>
          </div>
        </div>

        <aside aria-label="Preview" className="stack">
          <h2 style={{ fontSize: '1rem' }} className="muted">
            Preview {form.answer_mode === 'draw' && '· draw mode'}
          </h2>
          <div className="preview-pair">
            <div className="panel">
              <CardFace
                side="front"
                content={{ text: form.front_text, image: form.front.path, imagePreview: frontPreview }}
              />
            </div>
            <div className="panel">
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
          </div>
        </aside>
      </div>
    </div>
  )
}

/** Sketch the reference answer. (Canvas arrives with Draw mode.) */
function BackSketch({ strokes }: { strokes: Stroke[] | null; onChange: (s: Stroke[] | null) => void }) {
  if (!strokes?.length) return null
  return <span className="muted">Has a sketch ({strokes.length} strokes)</span>
}

function useObjectUrl(blob: Blob | null) {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])
  return url
}
