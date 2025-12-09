'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface SavedFilter {
  id: string
  name: string
  filter_config: Record<string, unknown>
  is_default: boolean
  created_at: string
}

interface SavedFiltersProps {
  filterType: 'order' | 'inventory'
  currentFilters: Record<string, unknown>
  onLoadFilter: (config: Record<string, unknown>) => void
}

export default function SavedFilters({
  filterType,
  currentFilters,
  onLoadFilter,
}: SavedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSavedFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType])

  const fetchSavedFilters = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) return

      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('filter_type', filterType)
        .or(`user_id.eq.${userProfile.id},is_default.eq.true`)
        .eq('company_id', userProfile.company_id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedFilters(data || [])
    } catch (error) {
      console.error('Error fetching saved filters:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFilter = async () => {
    if (!filterName.trim()) {
      toast.error('Podaj nazwę filtru')
      return
    }

    const loadingToast = toast.loading('Zapisywanie filtru...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) throw new Error('No user profile')

      const { error } = await supabase
        .from('saved_filters')
        .insert({
          user_id: userProfile.id,
          company_id: userProfile.company_id,
          name: filterName,
          filter_type: filterType,
          filter_config: currentFilters,
          is_default: false,
        })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Filtr zapisany!')
      setIsModalOpen(false)
      setFilterName('')
      fetchSavedFilters()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error instanceof Error ? error.message : 'Błąd podczas zapisywania'
      toast.error(message)
    }
  }

  const handleLoadFilter = (filter: SavedFilter) => {
    onLoadFilter(filter.filter_config)
    toast.success(`Załadowano filtr: ${filter.name}`)
  }

  const handleDeleteFilter = async (filterId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten filtr?')) return

    const loadingToast = toast.loading('Usuwanie...')

    try {
      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', filterId)

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Filtr usunięty!')
      fetchSavedFilters()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error instanceof Error ? error.message : 'Błąd podczas usuwania'
      toast.error(message)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Zapisane Filtry</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs text-blue-400 hover:text-blue-300 transition font-semibold"
        >
          + Zapisz Aktualny
        </button>
      </div>

      {/* Saved Filters List */}
      {savedFilters.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
          Brak zapisanych filtrów
        </p>
      ) : (
        <div className="space-y-2">
          {savedFilters.map((filter) => (
            <div
              key={filter.id}
              className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition group"
            >
              <button
                onClick={() => handleLoadFilter(filter)}
                className="flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-900 dark:text-white font-medium">
                    {filter.name}
                  </span>
                  {filter.is_default && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      System
                    </span>
                  )}
                </div>
              </button>
              {!filter.is_default && (
                <button
                  onClick={() => handleDeleteFilter(filter.id)}
                  className="opacity-0 group-hover:opacity-100 ml-2 text-red-400 hover:text-red-300 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Save Filter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Zapisz Filtr</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Nazwa Filtru
              </label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="np. Pilne zamówienia z tagiem XYZ"
                className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveFilter()
                }}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition font-semibold"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveFilter}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
