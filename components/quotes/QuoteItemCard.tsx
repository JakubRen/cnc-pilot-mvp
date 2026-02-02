'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import InventoryAutocomplete from '@/components/inventory/InventoryAutocomplete'
import type { UnifiedPricingResult } from '@/types/quotes'

export interface QuoteItem {
  id: string
  part_name: string
  material: string
  quantity: number
  complexity: 'simple' | 'medium' | 'complex'
  unit_price: number | null
  total_price: number | null
  pricing_result: UnifiedPricingResult | null
  isCalculating: boolean
  productLinked: boolean
  materialLinked: boolean
}

interface Props {
  item: QuoteItem
  index: number
  canRemove: boolean
  onRemove: (id: string) => void
  onPartNameChange: (id: string, value: string, linked: boolean) => void
  onMaterialChange: (id: string, value: string, linked: boolean) => void
  onFieldChange: (id: string, field: keyof QuoteItem, value: any) => void
  onCalculate: (id: string) => void
  getValidationError: (item: QuoteItem, field: 'product' | 'material') => string | undefined
}

const complexityOptions = [
  { value: 'simple', label: 'Prosta (1-2h)' },
  { value: 'medium', label: 'Średnia (3-6h)' },
  { value: 'complex', label: 'Złożona (8-20h)' },
]

export default function QuoteItemCard({
  item, index, canRemove, onRemove,
  onPartNameChange, onMaterialChange, onFieldChange,
  onCalculate, getValidationError,
}: Props) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-900 dark:text-white font-semibold">
          Pozycja {index + 1}
        </span>
        <div className="flex items-center gap-2">
          {item.total_price !== null && (
            <span className="text-green-600 dark:text-green-400 font-bold">
              {item.total_price.toFixed(2)} PLN
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="text-red-400 hover:text-red-300 text-sm font-medium"
            >
              Usuń
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Part Name */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
            Nazwa części *
          </label>
          <InventoryAutocomplete
            value={item.part_name}
            onChange={(value, inventoryItem) => {
              onPartNameChange(item.id, value, !!inventoryItem)
            }}
            categoryFilter="finished_good"
            placeholder="Wybierz z magazynu..."
            allowCustom={true}
            error={getValidationError(item, 'product')}
          />
        </div>

        {/* Material */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
            Materiał *
          </label>
          <InventoryAutocomplete
            value={item.material}
            onChange={(value, inventoryItem) => {
              onMaterialChange(item.id, value, !!inventoryItem)
            }}
            categoryFilter="raw_material"
            placeholder="Wybierz materiał..."
            allowCustom={true}
            error={getValidationError(item, 'material')}
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
            Ilość *
          </label>
          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onFieldChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Complexity */}
        <div>
          <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
            Złożoność
          </label>
          <select
            value={item.complexity}
            onChange={(e) => onFieldChange(item.id, 'complexity', e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            {complexityOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={() => onCalculate(item.id)}
          disabled={item.isCalculating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {item.isCalculating ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Obliczam...
            </>
          ) : item.total_price !== null ? (
            '🔄 Przelicz cenę'
          ) : (
            '🧮 Oblicz cenę'
          )}
        </Button>
      </div>

      {/* Pricing Result */}
      {item.pricing_result && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Metoda:</span> {item.pricing_result.recommended.method === 'rule_based' ? 'Kalkulator' : item.pricing_result.recommended.method === 'historical' ? 'Historia' : 'Hybrid'}
              <span className="mx-2">|</span>
              <span className="font-medium">Pewność:</span> {item.pricing_result.recommended.confidence}%
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {item.unit_price?.toFixed(2)} PLN/szt
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
