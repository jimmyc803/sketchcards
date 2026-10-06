export default function SetupNeeded() {
  return (
    <main className="auth">
      <div className="auth-card">
        <h1 className="logo">sketchcards</h1>
        <p>Supabase isn't configured yet.</p>
        <p className="muted">
          Copy <code>.env.example</code> to <code>.env.local</code>, fill in <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then restart <code>npm run dev</code>. See the README for details.
        </p>
      </div>
    </main>
  )
}
