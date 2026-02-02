'use client'

import Link from 'next/link'
import { formatProductCategory, formatProductUnit, isLowStockAnyLocation } from '@/types/products'
import type { ProductWithLocations } from '@/types/products'

interface ProductCardProps {
  product: ProductWithLocations
}

export function ProductCard({ product }: ProductCardProps) {
  const isLowStock = isLowStockAnyLocation(product)
  const totalQuantity = product.total_quantity || 0
  const locationCount = product.locations?.length || 0

  const categoryColors = {
    raw_material: 'bg-violet-100 text-violet-800',
    finished_good: 'bg-green-100 text-green-800',
    semi_finished: 'bg-yellow-100 text-yellow-800',
    tool: 'bg-purple-100 text-purple-800',
    consumable: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className={`bg-card rounded-lg p-4 border border-border hover-lift cursor-pointer ${isLowStock ? 'border-l-4 border-l-orange-500' : ''}`}>
      {/* Header with name, SKU, and category badge */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0 mr-2">
          <Link
            href={`/products/${product.id}`}
            className="font-bold text-foreground hover:text-violet-600 dark:hover:text-violet-400 text-lg block truncate"
          >
            {product.name}
          </Link>
          <p className="text-muted-foreground text-sm">SKU: {product.sku}</p>
        </div>
        <span className={`px-3 py-1 ${categoryColors[product.category]} text-xs font-semibold rounded-full whitespace-nowrap`}>
          {formatProductCategory(product.category)}
        </span>
      </div>

      {/* Details in key-value pairs */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ilość całkowita:</span>
          <span className={`font-medium ${isLowStock ? 'text-orange-600 font-bold' : 'text-foreground'}`}>
            {totalQuantity} {formatProductUnit(product.unit)}
            {isLowStock && ' ⚠️'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Lokalizacje:</span>
          <span className="text-foreground font-medium">{locationCount} miejsc</span>
        </div>
        {product.default_unit_cost && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Koszt jedn.:</span>
            <span className="text-foreground font-medium">
              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
                .format(product.default_unit_cost)}
            </span>
          </div>
        )}
        {product.total_value > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wartość:</span>
            <span className="text-foreground font-bold">
              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })
                .format(product.total_value)}
            </span>
          </div>
        )}
        {!product.is_active && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className="text-red-600 font-medium">Nieaktywny</span>
          </div>
        )}
      </div>

      {/* Touch-friendly action buttons (min 48px height) */}
      <div className="mt-4 flex gap-2">
        <Link
          href={`/products/${product.id}`}
          className="flex-1 px-3 py-3 bg-muted text-foreground text-center rounded-lg hover:bg-accent text-sm font-medium transition min-h-[48px] flex items-center justify-center"
        >
          Szczegóły
        </Link>
        <Link
          href={`/products/${product.id}/edit`}
          className="flex-1 px-3 py-3 bg-violet-600 text-white text-center rounded-lg hover:bg-violet-700 text-sm font-medium transition min-h-[48px] flex items-center justify-center"
        >
          Edytuj
        </Link>
      </div>
    </div>
  )
}
