import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import EmptyState from '@/components/ui/EmptyState'

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
          <Link
            href="/inventory/add"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold shadow-lg"
          >
            + Add New Item
          </Link>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Batch #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {items.map((item) => {
                    const isLowStock = Number(item.quantity) <= Number(item.low_stock_threshold)
                    const isOutOfStock = Number(item.quantity) === 0
                    const stockStatus = isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'OK'
                    const stockColor = isOutOfStock ? 'bg-gray-600' : isLowStock ? 'bg-red-600' : 'bg-green-600'

                    return (
                      <tr key={item.id} className="hover:bg-slate-700/50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white font-mono">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded text-xs font-semibold text-slate-300 bg-slate-700">
                            {item.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-semibold">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{item.location || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                          {item.batch_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${stockColor}`}>
                            {stockStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/inventory/${item.id}`}
                            className="text-slate-300 hover:text-white mr-4 font-medium"
                          >
                            View
                          </Link>
                          <Link
                            href={`/inventory/${item.id}/edit`}
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            Edit
                          </Link>
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
