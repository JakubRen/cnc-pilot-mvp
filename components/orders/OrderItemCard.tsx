'use client'

import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import InventorySelect from '@/components/inventory/InventorySelect'
import DrawingUpload from '@/components/orders/DrawingUpload'
import type { InventoryItem } from '@/hooks/useInventoryItems'
import { useTranslation } from '@/hooks/useTranslation'

export interface OrderItemEntry {
  tempId: string
  part_name: string
  material: string
  linked_inventory_item_id: string | null
  material_quantity_needed: number | null
  quantity: number
  length: number | null
  width: number | null
  height: number | null
  tolerance_length: number | null
  tolerance_width: number | null
  tolerance_height: number | null
  complexity: 'simple' | 'medium' | 'complex'
  drawing_file_id: string | null
  notes: string
}

interface OrderItemCardProps {
  item: OrderItemEntry
  index: number
  itemCount: number
  onUpdate: (index: number, updates: Partial<OrderItemEntry>) => void
  onRemove: (index: number) => void
  onCalculatePricing: (index: number) => void
  isCalculating: boolean
  isPricingTarget: boolean
  materialItems: InventoryItem[]
  materialsLoading: boolean
  partItems: InventoryItem[]
  partsLoading: boolean
  companyId: string
  userId: number
}

export default function OrderItemCard({
  item,
  index,
  itemCount,
  onUpdate,
  onRemove,
  onCalculatePricing,
  isCalculating,
  isPricingTarget,
  materialItems,
  materialsLoading,
  partItems,
  partsLoading,
  companyId,
  userId,
}: OrderItemCardProps) {
  const { t } = useTranslation()

  const complexityOptions = [
    { value: 'simple', label: t('orders', 'complexitySimple') },
    { value: 'medium', label: t('orders', 'complexityMedium') },
    { value: 'complex', label: t('orders', 'complexityComplex') },
  ]

  return (
    <Card className="mb-4 bg-card border-border">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            Pozycja {index + 1}
          </h3>
          {itemCount > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onRemove(index)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Usun
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Part Name */}
          <div className="sm:col-span-2">
            <InventorySelect
              items={partItems}
              loading={partsLoading}
              value={item.part_name}
              onChange={(value) => onUpdate(index, { part_name: value })}
              label={`${t('orders', 'partName')} (${t('orders', 'suggestedPrice')}!)`}
              placeholder={t('inventory', 'selectPart')}
              emptyMessage={t('inventory', 'noPartsInStock')}
              allowCustom={true}
            />
          </div>

          {/* Material */}
          <div>
            <InventorySelect
              items={materialItems}
              loading={materialsLoading}
              value={materialItems.find(mi => mi.id === item.linked_inventory_item_id)?.name || item.material}
              onChange={(value, selectedItem) => {
                onUpdate(index, {
                  material: value,
                  linked_inventory_item_id: selectedItem?.id || null,
                })
              }}
              label={t('common', 'material')}
              placeholder={t('inventory', 'selectMaterial')}
              emptyMessage={t('inventory', 'noMaterialsInStock')}
              allowCustom={true}
            />
          </div>

          {/* Material Quantity Needed */}
          <div>
            <label className="block text-foreground mb-2 text-sm">Ilosc materialu na jednostke</label>
            <Input
              type="number"
              step="0.01"
              placeholder="np. 0.5 (kg/szt)"
              value={item.material_quantity_needed ?? ''}
              onChange={(e) => onUpdate(index, { material_quantity_needed: e.target.value ? Number(e.target.value) : null })}
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-foreground mb-2 text-sm">{t('common', 'quantity')} *</label>
            <Input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => onUpdate(index, { quantity: Number(e.target.value) || 1 })}
              required
            />
          </div>

          {/* Complexity */}
          <div>
            <label className="block text-foreground mb-2 text-sm">{t('common', 'complexity')}</label>
            <Select
              options={complexityOptions}
              value={item.complexity}
              onChange={(value) => onUpdate(index, { complexity: value as 'simple' | 'medium' | 'complex' })}
            />
          </div>

          {/* Drawing */}
          <div className="sm:col-span-2">
            <DrawingUpload
              value={item.drawing_file_id}
              onChange={(fileId) => onUpdate(index, { drawing_file_id: fileId })}
              companyId={companyId}
              userId={userId}
            />
          </div>

          {/* Dimensions */}
          <div className="sm:col-span-2 bg-muted/50 p-4 rounded-lg border border-violet-200 dark:border-violet-500/30">
            <h4 className="text-sm font-semibold text-foreground mb-3">Wymiary detalu (L x W x H)</h4>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-muted-foreground text-xs mb-1">{t('common', 'length')} (mm)</label>
                <Input type="number" step="0.01" placeholder="np. 100"
                  value={item.length ?? ''}
                  onChange={(e) => onUpdate(index, { length: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">{t('common', 'width')} (mm)</label>
                <Input type="number" step="0.01" placeholder="np. 50"
                  value={item.width ?? ''}
                  onChange={(e) => onUpdate(index, { width: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">{t('common', 'height')} (mm)</label>
                <Input type="number" step="0.01" placeholder="np. 20"
                  value={item.height ?? ''}
                  onChange={(e) => onUpdate(index, { height: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                <Input type="number" step="0.001" placeholder="0.1"
                  value={item.tolerance_length ?? ''}
                  onChange={(e) => onUpdate(index, { tolerance_length: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                <Input type="number" step="0.001" placeholder="0.1"
                  value={item.tolerance_width ?? ''}
                  onChange={(e) => onUpdate(index, { tolerance_width: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                <Input type="number" step="0.001" placeholder="0.1"
                  value={item.tolerance_height ?? ''}
                  onChange={(e) => onUpdate(index, { tolerance_height: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
            </div>
          </div>

          {/* Per-item notes */}
          <div className="sm:col-span-2">
            <label className="block text-muted-foreground text-xs mb-1">Notatki do pozycji</label>
            <Input
              placeholder="Uwagi do tej pozycji..."
              value={item.notes}
              onChange={(e) => onUpdate(index, { notes: e.target.value })}
            />
          </div>

          {/* Pricing calculator button */}
          <div className="sm:col-span-2">
            <Button
              type="button"
              onClick={() => onCalculatePricing(index)}
              disabled={isCalculating}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 border-0"
            >
              {isCalculating && isPricingTarget ? 'Obliczam...' : 'Oblicz cene dla tej pozycji'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
