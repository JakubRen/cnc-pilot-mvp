// ============================================
// app/documents/[id]/page.tsx
// Szczegóły dokumentu magazynowego
// ============================================

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import DeleteButton from './DeleteButton'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch document (without problematic JOINs)
  const { data: document, error } = await supabase
    .from('warehouse_documents')
    .select('*')
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !document) {
    notFound()
  }

  // Fetch creator name separately
  let creatorName = '-'
  if (document.created_by) {
    const { data: creator } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', document.created_by)
      .single()
    creatorName = creator?.full_name || '-'
  }

  // Fetch items dokumentu
  const { data: rawItems } = await supabase
    .from('warehouse_document_items')
    .select('*')
    .eq('document_id', id)
    .order('created_at', { ascending: true })

  // Fetch inventory details for each item
  const items = await Promise.all((rawItems || []).map(async (item) => {
    const { data: inv } = await supabase
      .from('inventory')
      .select('id, sku, name, unit')
      .eq('id', item.inventory_id)
      .single()
    return { ...item, inventory: inv }
  }))

  // Kolory dla typów
  const docTypeColors: Record<string, string> = {
    PW: 'bg-green-600',
    RW: 'bg-violet-600',
    WZ: 'bg-orange-600'
  }
  const docTypeColor = docTypeColors[document.document_type] || 'bg-slate-600'

  const statusColor = document.status === 'confirmed'
    ? 'bg-green-600'
    : 'bg-yellow-600'

  return (
<div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Dokumenty', href: '/documents' },
            { label: document.document_number },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link
              href="/documents"
              className="text-violet-400 hover:text-violet-300 text-sm mb-2 inline-block"
            >
              ← Powrót do listy
            </Link>
            <h1 className="text-3xl font-bold text-foreground mb-2">
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
            <div className="flex gap-3">
              <Link
                href={`/documents/${id}/edit`}
                className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
              >
                Edytuj
              </Link>
              {user.role === 'owner' && (
                <DeleteButton
                  documentId={id}
                  documentNumber={document.document_number}
                  companyId={user.company_id}
                />
              )}
            </div>
          )}
        </div>

        {/* Document Info */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Informacje o dokumencie</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Kontrahent</p>
              <p className="text-foreground font-medium">{document.contractor}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Data utworzenia</p>
              <p className="text-foreground font-medium">
                {new Date(document.created_at).toLocaleString('pl-PL')}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Utworzył</p>
              <p className="text-foreground font-medium">{creatorName || '-'}</p>
            </div>

            <div>
              <p className="text-muted-foreground text-sm mb-1">Status</p>
              <p className="text-foreground font-medium">
                {document.status === 'confirmed' ? 'Zatwierdzony (wpłynął na stany)' : 'Szkic (nie wpłynął na stany)'}
              </p>
            </div>
          </div>

          {document.description && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-muted-foreground text-sm mb-1">Opis</p>
              <p className="text-foreground">{document.description}</p>
            </div>
          )}
        </div>

        {/* Document Items */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">
              Pozycje dokumentu ({items?.length || 0})
            </h2>
          </div>

          {items && items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Lp.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Nazwa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Ilość
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                      Notatka
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {items.map((item, index) => {
                    const inventory = item.inventory

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground font-semibold">
                          {inventory?.sku || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          <Link
                            href={`/inventory/${inventory?.id}`}
                            className="text-violet-400 hover:text-violet-300"
                          >
                            {inventory?.name || '-'}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                          {item.quantity} {inventory?.unit || ''}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {item.notes || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
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
)
}
