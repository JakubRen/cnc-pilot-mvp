import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'

export default async function InventoryPage() {
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  // Fetch inventory items
  const { data: items, error } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching inventory:', error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar user={user} />

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
              <p className="text-slate-400 mt-1">Magazyn + Śledzenie Partii</p>
            </div>
            <Link
              href="/inventory/add"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              + Add New Item
            </Link>
          </div>

          {/* Inventory Table */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">SKU</th>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">Name</th>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">Category</th>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">Stock</th>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">Location</th>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">Batch #</th>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-slate-300 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item) => {
                  const isLowStock = Number(item.quantity) <= Number(item.low_stock_threshold)
                  const isOutOfStock = Number(item.quantity) === 0
                  const stockStatus = isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'OK'
                  const stockColor = isOutOfStock ? 'bg-gray-600' : isLowStock ? 'bg-red-600' : 'bg-green-600'

                  return (
                    <tr key={item.id} className="border-t border-slate-700 hover:bg-slate-750">
                      <td className="px-6 py-4 text-white font-mono text-sm">{item.sku}</td>
                      <td className="px-6 py-4 text-white">{item.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold text-slate-300 bg-slate-700">
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white font-semibold">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{item.location || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                        {item.batch_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${stockColor}`}>
                          {stockStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/inventory/${item.id}`}
                            className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 text-sm transition"
                          >
                            View
                          </Link>
                          <Link
                            href={`/inventory/${item.id}/edit`}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {(!items || items.length === 0) && (
              <div className="p-12 text-center">
                <p className="text-slate-400 text-lg mb-4">No inventory items yet</p>
                <Link
                  href="/inventory/add"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Add your first item
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
