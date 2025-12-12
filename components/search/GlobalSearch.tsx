'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useTranslation } from '@/hooks/useTranslation'

interface SearchResult {
  id: string
  type: 'order' | 'inventory' | 'user' | 'page'
  title: string
  subtitle?: string
  url: string
  icon: string
}

export default function GlobalSearch() {
  const { t } = useTranslation()

  const PAGES: SearchResult[] = [
    { id: 'dashboard', type: 'page', title: t('nav', 'dashboard'), url: '/', icon: '📊' },
    { id: 'orders', type: 'page', title: t('nav', 'orders'), url: '/orders', icon: '📦' },
    { id: 'inventory', type: 'page', title: t('nav', 'inventory'), url: '/inventory', icon: '📦' },
    { id: 'time', type: 'page', title: t('nav', 'timeTracking'), url: '/time-tracking', icon: '⏱️' },
    { id: 'users', type: 'page', title: t('nav', 'users'), url: '/users', icon: '👥' },
  ]
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Toggle command palette with Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Search function
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults(PAGES)
      return
    }

    setLoading(true)

    try {
      // Get user's company_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) return

      // Parallel search across all entities
      const [ordersData, inventoryData, usersData] = await Promise.all([
        // Search orders
        supabase
          .from('orders')
          .select('id, order_number, customer_name, part_name, status')
          .eq('company_id', userProfile.company_id)
          .limit(20),

        // Search inventory
        supabase
          .from('inventory')
          .select('id, name, sku, category')
          .eq('company_id', userProfile.company_id)
          .limit(20),

        // Search users
        supabase
          .from('users')
          .select('id, full_name, email, role')
          .eq('company_id', userProfile.company_id)
          .limit(20),
      ])

      // Convert to search results
      const orderResults: SearchResult[] = (ordersData.data || []).map(order => ({
        id: order.id,
        type: 'order' as const,
        title: `${order.order_number} - ${order.customer_name}`,
        subtitle: order.part_name || undefined,
        url: `/orders/${order.id}`,
        icon: '📦',
      }))

      const inventoryResults: SearchResult[] = (inventoryData.data || []).map(item => ({
        id: item.id,
        type: 'inventory' as const,
        title: item.name,
        subtitle: `SKU: ${item.sku} • ${item.category}`,
        url: `/inventory/${item.id}`,
        icon: '📦',
      }))

      const userResults: SearchResult[] = (usersData.data || []).map(user => ({
        id: String(user.id),
        type: 'user' as const,
        title: user.full_name,
        subtitle: `${user.email} • ${user.role}`,
        url: `/users/${user.id}`,
        icon: '👤',
      }))

      // Fuzzy search with Fuse.js
      const allResults = [...PAGES, ...orderResults, ...inventoryResults, ...userResults]
      const fuse = new Fuse(allResults, {
        keys: ['title', 'subtitle'],
        threshold: 0.3,
      })

      const searchResults = fuse.search(query).map(result => result.item)
      setResults(searchResults.slice(0, 10))
    } catch (error) {
      logger.error('Global search error', { error })
      setResults(PAGES)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, performSearch])

  // Navigate to result
  const handleSelect = (url: string) => {
    setOpen(false)
    setSearch('')
    router.push(url)
  }

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  const typeLabels = {
    page: t('search', 'typePages'),
    order: t('search', 'typeOrders'),
    inventory: t('search', 'typeInventory'),
    user: t('search', 'typeUsers'),
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <span>{t('search', 'button')}</span>
        <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">
          Ctrl+K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        className="fixed top-0 left-0 right-0 bottom-0 z-50"
      >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

        {/* Command Palette */}
        <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={t('search', 'placeholder')}
              className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 outline-none"
            />
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
            )}
          </div>

          {/* Results */}
          <Command.List className="p-2 max-h-96 overflow-y-auto">
            {results.length === 0 && !loading && search && (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                {t('search', 'noResults')} &quot;{search}&quot;
              </div>
            )}

            {Object.entries(groupedResults).map(([type, items]) => (
              <Command.Group key={type} heading={typeLabels[type as keyof typeof typeLabels]}>
                {items.map((result) => (
                  <Command.Item
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result.url)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-700"
                  >
                    <span className="text-xl">{result.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-900 dark:text-white font-medium truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{result.subtitle}</div>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">↑↓</kbd>
                {t('search', 'navigation')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">Enter</kbd>
                {t('search', 'select')}
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded">Esc</kbd>
              {t('search', 'close')}
            </span>
          </div>
        </div>
      </Command.Dialog>
    </>
  )
}
