// Server-side authentication helpers
// Use these in Server Components only!

import { createClient } from './supabase-server'
import type { UserProfile } from './auth'

/**
 * Get user profile with role from database (SERVER-SIDE ONLY)
 * Returns user data from public.users table (includes role)
 * Use this in Server Components
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, company_id, hourly_rate')
    .eq('auth_id', authUser.id)
    .single()

  if (error || !profile) {
    console.error('getUserProfile error:', error)
    return null
  }

  return profile as UserProfile
}
