'use client'

import { useRouter } from 'next/navigation'
import FileUploader from '@/components/files/FileUploader'
import FileBrowser, { FileBrowserFile } from '@/components/files/FileBrowser'

interface FilesPageClientProps {
  initialFiles: FileBrowserFile[]
}

export default function FilesPageClient({ initialFiles }: FilesPageClientProps) {
  const router = useRouter()

  const handleUploadComplete = () => {
    router.refresh()
  }

  const handleFileDeleted = () => {
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Pliki</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Prześlij i zarządzaj plikami oraz dokumentami
          </p>
        </div>

        {/* File Uploader */}
        <div className="mb-8">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Prześlij pliki</h2>
            <FileUploader
              onUploadComplete={handleUploadComplete}
              maxFiles={10}
              maxSize={10 * 1024 * 1024} // 10MB
            />
          </div>
        </div>

        {/* Files Browser */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Przesłane pliki ({initialFiles.length})
          </h2>
          <FileBrowser files={initialFiles} onFileDeleted={handleFileDeleted} />
        </div>
      </div>
    </div>
  )
}
