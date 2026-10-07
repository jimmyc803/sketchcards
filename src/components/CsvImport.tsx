import { useEffect, useRef, useState } from 'react'
import type { Deck } from '../data/types'
import { csvToCards, type CsvResult } from '../io/csv'
import { importCsvCards } from '../io/transfer'

/** Pick a CSV, preview what will be created, then save. */
export default function CsvImport({ deck, onClose }: { deck: Deck; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [result, setResult] = useState<CsvResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)

  // Open as a modal on mount. No close() in cleanup: that fires onClose, and unmounting removes the dialog anyway.
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [])

  async function pick(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setResult(csvToCards(await file.text()))
  }

  async function save() {
    if (!result?.cards.length) return
    setBusy(true)
    await importCsvCards(deck, result.cards)
    setBusy(false)
    onClose()
  }

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="csv-title">
      <div className="stack">
        <h2 id="csv-title">Import CSV into “{deck.name}”</h2>
        <p className="muted" style={{ margin: 0 }}>
          Columns: <code>front,back,tags</code> (tags separated by <code>;</code>). Text cards only. Quotes are fine
          for commas and line breaks.
        </p>
        <input type="file" accept=".csv,text/csv,text/plain" onChange={(e) => pick(e.target.files?.[0])} aria-label="CSV file" />

        {result && (
          <>
            {result.errors.length > 0 && (
              <div className="notice" role="alert">
                <strong>
                  {result.errors.length} problem{result.errors.length > 1 ? 's' : ''}
                  {result.cards.length ? ' (these rows will be skipped)' : ''}:
                </strong>
                <ul style={{ margin: '0.3rem 0 0', paddingLeft: '1.2rem' }}>
                  {result.errors.slice(0, 20).map((e) => (
                    <li key={e} className="error">
                      {e}
                    </li>
                  ))}
                  {result.errors.length > 20 && <li>…and {result.errors.length - 20} more</li>}
                </ul>
              </div>
            )}
            {result.warnings.map((w) => (
              <p key={w} className="muted" style={{ margin: 0 }}>
                ⚠ {w}
              </p>
            ))}
            {result.cards.length > 0 && (
              <>
                <p style={{ margin: 0 }}>
                  <strong>{result.cards.length}</strong> cards ready from {fileName}:
                </p>
                <div className="csv-preview">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Front</th>
                        <th>Back</th>
                        <th>Tags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.cards.slice(0, 200).map((c, i) => (
                        <tr key={i}>
                          <td className="muted">{i + 1}</td>
                          <td>{c.front}</td>
                          <td>{c.back}</td>
                          <td>{c.tags.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <div className="row">
          <span className="spacer" />
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!result?.cards.length || busy} onClick={save}>
            {busy ? 'Importing…' : `Import ${result?.cards.length ?? ''} cards`}
          </button>
        </div>
      </div>
    </dialog>
  )
}
