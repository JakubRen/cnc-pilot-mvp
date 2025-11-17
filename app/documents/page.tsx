// ============================================
// app/documents/page.tsx
// Lista dokumentów magazynowych (PW, RW, WZ)
// ============================================

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import EmptyState from '@/components/ui/EmptyState'

export const metadata = {
  title: 'Wydania | CNC Pilot',
  description: 'Dokumenty magazynowe PW, RW, WZ'
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch warehouse documents z relacjami
  const { data: documents, error } = await supabase
    .from('warehouse_documents')
    .select(`
      *,
      users!warehouse_documents_created_by_fkey (
        id,
        full_name
      )
    `)
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Wydania</h1>
              <p className="text-slate-400">
                Dokumenty magazynowe: PW (Przyjęcie), RW (Rozchód), WZ (Wydanie)
              </p>
            </div>
            <Link
              href="/documents/add"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-lg"
            >
              + Nowy Dokument
            </Link>
          </div>

          {/* Documents Table or Empty State */}
          {(!documents || documents.length === 0) ? (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
              <EmptyState
                icon="📄"
                title="Brak dokumentów magazynowych"
                description="Nie masz jeszcze żadnych dokumentów PW/RW/WZ. Dodaj pierwszy dokument aby zarządzać ruchem towarów w magazynie."
                actionLabel="+ Dodaj Pierwszy Dokument"
                actionHref="/documents/add"
              />
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Typ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Numer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Kontrahent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Utworzył
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {documents.map((doc) => {
                    const creatorName = Array.isArray(doc.users)
                      ? doc.users[0]?.full_name
                      : doc.users?.full_name

                    // Kolory dla typów dokumentów
                    const docTypeColor = {
                      PW: 'bg-green-600',
                      RW: 'bg-blue-600',
                      WZ: 'bg-orange-600'
                    }[doc.document_type] || 'bg-slate-600'

                    // Kolory dla statusów
                    const statusColor = doc.status === 'confirmed'
                      ? 'bg-green-600'
                      : 'bg-yellow-600'

                    return (
                      <tr key={doc.id} className="hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${docTypeColor}`}>
                            {doc.document_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white font-semibold">
                          {doc.document_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {doc.contractor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${statusColor}`}>
                            {doc.status === 'confirmed' ? 'Zatwierdzony' : 'Szkic'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {creatorName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="text-blue-400 hover:text-blue-300 mr-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            View
                          </Link>
                          {doc.status === 'draft' && (
                            <Link
                              href={`/documents/${doc.id}/edit`}
                              className="text-slate-300 hover:text-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                              Edit
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
