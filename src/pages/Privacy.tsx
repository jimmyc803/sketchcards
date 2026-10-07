import { Link } from 'react-router-dom'

// Optional: set VITE_CONTACT_EMAIL so people know where to send data requests.
const CONTACT = import.meta.env.VITE_CONTACT_EMAIL as string | undefined

/** Public privacy policy (reachable without signing in; Google's consent screen links here). */
export default function Privacy() {
  const host = window.location.host
  return (
    <main className="page" style={{ maxWidth: 720 }}>
      <p>
        <Link to="/">← sketchcards</Link>
      </p>
      <h1>Privacy policy</h1>
      <p className="muted">Last updated October 2026</p>

      <p>
        sketchcards is a flashcard app. This policy covers the copy running at <strong>{host}</strong>. In short: it
        stores only what you put into it, uses it only to run the app, and never sells or shares it.
      </p>

      <h2>What is stored</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address. If you sign in with Google, also the name and profile
          picture Google provides. No passwords are stored.
        </li>
        <li>
          <strong>Your content:</strong> the decks and cards you create, including any images you upload and
          sketches you save as card answers.
        </li>
        <li>
          <strong>Your study progress:</strong> when each card is next due, how you graded it, and a log of
          when you studied (used for your streak and activity calendar).
        </li>
      </ul>
      <p>
        Drawings you make while studying are <strong>never saved or sent anywhere</strong>; they disappear when you
        move to the next card.
      </p>

      <h2>Where it is stored</h2>
      <p>
        Data is stored with <a href="https://supabase.com/privacy">Supabase</a> (database, file storage, and sign-in)
        and the site is served by <a href="https://vercel.com/legal/privacy-policy">Vercel</a>. Row-level security
        ensures each account can only access its own data. The person who runs this copy of the app can see stored
        data in the Supabase dashboard. Your browser also keeps a local copy so the app works offline; signing out
        clears it.
      </p>

      <h2>Visit statistics</h2>
      <p>
        To see how many people use the site, it counts page views with{' '}
        <a href="https://vercel.com/docs/analytics/privacy-policy">Vercel Web Analytics</a>. It uses no cookies and
        doesn't identify you: it records the page type (for example "a study page", never which deck), plus country,
        device type and browser, only as totals.
      </p>

      <h2>What is not done</h2>
      <ul>
        <li>No ads, no cookies for tracking, and no cross-site tracking.</li>
        <li>No selling or sharing of your data.</li>
        <li>Google sign-in is used only to confirm who you are; the app does not access your Gmail, Drive, or other Google data.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        You can export everything at any time from <strong>Settings → Export backup</strong>. To have your account and
        all of its data deleted,{' '}
        {CONTACT ? (
          <>
            email <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
          </>
        ) : (
          'contact the person who runs this site'
        )}
        .
      </p>

      <h2>Open source</h2>
      <p>
        The code is open source under the MIT license, so you can review exactly what it does or run your own copy:{' '}
        <a href="https://github.com/jimmyc803/sketchcards">github.com/jimmyc803/sketchcards</a>.
      </p>
    </main>
  )
}
