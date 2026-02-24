/**
 * Client-side hook to get user profile from UserProfileProvider context.
 *
 * The profile is fetched ONCE by UserProfileProvider and shared via React Context.
 * This file re-exports the hook for backwards compatibility — all existing imports
 * from '@/hooks/useUserProfile' continue to work without changes.
 *
 * Available fields: { profile, loading, error, refresh }
 */
export { useUserProfile } from './UserProfileProvider'
