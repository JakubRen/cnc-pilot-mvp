import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/auth'

/**
 * Client-side hook to fetch user profile (auth + users table).
 * Replaces the duplicated useEffect pattern found across 20+ components.
 *
 * Returns the full UserProfile from public.users table.
 * Cached for the component lifecycle — re-fetches only on mount.
 */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || cancelled) {
          setLoading(false)
          return
        }

        const { data } = await supabase
          .from('users')
          .select('id, email, full_name, role, company_id, hourly_rate, interface_mode')
          .eq('auth_id', user.id)
          .single()

        if (!cancelled) {
          setProfile(data as UserProfile | null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [])

  return { profile, loading }
}
