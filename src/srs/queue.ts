import type { Card, Progress } from '../data/types'

export const DEFAULT_NEW_PER_DAY = 10

export interface QueueInput {
  cards: Card[]
  progress: Map<string, Progress>
  today: string
  newPerDay: number
}

/** New cards already introduced today (they count against the daily limit). */
export function newStudiedToday({ cards, progress, today }: Omit<QueueInput, 'newPerDay'>) {
  return cards.filter((c) => progress.get(c.id)?.first_studied_on === today).length
}

export function deckCounts(input: QueueInput) {
  const due = input.cards.filter((c) => {
    const p = input.progress.get(c.id)
    return p && p.due_date <= input.today
  }).length
  const unseen = input.cards.filter((c) => !input.progress.has(c.id)).length
  const allowance = Math.max(0, input.newPerDay - newStudiedToday(input))
  return { due, newCount: Math.min(unseen, allowance), unseen }
}

/** Today's queue: everything due today or earlier (oldest first), then up to the new-card allowance. */
export function buildQueue(input: QueueInput): Card[] {
  const { cards, progress, today } = input
  const due = cards
    .filter((c) => {
      const p = progress.get(c.id)
      return p && p.due_date <= today
    })
    .sort((a, b) => progress.get(a.id)!.due_date.localeCompare(progress.get(b.id)!.due_date))
  const { newCount } = deckCounts(input)
  const fresh = cards
    .filter((c) => !progress.has(c.id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, newCount)
  return [...due, ...fresh]
}
