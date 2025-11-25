import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import EmptyState from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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
            <Button href="/inventory/add" variant="primary">
              + Dodaj przedmiot
            </Button>
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
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-x-auto">
              <table className="w-full min-w-max">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Nazwa</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Kategoria</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Ilość</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Lokalizacja</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Partia</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-300 uppercase tracking-wider">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {items.map((item) => {
                    const isLowStock = Number(item.quantity) <= Number(item.low_stock_threshold)
                    const isOutOfStock = Number(item.quantity) === 0
                    
                    let statusVariant: 'success' | 'warning' | 'danger' | 'secondary' = 'success';
                    let statusText = 'OK';

                    if (isOutOfStock) {
                      statusVariant = 'secondary';
                      statusText = 'BRAK';
                    } else if (isLowStock) {
                      statusVariant = 'warning';
                      statusText = 'NISKI STAN';
                    }

                    return (
                      <tr key={item.id} className="hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white font-mono">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {item.category.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.location || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                          {item.batch_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={statusVariant}>
                            {statusText}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                          <Button href={`/inventory/${item.id}`} variant="ghost" size="sm">
                            Podgląd
                          </Button>
                          <Button href={`/inventory/${item.id}/edit`} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                            Edytuj
                          </Button>
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
