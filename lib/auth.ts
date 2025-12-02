// Authentication helper functions using Supabase Auth
import { supabase } from './supabase'

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })
  return { data, error }
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Get the current session
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Interface mode type - controls what UI the user sees
 */
export type InterfaceMode = 'kiosk_only' | 'full_access' | 'both'

/**
 * User profile interface with role information
 */
export interface UserProfile {
  id: number
  email: string
  full_name: string
  role: 'owner' | 'admin' | 'manager' | 'operator' | 'viewer' | 'pending'
  company_id: string | null
  hourly_rate?: number | null
  interface_mode?: InterfaceMode
}
