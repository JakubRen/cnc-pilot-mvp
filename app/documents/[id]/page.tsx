// ============================================
// app/documents/[id]/page.tsx
// Szczegóły dokumentu magazynowego
// ============================================

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch document z relacjami
  const { data: document, error } = await supabase
    .from('warehouse_documents')
    .select(`
      *,
      users!warehouse_documents_created_by_fkey (
        id,
        full_name
      )
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !document) {
    notFound()
  }

  // Fetch items dokumentu
  const { data: items } = await supabase
    .from('warehouse_document_items')
    .select(`
      *,
      inventory (
        id,
        sku,
        name,
        unit
      )
    `)
    .eq('document_id', id)
    .order('created_at', { ascending: true })

  const creatorName = Array.isArray(document.users)
    ? document.users[0]?.full_name
    : document.users?.full_name

  // Kolory dla typów
  const docTypeColor = {
    PW: 'bg-green-600',
    RW: 'bg-blue-600',
    WZ: 'bg-orange-600'
  }[document.document_type] || 'bg-slate-600'

  const statusColor = document.status === 'confirmed'
    ? 'bg-green-600'
    : 'bg-yellow-600'

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <Link
                href="/documents"
                className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block"
              >
                ← Powrót do listy
              </Link>
              <h1 className="text-3xl font-bold text-white mb-2">
                Dokument {document.document_number}
              </h1>
              <div className="flex gap-3 items-center">
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${docTypeColor}`}>
                  {document.document_type}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusColor}`}>
                  {document.status === 'confirmed' ? 'Zatwierdzony' : 'Szkic'}
                </span>
              </div>
            </div>

            {document.status === 'draft' && (
              <Link
                href={`/documents/${id}/edit`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Edytuj
              </Link>
            )}
          </div>

          {/* Document Info */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Informacje o dokumencie</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Kontrahent</p>
                <p className="text-white font-medium">{document.contractor}</p>
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-1">Data utworzenia</p>
                <p className="text-white font-medium">
                  {new Date(document.created_at).toLocaleString('pl-PL')}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-1">Utworzył</p>
                <p className="text-white font-medium">{creatorName || '-'}</p>
              </div>

              <div>
                <p className="text-slate-400 text-sm mb-1">Status</p>
                <p className="text-white font-medium">
                  {document.status === 'confirmed' ? 'Zatwierdzony (wpłynął na stany)' : 'Szkic (nie wpłynął na stany)'}
                </p>
              </div>
            </div>

            {document.description && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Opis</p>
                <p className="text-white">{document.description}</p>
              </div>
            )}
          </div>

          {/* Document Items */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">
                Pozycje dokumentu ({items?.length || 0})
              </h2>
            </div>

            {items && items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Lp.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Nazwa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Ilość
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Notatka
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {items.map((item, index) => {
                      const inventory = Array.isArray(item.inventory)
                        ? item.inventory[0]
                        : item.inventory

                      return (
                        <tr key={item.id} className="hover:bg-slate-700/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white font-semibold">
                            {inventory?.sku || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-300">
                            <Link
                              href={`/inventory/${inventory?.id}`}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              {inventory?.name || '-'}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                            {item.quantity} {inventory?.unit || ''}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-400">
                            {item.notes || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                Brak pozycji w dokumencie
              </div>
            )}
          </div>

          {/* Info box */}
          {document.status === 'confirmed' && (
            <div className="mt-6 bg-green-900/20 border border-green-700/50 rounded-lg p-4 text-sm text-green-200">
              <p className="font-semibold mb-1">✓ Dokument zatwierdzony</p>
              <p className="text-green-300">
                Ten dokument został zatwierdzony i automatycznie zaktualizował stany magazynowe.
                {document.document_type === 'PW' && ' Komponenty zostały dodane do magazynu (+).'}
                {(document.document_type === 'RW' || document.document_type === 'WZ') && ' Komponenty zostały odjęte z magazynu (-).'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
