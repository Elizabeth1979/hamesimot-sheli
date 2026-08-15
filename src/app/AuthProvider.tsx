import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { clearParentUnlock } from '@/lib/pin'
import { resetOutbox } from '@/lib/outbox'
import { disablePush } from '@/lib/push'
import { ensureCacheOwner, purgePersistedCache } from './queryClient'
import type { Profile } from '@/types/db'

type AuthContextValue = {
  session: Session | null
  /** True until the initial session lookup finishes, so routes don't flash. */
  loading: boolean
  profile: Profile | null
  profileLoading: boolean
  familyId: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null

  // Runs before the queries below read anything, so a cache belonging to a different
  // account is dropped rather than displayed.
  useEffect(() => {
    if (loading) return
    ensureCacheOwner(userId)
  }, [loading, userId])

  const profileQuery = useQuery({
    queryKey: ['profile', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      // Parent profiles are readable family-wide so the invites screen can list co-parents;
      // an independently signed-in child can read only their own profile.
      // Without this filter a second parent joining makes the query return two rows,
      // maybeSingle() errors, and the app decides the user has no family at all.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId ?? '')
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const signOut = useCallback(async () => {
    clearParentUnlock()
    // Subscription deletion needs the current RLS identity, so it must run before Auth
    // is cleared. Browser unsubscribe still prevents delivery if the API cleanup fails.
    await disablePush().catch(() => undefined)
    await supabase.auth.signOut()
    // clear() only empties memory; the persisted copy has to go too or the next
    // person to sign in on this device rehydrates it.
    purgePersistedCache()
    // Queued offline writes belong to the account that made them, not to the device.
    await resetOutbox()
  }, [])

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['profile'] })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      profile: profileQuery.data ?? null,
      profileLoading: Boolean(userId) && profileQuery.isPending,
      familyId: profileQuery.data?.family_id ?? null,
      signOut,
      refreshProfile,
    }),
    [session, loading, profileQuery.data, profileQuery.isPending, userId, signOut, refreshProfile],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
