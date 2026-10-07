import { useState, type FormEvent } from 'react'
import { redirectUrl, supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl() },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  // Entering the 6-digit code works even when the link would open in a different
  // browser (e.g. an iPad home-screen app, which doesn't share Safari's storage).
  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(error.message)
  }

  async function google() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl() },
    })
    if (error) setError(error.message)
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <h1 className="logo">sketchcards</h1>
        <p className="muted">Flashcards you can draw. Sign in to sync across your devices.</p>

        {!sent ? (
          <form onSubmit={sendLink} className="stack">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <button className="btn primary" disabled={busy}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="stack">
            <p>
              Check <strong>{email}</strong> and tap the link. If the email shows a code, you can type it here instead:
            </p>
            <label className="field">
              <span>Code</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Code from email"
              />
            </label>
            <button className="btn primary" disabled={busy || code.trim().length < 6}>
              Sign in with code
            </button>
            <button type="button" className="btn ghost" onClick={() => setSent(false)}>
              Use a different email
            </button>
          </form>
        )}

        <div className="divider">or</div>
        <button className="btn" onClick={google}>
          Continue with Google
        </button>
        <p className="muted" style={{ fontSize: '0.8rem', textAlign: 'center', margin: '1.25rem 0 0' }}>
          <a href="/privacy">Privacy policy</a>
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
