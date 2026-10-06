export type Theme = 'system' | 'light' | 'dark'

const KEY = 'sketchcards.theme'

export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* storage unavailable */
  }
  return 'system'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event('themechange'))
}
