import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/components/layout/AppLayout'
import { productCategoryLabels, productUnitLabels } from '@/types/products'
import { EmptyProducts } from '@/components/ui/EmptyState'

export default async function ProductsPage() {
  const user = await getUserProfile()
  if (!user || !user.company_id) redirect('/login')

  const supabase = await createClient()

  // Fetch products with aggregated location data
  const { data: products } = await supabase
    .from('products')
    .select(`
      *,
      locations:inventory_locations(
        id,
        location_code,
        available_quantity
      )
    `)
    .eq('company_id', user.company_id)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                📦 Towary
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Katalog produktów i materiałów
              </p>
            </div>
            <Link
              href="/products/add"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
            >
              + Dodaj Towar
            </Link>
          </div>

          {/* Product Grid */}
          {!products || products.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
              <EmptyProducts />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => {
                const totalQty = product.locations?.reduce(
                  (sum: number, loc: any) => sum + (loc.available_quantity || 0),
                  0
                ) || 0

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                          {product.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          SKU: {product.sku}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 text-xs font-semibold rounded">
                        {productCategoryLabels[product.category as keyof typeof productCategoryLabels]}
                      </span>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded">
                        {productUnitLabels[product.unit as keyof typeof productUnitLabels]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Stan ogółem</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {totalQty.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {productUnitLabels[product.unit as keyof typeof productUnitLabels]}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Lokalizacje</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {product.locations?.length || 0}
                        </p>
                      </div>
                    </div>

                    {product.description && (
                      <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
