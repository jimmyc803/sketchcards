import { useEffect, useState } from 'react'

/** Chrome/Edge/Android fire this when the app can be installed with one tap. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// The event can fire before React mounts, so capture it at module load.
let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own quiet hint instead of the browser's banner
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export function isInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone / iPad (iPadOS reports itself as a Mac, so also check for touch). */
export function isAppleMobile() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export type InstallMethod = 'installed' | 'prompt' | 'ios' | 'none'

/** How (if at all) this browser can install the app. */
export function useInstallMethod(): [InstallMethod, () => Promise<void>] {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  const method: InstallMethod = isInstalled() ? 'installed' : deferred ? 'prompt' : isAppleMobile() ? 'ios' : 'none'
  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => undefined)
    deferred = null
    force((n) => n + 1)
  }
  return [method, install]
}
