'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagFilterProps {
  onFilterChange: (selectedTagIds: string[], logic: 'AND' | 'OR') => void
}

export default function TagFilter({ onFilterChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [logic, setLogic] = useState<'AND' | 'OR'>('OR')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    onFilterChange(selectedTags, logic)
  }, [selectedTags, logic])

  const fetchTags = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) return

      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color')
        .eq('company_id', userProfile.company_id)
        .order('name')

      if (error) throw error
      setTags(data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const handleToggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleClearAll = () => {
    setSelectedTags([])
  }

  const selectedTagsData = tags.filter((tag) => selectedTags.includes(tag.id))

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Filtruj po tagach</h3>
        {selectedTags.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-blue-400 hover:text-blue-300 transition"
          >
            Wyczyść
          </button>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {selectedTagsData.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs font-semibold"
                style={{ backgroundColor: tag.color }}
              >
                <span>{tag.name}</span>
                <button
                  onClick={() => handleToggleTag(tag.id)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logic Toggle */}
      {selectedTags.length > 1 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Logika:</span>
            <button
              onClick={() => setLogic(logic === 'AND' ? 'OR' : 'AND')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                logic === 'AND'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {logic === 'AND' ? 'Wszystkie (AND)' : 'Dowolny (OR)'}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {logic === 'AND'
              ? 'Pokaż elementy z wszystkimi wybranymi tagami'
              : 'Pokaż elementy z dowolnym z wybranych tagów'}
          </p>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition"
      >
        <span>
          {selectedTags.length === 0
            ? 'Wybierz tagi'
            : `Wybrano: ${selectedTags.length}`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Tags List */}
      {isOpen && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Brak dostępnych tagów
            </p>
          ) : (
            tags.map((tag) => {
              const isSelected = selectedTags.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition ${
                    isSelected
                      ? 'bg-slate-700'
                      : 'hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-white text-left">{tag.name}</span>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}

      {/* Info */}
      {tags.length === 0 && (
        <p className="text-xs text-slate-500 mt-3">
          Utwórz tagi, aby filtrować zamówienia i produkty
        </p>
      )}
    </div>
  )
}
