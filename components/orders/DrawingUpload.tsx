'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

interface DrawingUploadProps {
  value: string | null
  onChange: (fileId: string | null) => void
  companyId: string
  userId: number
}

export default function DrawingUpload({ value, onChange, companyId, userId }: DrawingUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [currentFile, setCurrentFile] = useState<{ id: string; name: string; url: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load existing file if value is provided
  useState(() => {
    if (value && !currentFile) {
      loadFileInfo(value)
    }
  })

  async function loadFileInfo(fileId: string) {
    const { data: file } = await supabase
      .from('files')
      .select('id, name, url')
      .eq('id', fileId)
      .single()

    if (file) {
      setCurrentFile(file)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['application/pdf', 'image/vnd.dxf', 'application/dxf', 'image/png', 'image/jpeg']
    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.dxf')) {
      toast.error('Dozwolone formaty: PDF, DXF, PNG, JPG')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('Plik jest za duży. Maksymalny rozmiar to 10MB')
      return
    }

    setIsUploading(true)
    const loadingToast = toast.loading('Przesyłanie rysunku...')

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${companyId}/drawings/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath)

      // Save file record to database
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          name: file.name,
          url: publicUrl,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          company_id: companyId,
          uploaded_by: userId,
          category: 'drawing' // Kategoryzacja dla łatwiejszego filtrowania
        })
        .select()
        .single()

      if (dbError) throw dbError

      toast.dismiss(loadingToast)
      toast.success('Rysunek przesłany pomyślnie!')

      setCurrentFile({
        id: fileRecord.id,
        name: fileRecord.name,
        url: fileRecord.url
      })
      onChange(fileRecord.id)

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd podczas przesyłania pliku: ' + (error as Error).message)
      logger.error('Error uploading drawing', { error })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setCurrentFile(null)
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        📐 Rysunek Techniczny
        <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
          (PDF, DXF, PNG, JPG - max 10MB)
        </span>
      </label>

      {currentFile ? (
        // Preview existing file
        <div className="bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {currentFile.name.toLowerCase().endsWith('.pdf') ? '📄' :
                 currentFile.name.toLowerCase().endsWith('.dxf') ? '📐' : '🖼️'}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {currentFile.name}
                </p>
                <a
                  href={currentFile.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Otwórz w nowej karcie →
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
            >
              ✕ Usuń
            </button>
          </div>
        </div>
      ) : (
        // Upload new file
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.dxf,.png,.jpg,.jpeg"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="drawing-upload"
          />
          <label
            htmlFor="drawing-upload"
            className={`
              block w-full px-4 py-8 border-2 border-dashed rounded-lg
              text-center cursor-pointer transition
              ${isUploading
                ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 bg-slate-50 dark:bg-slate-900'
              }
            `}
          >
            <div className="text-4xl mb-2">📎</div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isUploading ? 'Przesyłanie...' : 'Kliknij aby wybrać rysunek'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              lub przeciągnij i upuść plik tutaj
            </p>
          </label>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
        💡 Rysunek będzie dostępny dla operatora przy maszynie (widok na tablecie)
      </p>
    </div>
  )
}
