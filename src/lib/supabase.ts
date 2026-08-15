import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Magic-link and confirmation URLs return through the app. Supabase consumes the
    // one-time URL credentials and persists the resulting session for AuthProvider.
    detectSessionInUrl: true,
    storageKey: 'kidtasks.auth',
  },
})

/** Turns a Supabase/Postgres error into something safe to show a parent. */
export function describeError(error: unknown): string {
  if (!error) return ''
  const message = error instanceof Error ? error.message : String(error)

  if (/not enough stars/i.test(message)) return 'not_enough_stars'
  if (/invalid invite/i.test(message)) return 'invalid_invite'
  if (/already belongs to a family/i.test(message)) return 'already_in_family'
  if (/invalid login credentials/i.test(message)) return 'invalid_credentials'
  if (/user already registered/i.test(message)) return 'email_in_use'
  if (/password should be at least/i.test(message)) return 'weak_password'
  if (/failed to fetch|network/i.test(message)) return 'network'
  return 'generic'
}
