/**
 * New accounts get the Welcome sample deck once. "Welcomed" is stored in the account's
 * user metadata, so it holds across devices and a deleted Welcome deck never comes back.
 */
export type WelcomeAction = 'wait' | 'skip' | 'mark-only' | 'create'

export function decideWelcome(input: {
  welcomed: boolean
  /** Has this session loaded the account's decks from the server yet? */
  serverLoaded: boolean
  deckCount: number
}): WelcomeAction {
  if (input.welcomed) return 'skip'
  // Never decide from an empty local cache: the account may already have decks on the server.
  if (!input.serverLoaded) return 'wait'
  return input.deckCount === 0 ? 'create' : 'mark-only'
}
