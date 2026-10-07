import type { Grade } from '../data/types'

/**
 * A study session. queue[0] is the current card. A missed card is pushed back a few
 * places and keeps returning until it's answered Close or Got it. Only the first grade
 * of each card in a session affects scheduling; repeats are practice.
 */
export interface Session {
  queue: string[]
  firstGrade: Record<string, Grade>
  total: number
  answered: number
}

export const REQUEUE_GAP = 3

export function startSession(cardIds: string[]): Session {
  return { queue: [...cardIds], firstGrade: {}, total: cardIds.length, answered: 0 }
}

export function current(s: Session): string | undefined {
  return s.queue[0]
}

export function isFirstAttempt(s: Session, cardId: string) {
  return !(cardId in s.firstGrade)
}

export function gradeCurrent(s: Session, grade: Grade): Session {
  const [id, ...rest] = s.queue
  if (id === undefined) return s
  const firstGrade = id in s.firstGrade ? s.firstGrade : { ...s.firstGrade, [id]: grade }
  if (grade === 'missed') {
    const at = Math.min(REQUEUE_GAP, rest.length)
    const queue = [...rest.slice(0, at), id, ...rest.slice(at)]
    return { ...s, queue, firstGrade }
  }
  return { ...s, queue: rest, firstGrade, answered: s.answered + 1 }
}

export function isDone(s: Session) {
  return s.queue.length === 0
}

/** Drop cards that no longer exist. Returns the same object when nothing changed. */
export function keepOnly(s: Session, existing: Set<string>): Session {
  if (s.queue.every((id) => existing.has(id))) return s
  const queue = s.queue.filter((id) => existing.has(id))
  const dropped = new Set(s.queue.filter((id) => !existing.has(id)))
  return { ...s, queue, total: s.total - [...dropped].filter((id) => !(id in s.firstGrade)).length }
}

/** Fisher–Yates shuffle (for practice sessions). `random` is injectable for tests. */
export function shuffled<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
