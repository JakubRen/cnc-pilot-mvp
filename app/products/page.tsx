import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { EmptyProducts } from '@/components/ui/EmptyState'
import ProductsTable from '@/components/products/ProductsTable'

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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              📦 Towary
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Katalog produktów i materiałów
            </p>
          </div>

          {/* Product Table */}
          {!products || products.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
              <EmptyProducts />
            </div>
          ) : (
            <ProductsTable products={products} />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
