import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { canAccessModule } from '@/lib/permissions-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import InventoryTable from '@/components/inventory/InventoryTable'
import { productUnitLabels } from '@/types/products'
import { isLowStock, getStockStatus } from '@/types/inventory'
import { logger } from '@/lib/logger'

export default async function InventoryPage() {
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user) {
    redirect('/login')
  }

  // Permission check - inventory access
  const hasAccess = await canAccessModule('inventory')
  if (!hasAccess) {
    redirect('/no-access')
  }

  // Fetch inventory locations with product info (NOWA STRUKTURA)
  const { data: locations, error } = await supabase
    .from('inventory_locations')
    .select(`
      *,
      product:products(
        id,
        sku,
        name,
        category,
        unit,
        default_unit_cost,
        company_id
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    logger.error('Error fetching inventory locations', { error })
  }

  // Filter by company (through product)
  const filteredLocations = locations?.filter((loc: any) =>
    loc.product?.company_id === user.company_id
  ) || []

  // Fetch OLD inventory table (stany z dokumentów PW/RW/WZ)
  const { data: legacyInventory, error: legacyError } = await supabase
    .from('inventory')
    .select('*')
    .eq('company_id', user.company_id)
    .order('updated_at', { ascending: false })

  if (legacyError) {
    logger.error('Error fetching legacy inventory', { error: legacyError })
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                📊 Magazyn - Stany
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Ilości towarów w lokalizacjach
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/products"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                📦 Katalog Towarów
              </Link>
            </div>
          </div>

          {/* Legacy Inventory (stany z dokumentów PW/RW/WZ) */}
          {legacyInventory && legacyInventory.length > 0 && (
            <InventoryTable items={legacyInventory} />
          )}

          {/* Inventory Locations Table (nowa struktura) */}
          {filteredLocations.length === 0 && (!legacyInventory || legacyInventory.length === 0) ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Brak stanów w magazynie
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Dodaj towary przez dokumenty PW lub katalog produktów
              </p>
              <Link
                href="/documents/add"
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                + Nowy Dokument PW
              </Link>
            </div>
          ) : filteredLocations.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Towar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Lokalizacja
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Dostępne
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Zarezerwowane
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredLocations.map((location: any) => {
                    const status = getStockStatus(location)
                    const lowStock = isLowStock(location)

                    return (
                      <tr key={location.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 text-sm font-mono text-slate-900 dark:text-white">
                          {location.product.sku}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/products/${location.product.id}`}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {location.product.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {location.location_code}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-lg font-bold ${
                            status === 'out' ? 'text-red-600' :
                            status === 'low' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {location.available_quantity.toFixed(2)}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            {productUnitLabels[location.product.unit as keyof typeof productUnitLabels]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-400">
                          {location.reserved_quantity.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {status === 'out' ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                              Brak
                            </span>
                          ) : lowStock ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                              Niski
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/products/${location.product.id}`}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Szczegóły →
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
