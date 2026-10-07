import { useEffect, useState } from 'react'

export const PAPERS = [
  { key: 'blank', label: 'Blank' },
  { key: 'lined', label: 'Lined' },
  { key: 'grid', label: 'Grid' },
  { key: 'dots', label: 'Dots' },
] as const

export type Paper = (typeof PAPERS)[number]['key']

const KEY = 'sketchcards.paper'

function load(): Paper {
  try {
    const v = localStorage.getItem(KEY)
    if (PAPERS.some((p) => p.key === v)) return v as Paper
  } catch {
    /* storage unavailable */
  }
  return 'blank'
}

/** Paper style is a per-device preference, shared by every canvas and comparison board. */
export function usePaper(): [Paper, (p: Paper) => void] {
  const [paper, setPaper] = useState<Paper>(load)
  useEffect(() => {
    const sync = () => setPaper(load())
    window.addEventListener('paperchange', sync)
    return () => window.removeEventListener('paperchange', sync)
  }, [])
  const change = (p: Paper) => {
    try {
      localStorage.setItem(KEY, p)
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new Event('paperchange'))
  }
  return [paper, change]
}
