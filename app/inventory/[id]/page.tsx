import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export default async function InventoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  // Fetch item with creator info
  const { data: item, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      creator:users!created_by (
        full_name,
        email
      )
    `)
    .eq('id', id)
    .single()

  if (error || !item) {
    notFound()
  }

  // Fetch transaction history
  const { data: transactions } = await supabase
    .from('inventory_transactions')
    .select(`
      *,
      creator:users!created_by (
        full_name
      )
    `)
    .eq('item_id', id)
    .order('created_at', { ascending: false })

  // Format dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Stock status
  const isLowStock = Number(item.quantity) <= Number(item.low_stock_threshold)
  const isOutOfStock = Number(item.quantity) === 0
  const stockStatus = isOutOfStock ? 'OUT OF STOCK' : isLowStock ? 'LOW STOCK' : 'OK'
  const stockColor = isOutOfStock ? 'bg-gray-600' : isLowStock ? 'bg-red-600' : 'bg-green-600'

  // Calculate total value
  const totalValue = item.unit_cost ? (Number(item.quantity) * Number(item.unit_cost)).toFixed(2) : 'N/A'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{item.name}</h1>
            <p className="text-slate-400 font-mono">SKU: {item.sku}</p>
            <div className="flex gap-3 items-center mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white uppercase ${stockColor}`}>
                {stockStatus}
              </span>
              <span className="px-3 py-1 rounded text-xs font-semibold text-slate-300 bg-slate-700">
                {item.category.replace('_', ' ')}
              </span>
              {item.batch_number && (
                <span className="px-3 py-1 rounded text-xs font-mono text-slate-300 bg-slate-700">
                  Batch: {item.batch_number}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/inventory/${id}/edit`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Edit Item
            </Link>
            <Link
              href="/inventory"
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
            >
              Back to Inventory
            </Link>
          </div>
        </div>

        {/* Item Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Stock Information */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Stock Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Current Stock</p>
                <p className="text-white font-semibold text-2xl">{item.quantity} {item.unit}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Low Stock Threshold</p>
                <p className="text-white font-semibold">{item.low_stock_threshold} {item.unit}</p>
              </div>
              {item.unit_cost && (
                <>
                  <div>
                    <p className="text-slate-400 text-sm">Unit Cost</p>
                    <p className="text-white font-semibold">{Number(item.unit_cost).toFixed(2)} PLN</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Total Value</p>
                    <p className="text-white font-semibold">{totalValue} PLN</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Location & Supplier */}
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">Location & Supplier</h2>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Location</p>
                <p className="text-white font-semibold">{item.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Supplier</p>
                <p className="text-white font-semibold">{item.supplier || 'Not specified'}</p>
              </div>
              {item.expiry_date && (
                <div>
                  <p className="text-slate-400 text-sm">Expiry Date</p>
                  <p className="text-white font-semibold">{formatDate(item.expiry_date)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Traceability (Audit Info) */}
          {item.batch_number && (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 border-l-4 border-l-blue-500">
              <h2 className="text-xl font-semibold text-white mb-4">🔍 Traceability (Audit)</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm">Batch/Lot Number</p>
                  <p className="text-white font-semibold font-mono">{item.batch_number}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Created By</p>
                  <p className="text-white font-semibold">{item.creator?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Created At</p>
                  <p className="text-white">{formatDate(item.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Creator Information */}
          {!item.batch_number && (
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Created By</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm">Name</p>
                  <p className="text-white font-semibold">{item.creator?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Email</p>
                  <p className="text-white">{item.creator?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Created At</p>
                  <p className="text-white">{formatDate(item.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Description & Notes */}
          {(item.description || item.notes) && (
            <div className="col-span-2 bg-slate-800 p-6 rounded-lg border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">Additional Information</h2>
              {item.description && (
                <div className="mb-3">
                  <p className="text-slate-400 text-sm mb-1">Description</p>
                  <p className="text-slate-300">{item.description}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <p className="text-slate-400 text-sm mb-1">Notes</p>
                  <p className="text-slate-300">{item.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">📋 Transaction History (Audit Trail)</h2>

          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((txn) => {
                const isPositive = txn.transaction_type === 'in' || txn.transaction_type === 'initial'
                const txnColor = isPositive ? 'text-green-400' : txn.transaction_type === 'out' ? 'text-red-400' : 'text-yellow-400'
                const txnIcon = isPositive ? '+' : txn.transaction_type === 'out' ? '-' : '~'

                return (
                  <div key={txn.id} className="flex items-start gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
                    <div className={`text-2xl font-bold ${txnColor} min-w-[40px]`}>
                      {txnIcon}{Math.abs(Number(txn.quantity))}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="text-white font-semibold capitalize">
                            {txn.transaction_type.replace('_', ' ')}
                          </span>
                          {txn.reason && (
                            <span className="text-slate-400 text-sm ml-2">- {txn.reason}</span>
                          )}
                        </div>
                        <span className="text-slate-500 text-sm">{formatDate(txn.created_at)}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-slate-400">
                          Stock after: <span className="text-white font-semibold">{txn.quantity_after} {item.unit}</span>
                        </span>
                        {txn.batch_number && (
                          <span className="text-slate-400">
                            Batch: <span className="font-mono text-white">{txn.batch_number}</span>
                          </span>
                        )}
                        {txn.creator && (
                          <span className="text-slate-400">
                            By: <span className="text-white">{txn.creator.full_name}</span>
                          </span>
                        )}
                      </div>
                      {txn.notes && (
                        <p className="text-slate-400 text-sm mt-1">{txn.notes}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
