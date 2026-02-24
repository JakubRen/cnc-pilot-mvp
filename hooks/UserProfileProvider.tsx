'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/auth'

interface UserProfileContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: null,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data, error: queryError } = await supabase
        .from('users')
        .select('id, email, full_name, role, company_id, hourly_rate, interface_mode')
        .eq('auth_id', user.id)
        .single()

      if (queryError) {
        setError(queryError.message)
      } else {
        setProfile(data as UserProfile | null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return (
    <UserProfileContext.Provider value={{ profile, loading, error, refresh: fetchProfile }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserProfileContext)
}
