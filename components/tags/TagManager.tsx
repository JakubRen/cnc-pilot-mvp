'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { useTranslation } from '@/hooks/useTranslation'

interface Tag {
  id: string
  name: string
  color: string
  company_id: string
  created_at: string
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
]

export default function TagManager() {
  const { t } = useTranslation()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState({ name: '', color: PRESET_COLORS[0] })

  useEffect(() => {
    fetchTags()
  }, [])

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
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTags(data || [])
    } catch (error) {
      logger.error('Error fetching tags', { error })
      toast.error(t('tagsSection', 'errorLoading'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error(t('tagsSection', 'enterName'))
      return
    }

    const loadingToast = toast.loading(editingTag ? t('common', 'loading') : t('common', 'loading'))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) throw new Error('No company')

      if (editingTag) {
        // Update existing tag
        const { error } = await supabase
          .from('tags')
          .update({ name: formData.name, color: formData.color })
          .eq('id', editingTag.id)
          .eq('company_id', userProfile.company_id)

        if (error) throw error
        toast.success(t('common', 'success'))
      } else {
        // Create new tag
        const { error } = await supabase
          .from('tags')
          .insert({
            name: formData.name,
            color: formData.color,
            company_id: userProfile.company_id,
          })

        if (error) throw error
        toast.success(t('common', 'success'))
      }

      toast.dismiss(loadingToast)
      setIsModalOpen(false)
      setEditingTag(null)
      setFormData({ name: '', color: PRESET_COLORS[0] })
      fetchTags()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error instanceof Error ? error.message : t('tagsSection', 'errorSaving')
      toast.error(message)
    }
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({ name: tag.name, color: tag.color })
    setIsModalOpen(true)
  }

  const handleDelete = async (tagId: string) => {
    if (!confirm(t('tagsSection', 'deleteConfirm'))) return

    const loadingToast = toast.loading(t('common', 'loading'))

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success(t('tagsSection', 'deleted'))
      fetchTags()
    } catch (error) {
      toast.dismiss(loadingToast)
      const message = error instanceof Error ? error.message : t('tagsSection', 'errorDeleting')
      toast.error(message)
    }
  }

  const openCreateModal = () => {
    setEditingTag(null)
    setFormData({ name: '', color: PRESET_COLORS[0] })
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('tagsSection', 'manage')}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {t('tagsSection', 'subtitle')}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold flex items-center gap-2"
        >
          <span className="text-lg">+</span>
          {t('tagsSection', 'create')}
        </button>
      </div>

      {/* Tags List */}
      {tags.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🏷️</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('tagsSection', 'noTags')}</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {t('tagsSection', 'noTagsDesc')}
          </p>
          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
          >
            {t('tagsSection', 'createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-slate-300 dark:hover:border-slate-600 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className="px-3 py-1 rounded-full text-white text-sm font-semibold"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(tag)}
                  className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded text-sm transition"
                >
                  {t('common', 'edit')}
                </button>
                <button
                  onClick={() => handleDelete(tag.id)}
                  className="flex-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-sm transition"
                >
                  {t('tagsSection', 'delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingTag ? t('common', 'edit') : t('tagsSection', 'create')}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingTag(null)
                }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* Name Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  {t('tagsSection', 'name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('tagsSection', 'namePlaceholder')}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Color Picker */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">
                  {t('tagsSection', 'color')}
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-lg transition ${
                        formData.color === color
                          ? 'ring-2 ring-slate-900 dark:ring-white ring-offset-2 ring-offset-white dark:ring-offset-slate-800 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  {t('tagsSection', 'preview')}
                </label>
                <div
                  className="inline-block px-4 py-2 rounded-full text-white font-semibold"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.name || t('tagsSection', 'name')}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingTag(null)
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg transition font-semibold"
                >
                  {t('common', 'cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                >
                  {editingTag ? t('tagsSection', 'save') : t('tagsSection', 'create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
