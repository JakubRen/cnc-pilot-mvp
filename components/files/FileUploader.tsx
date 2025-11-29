'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useFileUpload, UploadedFile } from '@/hooks/useFileUpload'

interface FileUploaderProps {
  entityType?: 'order' | 'inventory' | 'document' | 'user'
  entityId?: string
  onUploadComplete?: (files: UploadedFile[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedFileTypes?: Record<string, string[]>
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
  const { uploading, uploadFiles } = useFileUpload({
    entityType,
    entityId,
    onUploadComplete
  })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      await uploadFiles(acceptedFiles)
    },
    [uploadFiles]
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
