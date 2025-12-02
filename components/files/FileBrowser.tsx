'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Image from 'next/image'

export interface FileBrowserFile {
  id: string
  original_filename: string
  filename: string
  mime_type: string
  size_bytes: number
  storage_path: string
  public_url: string
  created_at: string
}

interface FileBrowserProps {
  files: FileBrowserFile[]
  onFileDeleted?: () => void
}

type ViewMode = 'grid' | 'list'

export default function FileBrowser({ files, onFileDeleted }: FileBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [previewFile, setPreviewFile] = useState<FileBrowserFile | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  // Filter files by type
  const filteredFiles = files.filter((file) => {
    if (filterType === 'all') return true
    if (filterType === 'images') return file.mime_type?.startsWith('image/')
    if (filterType === 'pdf') return file.mime_type === 'application/pdf'
    if (filterType === 'excel') return file.mime_type?.includes('spreadsheet')
    if (filterType === 'docs') return file.mime_type?.includes('document')
    return true
  })

  // Download file
  const handleDownload = async (file: FileBrowserFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.original_filename || file.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Plik pobierany!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Błąd pobierania pliku')
    }
  }

  // Delete file
  const handleDelete = async (file: FileBrowserFile) => {
    if (!confirm(`Czy na pewno chcesz usunąć plik: ${file.original_filename}?`)) return

    const loadingToast = toast.loading('Usuwanie...')

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([file.storage_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      toast.dismiss(loadingToast)
      toast.success('Plik usunięty!')
      onFileDeleted?.()
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Delete error:', error)
      toast.error('Błąd usuwania pliku')
    }
  }

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return '🖼️'
    if (mimeType === 'application/pdf') return '📄'
    if (mimeType?.includes('spreadsheet')) return '📊'
    if (mimeType?.includes('document')) return '📝'
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦'
    if (mimeType?.startsWith('text/')) return '📃'
    return '📁'
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Header with filters and view toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Wszystkie ({files.length})
          </button>
          <button
            onClick={() => setFilterType('images')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterType === 'images'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            🖼️ Obrazy
          </button>
          <button
            onClick={() => setFilterType('pdf')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterType === 'pdf'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📄 PDF
          </button>
          <button
            onClick={() => setFilterType('excel')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filterType === 'excel'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📊 Excel
          </button>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
            }`}
            title="Widok kafelkowy"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
            }`}
            title="Widok listy"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-white mb-2">
            {filterType === 'all' ? 'Brak plików' : 'Brak plików tego typu'}
          </h3>
          <p className="text-slate-400">
            {filterType === 'all'
              ? 'Prześlij pierwszy plik używając formularza powyżej'
              : 'Zmień filtr aby zobaczyć inne pliki'}
          </p>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filteredFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition group"
            >
              {/* Preview */}
              <div
                className="h-40 bg-slate-900 flex items-center justify-center cursor-pointer relative overflow-hidden"
                onClick={() => setPreviewFile(file)}
              >
                {file.mime_type?.startsWith('image/') ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={file.public_url}
                      alt={file.original_filename}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-6xl">{getFileIcon(file.mime_type)}</div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">Podgląd</span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="text-white font-semibold text-sm truncate mb-2" title={file.original_filename}>
                  {file.original_filename}
                </h4>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>{formatFileSize(file.size_bytes)}</p>
                  <p>{formatDate(file.created_at)}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleDownload(file)}
                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition font-semibold"
                  >
                    Pobierz
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filteredFiles.length > 0 && (
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-4 p-4 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition group"
            >
              <div className="text-3xl flex-shrink-0">{getFileIcon(file.mime_type)}</div>

              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold text-sm truncate" title={file.original_filename}>
                  {file.original_filename}
                </h4>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span>{formatFileSize(file.size_bytes)}</span>
                  <span>{formatDate(file.created_at)}</span>
                  <span className="truncate">{file.mime_type}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setPreviewFile(file)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition"
                >
                  Podgląd
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition font-semibold"
                >
                  Pobierz
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white font-bold truncate">{previewFile.original_filename}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              {previewFile.mime_type?.startsWith('image/') ? (
                <div className="relative w-full" style={{ minHeight: '400px' }}>
                  <Image
                    src={previewFile.public_url}
                    alt={previewFile.original_filename}
                    width={800}
                    height={600}
                    className="mx-auto"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ) : previewFile.mime_type === 'application/pdf' ? (
                <iframe
                  src={previewFile.public_url}
                  className="w-full h-[600px] border-0"
                  title={previewFile.original_filename}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">{getFileIcon(previewFile.mime_type)}</div>
                  <p className="text-slate-400 mb-4">Podgląd niedostępny dla tego typu pliku</p>
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                  >
                    Pobierz plik
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-700 bg-slate-900">
              <div className="text-sm text-slate-400">
                {formatFileSize(previewFile.size_bytes)} • {formatDate(previewFile.created_at)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(previewFile)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold"
                >
                  Pobierz
                </button>
                <button
                  onClick={() => {
                    handleDelete(previewFile)
                    setPreviewFile(null)
                  }}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                >
                  Usuń
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
