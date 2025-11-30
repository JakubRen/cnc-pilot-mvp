// ============================================
// app/documents/[id]/edit/page.tsx
// Edycja szkicu dokumentu magazynowego
// ============================================

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import EditDocumentForm from './EditDocumentForm'

export const metadata = {
  title: 'Edytuj Dokument | CNC Pilot',
  description: 'Edytuj szkic dokumentu magazynowego'
}

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch document
  const { data: document, error: docError } = await supabase
    .from('warehouse_documents')
    .select('*')
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (docError || !document) {
    notFound()
  }

  // Check if draft (only drafts can be edited)
  if (document.status !== 'draft') {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-8 text-center">
              <h1 className="text-2xl font-bold text-red-200 mb-4">Nie można edytować</h1>
              <p className="text-red-300 mb-6">
                Tylko szkice dokumentów można edytować. Ten dokument został już zatwierdzony.
              </p>
              <a
                href={`/documents/${id}`}
                className="inline-block px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition font-semibold"
              >
                Powrót do szczegółów
              </a>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from('warehouse_document_items')
    .select(`
      *,
      inventory (
        id,
        sku,
        name,
        quantity,
        unit
      )
    `)
    .eq('document_id', id)
    .order('created_at', { ascending: true })

  if (itemsError) {
    console.error('Error fetching items:', itemsError)
  }

  // Fetch inventory for dropdown
  const { data: inventoryItems, error: invError } = await supabase
    .from('inventory')
    .select('id, sku, name, quantity, unit')
    .eq('company_id', user.company_id)
    .order('name', { ascending: true })

  if (invError) {
    console.error('Error fetching inventory:', invError)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Edytuj Dokument</h1>
          <p className="text-slate-400 mb-8">{document.document_number}</p>

          <EditDocumentForm
            documentId={id}
            document={document}
            items={items || []}
            inventoryItems={inventoryItems || []}
            companyId={user.company_id}
          />
        </div>
      </div>
    </AppLayout>
  )
}
