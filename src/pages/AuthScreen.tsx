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
    if (error) setError(friendlyEmailError(error))
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
        <div className="auth-brand">
          <img src="/icon.svg" alt="" width={56} height={56} />
          <h1>sketchcards</h1>
          <p className="muted">Flashcards you can draw.</p>
        </div>

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
          <GoogleIcon /> Continue with Google
        </button>
        <p className="muted auth-note">Sign in to keep your decks synced across your devices.</p>
        <p className="muted" style={{ fontSize: '0.8rem', textAlign: 'center', margin: '0.75rem 0 0' }}>
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

/** Supabase's built-in email service only sends a few emails per hour on the free plan. */
function friendlyEmailError(error: { message: string; status?: number }) {
  if (error.status === 429 || /rate limit/i.test(error.message)) {
    return 'Too many sign-in emails have been sent in the last hour, so email links are paused for a bit. Use "Continue with Google" instead, or try email again in about an hour.'
  }
  return error.message
}

/** Google's "G" mark, as their sign-in button guidelines ask for. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width={18} height={18} aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
