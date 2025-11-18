'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface FileUploaderProps {
  entityType?: 'order' | 'inventory' | 'document' | 'user'
  entityId?: string
  onUploadComplete?: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedFileTypes?: Record<string, string[]>
}

interface UploadedFile {
  id: string
  filename: string
  url: string
  size: number
  type: string
}

export default function FileUploader({
  entityType,
  entityId,
  onUploadComplete,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
  acceptedFileTypes = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
  },
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      setUploading(true)
      const uploadedFiles: UploadedFile[] = []

      try {
        // Get user's company_id
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          toast.error('Musisz być zalogowany aby przesłać pliki')
          return
        }

        const { data: userProfile } = await supabase
          .from('users')
          .select('id, company_id')
          .eq('auth_id', user.id)
          .single()

        if (!userProfile?.company_id) {
          toast.error('Błąd: Brak company_id')
          return
        }

        // Upload each file
        for (const file of acceptedFiles) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const filePath = `${userProfile.company_id}/${fileName}`

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            console.error('Upload error:', uploadError)
            toast.error(`Błąd przesyłania: ${file.name}`)
            continue
          }

          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('files').getPublicUrl(filePath)

          // Save metadata to database
          const { data: fileRecord, error: dbError } = await supabase
            .from('files')
            .insert({
              company_id: userProfile.company_id,
              uploaded_by: userProfile.id,
              entity_type: entityType,
              entity_id: entityId,
              filename: fileName,
              original_filename: file.name,
              file_type: fileExt || 'unknown',
              mime_type: file.type,
              size_bytes: file.size,
              storage_path: filePath,
              public_url: publicUrl,
            })
            .select()
            .single()

          if (dbError) {
            console.error('Database error:', dbError)
            toast.error(`Błąd zapisu metadanych: ${file.name}`)
            continue
          }

          uploadedFiles.push({
            id: fileRecord.id,
            filename: file.name,
            url: publicUrl,
            size: file.size,
            type: file.type,
          })

          toast.success(`Przesłano: ${file.name}`)
        }

        if (uploadedFiles.length > 0 && onUploadComplete) {
          onUploadComplete(uploadedFiles)
        }
      } catch (error) {
        console.error('Upload error:', error)
        toast.error('Wystąpił błąd podczas przesyłania plików')
      } finally {
        setUploading(false)
        setUploadProgress({})
      }
    },
    [entityType, entityId, onUploadComplete]
  )

  const { getRootProps, getInputProps, isDragActive, acceptedFiles, fileRejections } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedFileTypes,
    disabled: uploading,
  })

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-600 hover:border-slate-500 bg-slate-800'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-2">
          {/* Upload Icon */}
          <svg
            className="w-12 h-12 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {uploading ? (
            <div>
              <p className="text-white font-medium">Przesyłanie plików...</p>
              <div className="mt-2 w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse" style={{ width: '50%' }} />
              </div>
            </div>
          ) : isDragActive ? (
            <p className="text-white font-medium">Upuść pliki tutaj...</p>
          ) : (
            <div>
              <p className="text-white font-medium">
                Przeciągnij pliki tutaj lub kliknij aby wybrać
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Maksymalnie {maxFiles} plików, {(maxSize / 1024 / 1024).toFixed(0)}MB każdy
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Obsługiwane: PDF, obrazy, Excel, CSV
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
          <h4 className="text-red-400 font-semibold mb-2">Odrzucone pliki:</h4>
          <ul className="text-sm text-red-300 space-y-1">
            {fileRejections.map(({ file, errors }) => (
              <li key={file.name}>
                {file.name} -{' '}
                {errors.map((e) => (e.code === 'file-too-large' ? 'plik za duży' : e.message)).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Accepted Files Preview */}
      {acceptedFiles.length > 0 && !uploading && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Wybrane pliki:</h4>
          <ul className="text-sm text-slate-300 space-y-1">
            {acceptedFiles.map((file) => (
              <li key={file.name} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
