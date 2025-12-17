// ============================================
// app/documents/add/page.tsx
// Formularz dodawania dokumentu magazynowego
// ============================================

import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import AddDocumentForm from './AddDocumentForm'
import { logger } from '@/lib/logger'

export const metadata = {
  title: 'Nowy Dokument | CNC Pilot',
  description: 'Dodaj nowy dokument magazynowy'
}

export default async function AddDocumentPage() {
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch inventory items dla dropdown
  const { data: inventoryItems, error } = await supabase
    .from('inventory')
    .select('id, sku, name, quantity, unit')
    .eq('company_id', user.company_id)
    .order('name', { ascending: true })

  if (error) {
    logger.error('Error fetching inventory', { error })
  }

  // Fetch customers dla dropdown kontrahentów
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, name, type')
    .eq('company_id', user.company_id)
    .order('name', { ascending: true })

  if (customersError) {
    logger.error('Error fetching customers', { error: customersError })
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Nowy Dokument Magazynowy</h1>
          <AddDocumentForm
            inventoryItems={inventoryItems || []}
            customers={customers || []}
            userId={user.id}
            companyId={user.company_id}
          />
        </div>
      </div>
    </AppLayout>
  )
}
