import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { productCategoryLabels, productUnitLabels } from '@/types/products'
import { getStockStatus, formatLocation } from '@/types/inventory'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  // Fetch product with locations
  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      locations:inventory_locations(
        id,
        location_code,
        quantity,
        reserved_quantity,
        available_quantity,
        low_stock_threshold,
        reorder_point,
        last_counted_at,
        notes
      )
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (!product) {
    redirect('/products')
  }

  const totalQuantity = product.locations?.reduce(
    (sum: number, loc: any) => sum + (loc.available_quantity || 0),
    0
  ) || 0

  const totalValue = totalQuantity * (product.default_unit_cost || 0)

  return (
<div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Pulpit', href: '/' },
            { label: 'Produkty', href: '/products' },
            { label: product.name },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              📦 {product.name}
            </h1>
            <p className="text-muted-foreground">
              SKU: {product.sku}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/products/${id}/edit`}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition font-semibold"
            >
              ✏️ Edytuj
            </Link>
            <Link
              href="/products"
              className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-accent transition"
            >
              Powrót
            </Link>
          </div>
        </div>

        {/* Product Details Card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-foreground mb-4">📋 Szczegóły Towaru</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Kategoria</p>
              <p className="text-foreground font-semibold">
                {productCategoryLabels[product.category as keyof typeof productCategoryLabels]}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Jednostka</p>
              <p className="text-foreground font-semibold">
                {productUnitLabels[product.unit as keyof typeof productUnitLabels]}
              </p>
            </div>
            {product.manufacturer && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">Producent</p>
                <p className="text-foreground font-semibold">{product.manufacturer}</p>
              </div>
            )}
            {product.default_unit_cost && (
              <div>
                <p className="text-muted-foreground text-sm mb-1">Cena jednostkowa</p>
                <p className="text-foreground font-semibold">
                  {product.default_unit_cost.toFixed(2)} PLN
                </p>
              </div>
            )}
          </div>

          {product.description && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-muted-foreground text-sm mb-1">Opis</p>
              <p className="text-foreground">{product.description}</p>
            </div>
          )}
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 border-2 border-violet-500/50 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4">📊 Podsumowanie</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-violet-300 mb-1">Lokalizacje</p>
              <p className="text-3xl font-bold text-white">{product.locations?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-violet-300 mb-1">Stan ogółem</p>
              <p className="text-3xl font-bold text-white">{totalQuantity.toFixed(2)}</p>
              <p className="text-sm text-violet-300">
                {productUnitLabels[product.unit as keyof typeof productUnitLabels]}
              </p>
            </div>
            {product.default_unit_cost && (
              <div className="text-center">
                <p className="text-sm text-violet-300 mb-1">Wartość ogółem</p>
                <p className="text-3xl font-bold text-green-400">{totalValue.toFixed(2)} PLN</p>
              </div>
            )}
          </div>
        </div>

        {/* Locations List */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">📍 Stany w Lokalizacjach</h2>

          {!product.locations || product.locations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Brak stanów w magazynie</p>
              <Link
                href={`/inventory/add?product_id=${product.id}`}
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                + Dodaj do Magazynu
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {product.locations.map((location: any) => {
                const status = getStockStatus(location)

                return (
                  <div
                    key={location.id}
                    className="bg-muted p-6 rounded-lg border border-border"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-foreground">
                          {formatLocation(location.location_code)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Kod: {location.location_code}
                        </p>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold text-white ${
                        status === 'out' ? 'bg-red-600' :
                        status === 'low' ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}>
                        {status === 'out' ? 'Brak' : status === 'low' ? 'Niski stan' : 'OK'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Stan całkowity</p>
                        <p className="text-2xl font-bold text-foreground">
                          {location.quantity.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Zarezerwowane</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {location.reserved_quantity.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Dostępne</p>
                        <p className={`text-2xl font-bold ${
                          status === 'out' ? 'text-red-600' :
                          status === 'low' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {location.available_quantity.toFixed(2)}
                        </p>
                      </div>
                      {location.low_stock_threshold && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Próg ostrzegawczy</p>
                          <p className="text-2xl font-bold text-foreground">
                            {location.low_stock_threshold.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    {location.notes && (
                      <div className="mt-4 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                        <p className="text-sm text-muted-foreground">{location.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
)
}
