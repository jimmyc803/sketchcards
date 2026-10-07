import { useState } from 'react'
import { deleteUserCache } from '../data/cache'
import { InstallInstructions } from '../components/InstallHint'
import { useInstallMethod } from '../lib/install'
import { syncNow, useData } from '../data/store'
import { backupFilename, downloadJson, exportDecks } from '../io/transfer'
import { useAuth } from '../lib/auth'
import { setDefaultNewPerDay, useDefaultNewPerDay } from '../lib/prefs'
import { supabase } from '../lib/supabase'
import { applyTheme, getTheme, type Theme } from '../lib/theme'

const SHORTCUTS: [string, string][] = [
  ['Space / Enter', 'Show answer'],
  ['1 / 2 / 3', 'Missed / Close / Got it (Study)'],
  ['1 / 2', 'Again / Got it (Practice)'],
  ['O', 'Toggle overlay (Draw cards)'],
  ['⌘Z / ⇧⌘Z', 'Undo / redo a stroke'],
  ['⌘↵', 'Save & add another (card editor)'],
  ['⌘S', 'Save (card editor)'],
]

export default function Settings() {
  const { session } = useAuth()
  const decks = useData((s) => s.decks)
  const pending = useData((s) => s.pending)
  const sync = useData((s) => s.sync)
  const syncError = useData((s) => s.syncError)
  const defaultNew = useDefaultNewPerDay()
  const [newPerDay, setNewPerDay] = useState(String(defaultNew))
  const [theme, setTheme] = useState<Theme>(getTheme)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [installMethod] = useInstallMethod()

  async function saveNewPerDay() {
    const n = Math.max(0, Math.min(1000, Math.round(Number(newPerDay))))
    if (!Number.isFinite(n) || n === defaultNew) return setNewPerDay(String(defaultNew))
    try {
      await setDefaultNewPerDay(n)
      setMsg(`New cards per day set to ${n}.`)
    } catch (e) {
      setMsg(`Couldn't save: ${e instanceof Error ? e.message : e}`)
    }
  }

  async function backup() {
    setBusy(true)
    setMsg(null)
    try {
      await downloadJson(await exportDecks(decks.map((d) => d.id)), backupFilename())
      setMsg(`Exported ${decks.length} decks. Restore with "Import deck" on the Decks page.`)
    } catch (e) {
      setMsg(`Export failed: ${e instanceof Error ? e.message : e}`)
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    if (pending && !confirm(`${pending} changes haven't synced yet and will be lost if you sign out now. Sign out anyway?`)) return
    const userId = session?.user.id
    await supabase.auth.signOut()
    // Don't leave this account's cards on a shared device.
    if (userId) await deleteUserCache(userId).catch(() => {})
  }

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>Settings</h1>

      <section className="panel stack" aria-labelledby="study-h">
        <h2 id="study-h" style={{ fontSize: '1.1rem' }}>
          Study
        </h2>
        <label className="field" style={{ maxWidth: 220 }}>
          <span>New cards per day (default for all decks)</span>
          <input
            type="number"
            min={0}
            max={1000}
            value={newPerDay}
            onChange={(e) => setNewPerDay(e.target.value)}
            onBlur={saveNewPerDay}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </label>
        <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          Each deck can override this in its Deck settings.
        </p>
      </section>

      <section className="panel stack" aria-labelledby="look-h">
        <h2 id="look-h" style={{ fontSize: '1.1rem' }}>
          Appearance
        </h2>
        <div className="segmented" role="group" aria-label="Theme">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button
              key={t}
              aria-pressed={theme === t}
              onClick={() => {
                applyTheme(t)
                setTheme(t)
              }}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="panel stack" aria-labelledby="data-h">
        <h2 id="data-h" style={{ fontSize: '1.1rem' }}>
          Data
        </h2>
        <div className="row">
          <button className="btn" onClick={backup} disabled={busy || !decks.length}>
            {busy ? 'Exporting…' : 'Export backup of everything'}
          </button>
          <button className="btn" onClick={() => void syncNow()} disabled={sync === 'syncing'}>
            Sync now
          </button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: '0.875rem' }}>
          The backup is one JSON file with all decks, images, sketches and progress.
          {pending > 0 && ` ${pending} changes waiting to sync.`}
          {syncError && <span className="error"> Last sync error: {syncError}</span>}
        </p>
      </section>

      {(installMethod === 'ios' || installMethod === 'prompt') && (
        <section className="panel stack" aria-labelledby="install-h">
          <h2 id="install-h" style={{ fontSize: '1.1rem' }}>
            Install the app
          </h2>
          <div className="row">
            <InstallInstructions />
          </div>
        </section>
      )}

      <section className="panel stack" aria-labelledby="keys-h">
        <h2 id="keys-h" style={{ fontSize: '1.1rem' }}>
          Keyboard shortcuts
        </h2>
        <table className="summary-table">
          <tbody>
            {SHORTCUTS.map(([k, v]) => (
              <tr key={k}>
                <td style={{ width: '40%' }}>
                  <span className="kbd">{k}</span>
                </td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
        Version {new Date(__BUILD_ID__).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </p>

      <section className="panel row" aria-label="Account">
        <span className="muted">
          Signed in as {session?.user.email} · <a href="/privacy">Privacy policy</a>
        </span>
        <span className="spacer" />
        <button className="btn" onClick={signOut}>
          Sign out
        </button>
      </section>

      {msg && (
        <p role="status" className="muted">
          {msg}
        </p>
      )}
    </div>
  )
}
