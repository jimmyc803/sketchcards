import { useEffect } from 'react'
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { prefetchImages } from './data/images'
import { startSession, stopSession, useData } from './data/store'
import { AuthProvider, useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'
import AuthScreen from './pages/AuthScreen'
import SetupNeeded from './pages/SetupNeeded'
import DeckList from './pages/DeckList'
import DeckView from './pages/DeckView'
import CardEditor from './pages/CardEditor'
import Study from './pages/Study'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'

export default function App() {
  if (!isConfigured) return <SetupNeeded />
  return (
    <AuthProvider>
      <BrowserRouter>
        <Gate />
      </BrowserRouter>
    </AuthProvider>
  )
}

function Gate() {
  const { session, loading } = useAuth()
  const { pathname } = useLocation()
  const userId = session?.user.id

  useEffect(() => {
    if (userId) void startSession(userId)
    else stopSession()
  }, [userId])

  // The privacy policy is public: Google's consent screen links to it.
  if (pathname === '/privacy') return <Privacy />
  if (loading) return <div className="center muted">Loading…</div>
  if (!session) return <AuthScreen />
  return <Shell />
}

function Shell() {
  const sync = useData((s) => s.sync)
  const pending = useData((s) => s.pending)
  const cards = useData((s) => s.cards)

  // After each sync, quietly cache card images for offline study.
  useEffect(() => {
    if (sync !== 'idle') return
    const t = setTimeout(() => void prefetchImages(cards.flatMap((c) => [c.front_image, c.back_image])), 1500)
    return () => clearTimeout(t)
  }, [sync, cards])
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="logo">
          sketchcards
        </Link>
        <span className={`sync sync-${sync}`} role="status" aria-live="polite">
          {sync === 'offline'
            ? `Offline${pending ? ` · ${pending} unsynced` : ''}`
            : sync === 'error'
              ? 'Sync error'
              : sync === 'syncing'
                ? 'Syncing…'
                : pending
                  ? `${pending} unsynced`
                  : ''}
        </span>
        <nav>
          <NavLink to="/" end>
            Decks
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <main id="main" className="page">
        <Routes>
          <Route path="/" element={<DeckList />} />
          <Route path="/deck/:deckId" element={<DeckView />} />
          <Route path="/deck/:deckId/new" element={<CardEditor />} />
          <Route path="/card/:cardId" element={<CardEditor />} />
          <Route path="/study/:deckId" element={<Study />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}
