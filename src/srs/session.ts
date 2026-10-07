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
