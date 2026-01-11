import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

export interface UploadedFile {
  id: string
  filename: string
  url: string
  size: number
  type: string
}

interface UseFileUploadOptions {
  entityType?: 'order' | 'inventory' | 'document' | 'user'
  entityId?: string
  onUploadComplete?: (files: UploadedFile[]) => void
}

export const useFileUpload = ({ entityType, entityId, onUploadComplete }: UseFileUploadOptions) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [totalFiles, setTotalFiles] = useState(0)
  const [completedFiles, setCompletedFiles] = useState(0)

  const uploadFiles = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setUploading(true)
    setTotalFiles(acceptedFiles.length)
    setCompletedFiles(0)
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
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i]
        setCurrentFile(file.name)
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${userProfile.company_id}/${fileName}`

        // Simulate progress start
        setUploadProgress(prev => ({ ...prev, [file.name]: 30 }))

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          logger.error('Upload error', { error: uploadError, filename: file.name })
          toast.error(`Błąd przesyłania: ${file.name}`)
          setUploadProgress(prev => ({ ...prev, [file.name]: -1 })) // -1 indicates error
          continue
        }

        // Update progress - upload complete
        setUploadProgress(prev => ({ ...prev, [file.name]: 70 }))

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
          logger.error('Database error', { error: dbError, filename: file.name })
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

        // Mark as complete
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
        setCompletedFiles(prev => prev + 1)
        toast.success(`Przesłano: ${file.name}`)
      }

      if (uploadedFiles.length > 0 && onUploadComplete) {
        onUploadComplete(uploadedFiles)
      }
    } catch (error) {
      logger.error('Upload error', { error })
      toast.error('Wystąpił błąd podczas przesyłania plików')
    } finally {
      setUploading(false)
      setCurrentFile(null)
      // Keep progress for a moment so user can see completion
      setTimeout(() => {
        setUploadProgress({})
        setTotalFiles(0)
        setCompletedFiles(0)
      }, 1500)
    }
  }, [entityType, entityId, onUploadComplete])

  return {
    uploading,
    uploadProgress,
    uploadFiles,
    currentFile,
    totalFiles,
    completedFiles,
    overallProgress: totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0
  }
}
