import { useAuth } from './auth'
import { supabase } from './supabase'
import { DEFAULT_NEW_PER_DAY } from '../srs/queue'

/** Account-wide default for new cards per day, stored in Supabase user metadata so it syncs. */
export function useDefaultNewPerDay(): number {
  const { session } = useAuth()
  const v = session?.user.user_metadata?.new_per_day
  return typeof v === 'number' ? v : DEFAULT_NEW_PER_DAY
}

export async function setDefaultNewPerDay(n: number) {
  const { error } = await supabase.auth.updateUser({ data: { new_per_day: n } })
  if (error) throw error
}
