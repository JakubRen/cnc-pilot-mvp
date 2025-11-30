import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import InventoryTable from '@/components/inventory/InventoryTable'

export default async function InventoryPage() {
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  // Fetch inventory items (filtered by company)
  const { data: items, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inventory:', error)
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Magazyn</h1>
            {/* Buttons moved to InventoryTable for proper state management */}
          </div>

          {/* Inventory Table or Empty State */}
          {(!items || items.length === 0) ? (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
              <EmptyState
                icon="📦"
                title="Brak pozycji w magazynie"
                description="Twój magazyn jest pusty. Dodaj pierwsze materiały, narzędzia lub części żeby śledzić stany magazynowe."
                actionLabel="+ Dodaj do Magazynu"
                actionHref="/inventory/add"
              />
            </div>
          ) : (
            <InventoryTable items={items} />
          )}

        </div>
      </div>
    </AppLayout>
  )
}
