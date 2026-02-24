import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { getInventoryHistory } from '@/lib/dashboard-queries'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import InventoryHistory from '@/components/inventory/InventoryHistory'
import TagSelect from '@/components/tags/TagSelect'
import { PermissionGuard, PriceDisplay } from '@/components/permissions'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default async function InventoryDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  // Fetch item with creator info (filtered by company)
  const { data: item, error } = await supabase
    .from('inventory')
    .select(`
      *,
      creator:users!created_by (
        full_name,
        email
      )
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
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

  // Fetch inventory history (from warehouse documents)
  const inventoryHistory = await getInventoryHistory(id)

  // Fetch tags for this inventory item
  const { data: itemTags } = await supabase
    .from('entity_tags')
    .select(`
      tag_id,
      tags (
        id,
        name,
        color
      )
    `)
    .eq('entity_type', 'inventory_item')
    .eq('entity_id', id)

  // Transform tags data to flat array
  type TagRecord = { id: string; name: string; color: string }
  const tags = (itemTags || [])
    .map((et) => et.tags as unknown as TagRecord | null)
    .filter((tag): tag is TagRecord => tag !== null)

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
  const stockStatus = isOutOfStock ? 'BRAK' : isLowStock ? 'NISKI STAN' : 'OK'
  const stockColor = isOutOfStock ? 'bg-gray-600' : isLowStock ? 'bg-red-600' : 'bg-green-600'

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'Magazyn', href: '/inventory' },
            { label: item.name },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{item.name}</h1>
            <p className="text-muted-foreground font-mono">SKU: {item.sku}</p>
            <div className="flex gap-3 items-center mt-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white uppercase ${stockColor}`}>
                {stockStatus}
              </span>
              <span className="px-3 py-1 rounded text-xs font-semibold text-foreground bg-muted">
                {item.category.replace('_', ' ')}
              </span>
              {item.batch_number && (
                <span className="px-3 py-1 rounded text-xs font-mono text-foreground bg-muted">
                  Partia: {item.batch_number}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/inventory/${id}/edit`}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
            >
              Edytuj
            </Link>
            <Link
              href="/inventory"
              className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition"
            >
              Wróć do magazynu
            </Link>
          </div>
        </div>

        {/* Item Details Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Stock Information */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Informacje o stanie</h2>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Aktualny stan</p>
                <p className="text-foreground font-semibold text-2xl">{item.quantity} {item.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Próg niskiego stanu</p>
                <p className="text-foreground font-semibold">{item.low_stock_threshold} {item.unit}</p>
              </div>
              {/* Koszty - TYLKO DLA UPRAWNIONYCH */}
              <PermissionGuard prices="inventory">
                {item.unit_cost && (
                  <>
                    <div>
                      <p className="text-muted-foreground text-sm">Koszt jednostkowy</p>
                      <p className="text-foreground font-semibold">
                        <PriceDisplay value={Number(item.unit_cost)} module="inventory" />
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Wartość całkowita</p>
                      <p className="text-foreground font-semibold">
                        <PriceDisplay value={Number(item.quantity) * Number(item.unit_cost)} module="inventory" />
                      </p>
                    </div>
                  </>
                )}
              </PermissionGuard>
            </div>
          </div>

          {/* Location & Supplier */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Lokalizacja i dostawca</h2>
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-sm">Lokalizacja</p>
                <p className="text-foreground font-semibold">{item.location || 'Nie określono'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Dostawca</p>
                <p className="text-foreground font-semibold">{item.supplier || 'Nie określono'}</p>
              </div>
              {item.expiry_date && (
                <div>
                  <p className="text-muted-foreground text-sm">Data ważności</p>
                  <p className="text-foreground font-semibold">{formatDate(item.expiry_date)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Tagi</h2>
            <TagSelect
              entityType="inventory_item"
              entityId={item.id}
              selectedTags={tags}
            />
          </div>

          {/* Traceability (Audit Info) */}
          {item.batch_number && (
            <div className="bg-card p-6 rounded-lg border border-border border-l-4 border-l-violet-500">
              <h2 className="text-xl font-semibold text-foreground mb-4">🔍 Śledzenie (Audyt)</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground text-sm">Numer partii/serii</p>
                  <p className="text-foreground font-semibold font-mono">{item.batch_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Utworzył</p>
                  <p className="text-foreground font-semibold">{item.creator?.full_name || 'Nieznany'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Data utworzenia</p>
                  <p className="text-foreground">{formatDate(item.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Creator Information */}
          {!item.batch_number && (
            <div className="bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Utworzone przez</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground text-sm">Imię i nazwisko</p>
                  <p className="text-foreground font-semibold">{item.creator?.full_name || 'Nieznany'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Email</p>
                  <p className="text-foreground">{item.creator?.email || 'Brak'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Data utworzenia</p>
                  <p className="text-foreground">{formatDate(item.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Description & Notes */}
          {(item.description || item.notes) && (
            <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Dodatkowe informacje</h2>
              {item.description && (
                <div className="mb-3">
                  <p className="text-muted-foreground text-sm mb-1">Opis</p>
                  <p className="text-foreground">{item.description}</p>
                </div>
              )}
              {item.notes && (
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Notatki</p>
                  <p className="text-foreground">{item.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Transaction History */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">📋 Historia transakcji (Ścieżka audytu)</h2>

          {transactions && transactions.length > 0 ? (
            <div className="space-y-3">
              {transactions.map((txn) => {
                const isPositive = txn.transaction_type === 'in' || txn.transaction_type === 'initial'
                const txnColor = isPositive ? 'text-green-400' : txn.transaction_type === 'out' ? 'text-red-400' : 'text-yellow-400'
                const txnIcon = isPositive ? '+' : txn.transaction_type === 'out' ? '-' : '~'

                // Translate transaction types
                const txnTypeLabels: Record<string, string> = {
                  'in': 'Przyjęcie',
                  'out': 'Wydanie',
                  'initial': 'Stan początkowy',
                  'adjustment': 'Korekta'
                }

                return (
                  <div key={txn.id} className="flex items-start gap-4 p-4 bg-muted rounded-lg border border-border">
                    <div className={`text-2xl font-bold ${txnColor} min-w-[40px]`}>
                      {txnIcon}{Math.abs(Number(txn.quantity))}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="text-foreground font-semibold">
                            {txnTypeLabels[txn.transaction_type] || txn.transaction_type}
                          </span>
                          {txn.reason && (
                            <span className="text-muted-foreground text-sm ml-2">- {txn.reason}</span>
                          )}
                        </div>
                        <span className="text-slate-500 text-sm">{formatDate(txn.created_at)}</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Stan po: <span className="text-foreground font-semibold">{txn.quantity_after} {item.unit}</span>
                        </span>
                        {txn.batch_number && (
                          <span className="text-muted-foreground">
                            Partia: <span className="font-mono text-foreground">{txn.batch_number}</span>
                          </span>
                        )}
                        {txn.creator && (
                          <span className="text-muted-foreground">
                            Przez: <span className="text-foreground">{txn.creator.full_name}</span>
                          </span>
                        )}
                      </div>
                      {txn.notes && (
                        <p className="text-muted-foreground text-sm mt-1">{txn.notes}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Brak transakcji</p>
          )}
        </div>

        {/* Inventory History (Warehouse Documents) */}
        <InventoryHistory history={inventoryHistory} unit={item.unit} />
      </div>
    </div>
  )
}
