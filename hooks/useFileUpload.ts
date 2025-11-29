import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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

  const uploadFiles = useCallback(async (acceptedFiles: File[]) => {
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
  }, [entityType, entityId, onUploadComplete])

  return {
    uploading,
    uploadProgress,
    uploadFiles
  }
}
