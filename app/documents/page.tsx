// ============================================
// app/documents/page.tsx
// Lista dokumentów magazynowych (PW, RW, WZ)
// ============================================

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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
      creator:users!created_by (
        id,
        full_name
      )
    `)
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
  }

  const getDocTypeBadge = (type: string) => {
    switch (type) {
      case 'PW': return <Badge variant="success">PW</Badge>
      case 'RW': return <Badge variant="default">RW</Badge>
      case 'WZ': return <Badge variant="warning">WZ</Badge>
      default: return <Badge variant="secondary">{type}</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    return status === 'confirmed'
      ? <Badge variant="success">Zatwierdzony</Badge>
      : <Badge variant="warning">Szkic</Badge>
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
            <Button href="/documents/add" variant="primary">
              + Nowy Dokument
            </Button>
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
                    const creatorName = Array.isArray(doc.creator)
                      ? doc.creator[0]?.full_name
                      : doc.creator?.full_name

                    return (
                      <tr key={doc.id} className="hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getDocTypeBadge(doc.document_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white font-semibold">
                          {doc.document_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {doc.contractor}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(doc.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                          {creatorName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <Button href={`/documents/${doc.id}`} variant="ghost" size="sm">
                            Podgląd
                          </Button>
                          {doc.status === 'draft' && (
                            <Button href={`/documents/${doc.id}/edit`} variant="ghost" size="sm">
                              Edytuj
                            </Button>
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
