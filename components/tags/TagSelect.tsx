'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Tag {
  id: string
  name: string
  color: string
}

interface TagSelectProps {
  entityType: 'order' | 'inventory_item'
  entityId: string
  selectedTags: Tag[]
  onTagsChange?: (tags: Tag[]) => void
}

export default function TagSelect({
  entityType,
  entityId,
  selectedTags,
  onTagsChange,
}: TagSelectProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAvailableTags()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchAvailableTags = async () => {
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
      setAvailableTags(data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const isTagSelected = (tagId: string) => {
    return selectedTags.some((tag) => tag.id === tagId)
  }

  const handleToggleTag = async (tag: Tag) => {
    const isSelected = isTagSelected(tag.id)

    try {
      if (isSelected) {
        // Remove tag
        const { error } = await supabase
          .from('entity_tags')
          .delete()
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('tag_id', tag.id)

        if (error) throw error

        const newTags = selectedTags.filter((t) => t.id !== tag.id)
        onTagsChange?.(newTags)
      } else {
        // Add tag
        const { error } = await supabase
          .from('entity_tags')
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            tag_id: tag.id,
          })

        if (error) throw error

        const newTags = [...selectedTags, tag]
        onTagsChange?.(newTags)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Błąd podczas aktualizacji tagów'
      toast.error(message)
    }
  }

  const filteredTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-slate-400">Brak tagów</span>
        ) : (
          selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-semibold"
              style={{ backgroundColor: tag.color }}
            >
              <span>{tag.name}</span>
              <button
                onClick={() => handleToggleTag(tag)}
                className="hover:bg-white/20 rounded-full p-0.5 transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Tag Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition flex items-center gap-2"
      >
        <span className="text-base">🏷️</span>
        <span>Dodaj tag</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          {/* Search */}
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj taga..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tags List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredTags.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                {searchQuery ? 'Nie znaleziono tagów' : 'Brak dostępnych tagów'}
              </div>
            ) : (
              filteredTags.map((tag) => {
                const selected = isTagSelected(tag.id)
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(tag)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition ${
                      selected
                        ? 'bg-slate-700'
                        : 'hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-white">{tag.name}</span>
                    </div>
                    {selected && (
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
