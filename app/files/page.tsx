import { Metadata } from 'next'
import AppLayout from '@/components/layout/AppLayout'
import FileUploader from '@/components/files/FileUploader'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Pliki | CNC-Pilot',
  description: 'Zarządzanie plikami i dokumentami',
}

export default async function FilesPage() {
  const userProfile = await getUserProfile()
  if (!userProfile) redirect('/login')

  const supabase = await createClient()

  // Fetch uploaded files
  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Pliki</h1>
            <p className="text-slate-400">
              Prześlij i zarządzaj plikami oraz dokumentami
            </p>
          </div>

          {/* File Uploader */}
          <div className="mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Prześlij pliki</h2>
              <FileUploader
                onUploadComplete={(uploadedFiles) => {
                  console.log('Uploaded files:', uploadedFiles)
                  // Możesz tutaj dodać refresh lub toast notification
                }}
                maxFiles={10}
                maxSize={10 * 1024 * 1024} // 10MB
              />
            </div>
          </div>

          {/* Files List */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Przesłane pliki ({files?.length || 0})
            </h2>

            {files && files.length > 0 ? (
              <div className="space-y-2">
                {files.map((file: any) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                  >
                    <div className="flex items-center gap-4">
                      {/* File Icon */}
                      <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center text-2xl">
                        {file.file_type === 'pdf' && '📄'}
                        {file.file_type === 'xlsx' && '📊'}
                        {file.file_type === 'csv' && '📊'}
                        {['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(file.file_type) && '🖼️'}
                        {!['pdf', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp'].includes(file.file_type) && '📎'}
                      </div>

                      {/* File Info */}
                      <div>
                        <h3 className="text-white font-semibold">{file.original_filename}</h3>
                        <p className="text-sm text-slate-400">
                          {file.file_type.toUpperCase()} • {(file.size_bytes / 1024).toFixed(1)} KB
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(file.created_at).toLocaleDateString('pl-PL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {file.public_url && (
                        <a
                          href={file.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-semibold text-sm"
                        >
                          Otwórz
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📂</div>
                <h3 className="text-xl font-bold text-white mb-2">Brak plików</h3>
                <p className="text-slate-400">
                  Prześlij pierwszy plik używając formularza powyżej
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
