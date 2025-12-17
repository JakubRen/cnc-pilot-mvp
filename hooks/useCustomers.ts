'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Customer } from '@/types/customers'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true)
        setError(null)

        // Get user's company_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          logger.debug('[useCustomers] No user found')
          setCustomers([])
          setLoading(false)
          return
        }

        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('company_id')
          .eq('auth_id', user.id)
          .single()

        if (profileError) {
          logger.error('[useCustomers] Profile error', { error: profileError })
          setCustomers([])
          setLoading(false)
          return
        }

        if (!userProfile?.company_id) {
          logger.debug('[useCustomers] No company_id')
          setCustomers([])
          setLoading(false)
          return
        }

        // Fetch customers for company
        const { data, error: queryError } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .order('name')

        if (queryError) {
          logger.error('[useCustomers] Query error', { error: queryError })
          throw queryError
        }

        logger.debug(`[useCustomers] Found ${data?.length || 0} customers`)
        setCustomers(data || [])
      } catch (err) {
        logger.error('[useCustomers] Error', { error: err })
        setError(err instanceof Error ? err.message : 'Failed to load customers')
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  return { customers, loading, error }
}

// Hook for searching customers
export function useCustomerSearch(searchTerm: string, debounceMs = 300) {
  const [results, setResults] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true)

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userProfile } = await supabase
          .from('users')
          .select('company_id')
          .eq('auth_id', user.id)
          .single()

        if (!userProfile?.company_id) return

        // Search customers
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,nip.ilike.%${searchTerm}%`)
          .order('name')
          .limit(20)

        setResults(data || [])
      } catch (err) {
        logger.error('[useCustomerSearch] Error', { error: err })
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchTerm, debounceMs])

  return { results, loading }
}
