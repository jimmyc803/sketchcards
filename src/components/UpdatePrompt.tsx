import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'

const CHECK_EVERY_MS = 30 * 60_000

/** Screens with nothing in progress, where reloading into a new version loses nothing. */
function isSafeToReload(pathname: string) {
  return pathname === '/' || pathname === '/settings' || pathname === '/privacy' || /^\/deck\/[^/]+$/.test(pathname)
}

/**
 * Keeps the installed app up to date. Home-screen apps on iPad are rarely relaunched, so we check
 * for a new version whenever the app comes back to the foreground (and every 30 minutes). A new
 * version is applied immediately on calm screens; mid-study or mid-edit we only offer a button.
 */
export default function UpdatePrompt() {
  const { pathname } = useLocation()
  const applying = useRef(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine && registration.installing == null) void registration.update().catch(() => {})
      }
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
      window.addEventListener('online', check)
    },
  })

  const apply = () => {
    if (applying.current) return
    applying.current = true
    void updateServiceWorker(true)
  }

  useEffect(() => {
    if (needRefresh && isSafeToReload(pathname)) apply()
    // oxlint-disable-next-line react/exhaustive-deps -- apply() is idempotent
  }, [needRefresh, pathname])

  if (!needRefresh || isSafeToReload(pathname)) return null
  return (
    <div className="update-pill" role="status">
      <span>A new version is ready.</span>
      <button className="btn small primary" onClick={apply}>
        Update now
      </button>
      <span className="muted" style={{ fontSize: '0.8rem' }}>
        or it updates when you leave this screen
      </span>
    </div>
  )
}
