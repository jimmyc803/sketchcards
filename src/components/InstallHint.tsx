import { useState } from 'react'
import { useInstallMethod } from '../lib/install'

const KEY = 'sketchcards.installHint.dismissed'

/** The iOS "Share" glyph, so the instruction matches what people see in Safari. */
export function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-3px' }}>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M6 11H5a1 1 0 00-1 1v8a1 1 0 001 1h14a1 1 0 001-1v-8a1 1 0 00-1-1h-1" />
    </svg>
  )
}

/** Install instructions for this device (text, plus an Install button where the browser offers one). */
export function InstallInstructions() {
  const [method, install] = useInstallMethod()
  if (method === 'prompt')
    return (
      <>
        <span>Install sketchcards for a full-screen app that opens offline.</span>
        <button className="btn small" onClick={() => void install()}>
          Install
        </button>
      </>
    )
  if (method === 'ios')
    return (
      <span>
        Tip: tap <ShareGlyph /> <b>Share</b> → <b>Add to Home Screen</b> to use sketchcards like an app, full screen
        and offline.
      </span>
    )
  return null
}

/** A quiet, dismissible one-liner on the deck list. Never shown again once closed. */
export default function InstallHint() {
  const [method] = useInstallMethod()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  if (dismissed || method === 'installed' || method === 'none') return null
  return (
    <div className="install-hint" role="note">
      <InstallInstructions />
      <button
        className="install-hint-close"
        aria-label="Dismiss install tip"
        onClick={() => {
          setDismissed(true)
          try {
            localStorage.setItem(KEY, '1')
          } catch {
            /* storage unavailable */
          }
        }}
      >
        ×
      </button>
    </div>
  )
}
