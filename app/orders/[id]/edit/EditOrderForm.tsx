'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useMaterials } from '@/hooks/useInventoryItems'
import InventorySelect from '@/components/inventory/InventorySelect'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useOperators } from '@/hooks/useOperators'
import { sanitizeText } from '@/lib/sanitization'
import { logger } from '@/lib/logger'

// --- Order-level schema (header) ---
const orderSchema = z.object({
  order_number: z.string().min(1, 'Numer zamowienia wymagany'),
  customer_name: z.string().min(2, 'Nazwa klienta wymagana'),
  deadline: z.string().min(1, 'Termin wymagany'),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  notes: z.string().optional(),
  material_cost: z.number().min(0, 'Koszt materialu musi byc dodatni'),
  labor_cost: z.number().min(0, 'Koszt pracy musi byc dodatni'),
  overhead_cost: z.number().min(0, 'Koszty ogolne musza byc dodatnie'),
  total_cost: z.number().min(0, 'Calkowity koszt musi byc dodatni'),
  assigned_operator_id: z.number().optional().nullable(),
  // Flat fields for backwards compat (old orders without items)
  quantity: z.number().min(1, 'Ilosc musi byc minimum 1'),
  part_name: z.string().optional(),
  material: z.string().optional(),
  linked_inventory_item_id: z.string().uuid().optional().nullable(),
  material_quantity_needed: z.number().min(0).optional().nullable(),
  length: z.union([z.number(), z.nan()]).optional().nullable(),
  width: z.union([z.number(), z.nan()]).optional().nullable(),
  height: z.union([z.number(), z.nan()]).optional().nullable(),
  tolerance_length: z.union([z.number(), z.nan()]).optional().nullable(),
  tolerance_width: z.union([z.number(), z.nan()]).optional().nullable(),
  tolerance_height: z.union([z.number(), z.nan()]).optional().nullable(),
})

type OrderFormData = z.infer<typeof orderSchema>

// --- Multi-item types ---
interface OrderItemEntry {
  id: string | null // null = new item
  tempId: string
  part_name: string
  material: string
  quantity: number
  length: number | null
  width: number | null
  height: number | null
  tolerance_length: number | null
  tolerance_width: number | null
  tolerance_height: number | null
  complexity: string
  drawing_file_id: string | null
  notes: string
}

const generateTempId = () => Math.random().toString(36).substr(2, 9)

const createEmptyItem = (): OrderItemEntry => ({
  id: null,
  tempId: generateTempId(),
  part_name: '',
  material: '',
  quantity: 1,
  length: null,
  width: null,
  height: null,
  tolerance_length: null,
  tolerance_width: null,
  tolerance_height: null,
  complexity: 'medium',
  drawing_file_id: null,
  notes: '',
})

interface OrderData {
  id: string
  order_number: string
  customer_name: string
  quantity: number
  part_name: string | null
  material: string | null
  deadline: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  notes: string | null
  length: number | null
  width: number | null
  height: number | null
  tolerance_length: number | null
  tolerance_width: number | null
  tolerance_height: number | null
  material_cost: number | null
  labor_cost: number | null
  overhead_cost: number | null
  total_cost: number | null
  linked_inventory_item_id: string | null
  material_quantity_needed: number | null
  assigned_operator_id: number | null
}

interface EditOrderFormProps {
  order: OrderData
}

export default function EditOrderForm({ order }: EditOrderFormProps) {
  const router = useRouter()

  const [orderItems, setOrderItems] = useState<OrderItemEntry[]>([])
  const [hasItems, setHasItems] = useState(false)
  const [itemsLoaded, setItemsLoaded] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      material_cost: 0,
      labor_cost: 0,
      overhead_cost: 0,
      total_cost: 0,
      linked_inventory_item_id: null,
      material_quantity_needed: null,
      assigned_operator_id: null,
    },
  })

  const materialCost = watch('material_cost') || 0
  const laborCost = watch('labor_cost') || 0
  const overheadCost = watch('overhead_cost') || 0
  const materialString = watch('material') || ''
  const linkedInventoryItemId = watch('linked_inventory_item_id')

  const { items: materialItems, loading: materialsLoading } = useMaterials()
  const { operators, loading: operatorsLoading } = useOperators()

  const currentMaterialItem = materialItems.find(item => item.id === linkedInventoryItemId)
  const currentMaterialNameForDisplay = currentMaterialItem?.name || ''

  // Auto-calculate total cost
  useEffect(() => {
    const total = materialCost + laborCost + overheadCost
    setValue('total_cost', total)
  }, [materialCost, laborCost, overheadCost, setValue])

  // Pre-fill form
  useEffect(() => {
    setValue('order_number', order.order_number)
    setValue('customer_name', order.customer_name)
    setValue('quantity', order.quantity)
    setValue('part_name', order.part_name || '')
    setValue('material', order.material || '')
    setValue('deadline', order.deadline?.split('T')[0] || '')
    setValue('status', order.status)
    setValue('notes', order.notes || '')
    setValue('material_cost', order.material_cost || 0)
    setValue('labor_cost', order.labor_cost || 0)
    setValue('overhead_cost', order.overhead_cost || 0)
    setValue('total_cost', order.total_cost || 0)
    setValue('linked_inventory_item_id', order.linked_inventory_item_id || null)
    setValue('material_quantity_needed', order.material_quantity_needed || null)
    setValue('assigned_operator_id', order.assigned_operator_id || null)
    setValue('length', order.length ?? null)
    setValue('width', order.width ?? null)
    setValue('height', order.height ?? null)
    setValue('tolerance_length', order.tolerance_length ?? null)
    setValue('tolerance_width', order.tolerance_width ?? null)
    setValue('tolerance_height', order.tolerance_height ?? null)
  }, [order, setValue])

  // Fetch order_items
  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) {
        setHasItems(true)
        setOrderItems(data.map((item: any) => ({
          id: item.id,
          tempId: generateTempId(),
          part_name: item.part_name || '',
          material: item.material || '',
          quantity: item.quantity || 1,
          length: item.length,
          width: item.width,
          height: item.height,
          tolerance_length: item.tolerance_length,
          tolerance_width: item.tolerance_width,
          tolerance_height: item.tolerance_height,
          complexity: item.complexity || 'medium',
          drawing_file_id: item.drawing_file_id,
          notes: item.notes || '',
        })))
      }
      setItemsLoaded(true)
    }
    fetchItems()
  }, [order.id])

  // Item manipulation
  const updateOrderItem = (index: number, updates: Partial<OrderItemEntry>) => {
    setOrderItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, createEmptyItem()])
    if (!hasItems) setHasItems(true)
  }

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: OrderFormData) => {
    const loadingToast = toast.loading('Aktualizowanie zamowienia...')

    const cleanNum = (v: number | null | undefined) => (v != null && !isNaN(v)) ? v : null

    // If multi-item, update summary fields
    let summaryPartName = data.part_name
    let summaryMaterial = data.material
    let summaryQuantity = data.quantity

    if (hasItems && orderItems.length > 0) {
      summaryPartName = orderItems.length === 1
        ? (orderItems[0].part_name || data.part_name || '')
        : `${orderItems.length} pozycji`
      summaryMaterial = orderItems.length === 1
        ? (orderItems[0].material || data.material || '')
        : 'Rozne'
      summaryQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
    }

    const finalOrderData = {
      order_number: sanitizeText(data.order_number),
      customer_name: sanitizeText(data.customer_name),
      part_name: summaryPartName ? sanitizeText(summaryPartName) : null,
      material: summaryMaterial ? sanitizeText(summaryMaterial) : null,
      quantity: summaryQuantity,
      deadline: data.deadline,
      status: data.status,
      notes: data.notes ? sanitizeText(data.notes) : null,
      material_cost: data.material_cost,
      labor_cost: data.labor_cost,
      overhead_cost: data.overhead_cost,
      total_cost: data.total_cost,
      linked_inventory_item_id: data.linked_inventory_item_id,
      material_quantity_needed: data.material_quantity_needed,
      assigned_operator_id: data.assigned_operator_id,
      length: cleanNum(data.length),
      width: cleanNum(data.width),
      height: cleanNum(data.height),
      tolerance_length: cleanNum(data.tolerance_length),
      tolerance_width: cleanNum(data.tolerance_width),
      tolerance_height: cleanNum(data.tolerance_height),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('orders')
      .update(finalOrderData)
      .eq('id', order.id)

    if (error) {
      toast.dismiss(loadingToast)
      toast.error('Nie udalo sie zaktualizowac zamowienia: ' + error.message)
      return
    }

    // Update order_items if multi-item mode
    if (hasItems && orderItems.length > 0) {
      // Delete existing items and re-insert (simplest approach)
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', order.id)

      if (deleteError) {
        logger.error('Failed to delete old order_items', { error: deleteError })
      }

      const newItems = orderItems.map(item => ({
        order_id: order.id,
        part_name: item.part_name ? sanitizeText(item.part_name) : 'Bez nazwy',
        material: item.material ? sanitizeText(item.material) : null,
        quantity: item.quantity || 1,
        length: cleanNum(item.length),
        width: cleanNum(item.width),
        height: cleanNum(item.height),
        tolerance_length: cleanNum(item.tolerance_length) ?? 0.1,
        tolerance_width: cleanNum(item.tolerance_width) ?? 0.1,
        tolerance_height: cleanNum(item.tolerance_height) ?? 0.1,
        complexity: item.complexity || null,
        drawing_file_id: item.drawing_file_id || null,
        notes: item.notes ? sanitizeText(item.notes) : null,
      }))

      const { error: insertError } = await supabase
        .from('order_items')
        .insert(newItems)

      if (insertError) {
        logger.error('Failed to insert order_items', { error: insertError })
        toast.error('Pozycje nie zostaly zapisane: ' + insertError.message)
      }
    } else if (hasItems && orderItems.length === 0) {
      // All items removed — clean up
      await supabase.from('order_items').delete().eq('order_id', order.id)
    }

    toast.dismiss(loadingToast)
    toast.success('Zamowienie zaktualizowane!')
    router.push('/orders')
    router.refresh()
  }

  const complexityOptions = [
    { value: 'simple', label: 'Prosty' },
    { value: 'medium', label: 'Sredni' },
    { value: 'complex', label: 'Zlozony' },
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card p-8 rounded-lg border border-border">
      {/* 2-Column Grid - Order header */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Order Number */}
        <div>
          <label htmlFor="edit_order_number" className="block text-foreground mb-2">Numer zamowienia *</label>
          <input
            id="edit_order_number"
            {...register('order_number')}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
            placeholder="ORD-001"
          />
          {errors.order_number && <p className="text-red-400 text-sm mt-1">{errors.order_number.message}</p>}
        </div>

        {/* Customer Name */}
        <div>
          <label htmlFor="edit_customer_name" className="block text-foreground mb-2">Nazwa klienta *</label>
          <input
            id="edit_customer_name"
            {...register('customer_name')}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
            placeholder="Metal-Precyzja Sp. z o.o."
          />
          {errors.customer_name && <p className="text-red-400 text-sm mt-1">{errors.customer_name.message}</p>}
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="edit_deadline" className="block text-foreground mb-2">Termin *</label>
          <input
            id="edit_deadline"
            {...register('deadline')}
            type="date"
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
          />
          {errors.deadline && <p className="text-red-400 text-sm mt-1">{errors.deadline.message}</p>}
        </div>

        {/* Status */}
        <div>
          <label htmlFor="edit_status" className="block text-foreground mb-2">Status *</label>
          <select
            id="edit_status"
            {...register('status')}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
          >
            <option value="pending">Oczekujace</option>
            <option value="in_progress">W realizacji</option>
            <option value="completed">Ukonczone</option>
            <option value="delayed">Opoznione</option>
            <option value="cancelled">Anulowane</option>
          </select>
        </div>

        {/* Assigned Operator */}
        <div>
          <label htmlFor="assigned_operator_id" className="block text-foreground mb-2">Przypisany operator</label>
          <Select
            options={[
              { value: '', label: operatorsLoading ? 'Ladowanie...' : 'Brak przypisania' },
              ...operators.map(op => ({ value: String(op.id), label: op.full_name }))
            ]}
            value={watch('assigned_operator_id') ? String(watch('assigned_operator_id')) : ''}
            onChange={(value) => setValue('assigned_operator_id', value ? Number(value) : null)}
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label htmlFor="edit_notes" className="block text-foreground mb-2">Notatki</label>
          <textarea
            id="edit_notes"
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
            placeholder="Dodatkowe uwagi dotyczace zamowienia..."
          />
        </div>
      </div>

      {/* === MULTI-ITEM SECTION === */}
      {itemsLoaded && hasItems && orderItems.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">Pozycje zamowienia</h3>
          {orderItems.map((item, index) => (
            <div key={item.tempId} className="mb-4 p-4 bg-muted border border-border rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-foreground">Pozycja {index + 1}</h4>
                {orderItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeOrderItem(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Usun
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Part Name */}
                <div className="col-span-2">
                  <label className="block text-muted-foreground text-xs mb-1">Nazwa czesci</label>
                  <Input
                    value={item.part_name}
                    onChange={(e) => updateOrderItem(index, { part_name: e.target.value })}
                    placeholder="Flange 50mm"
                  />
                </div>
                {/* Material */}
                <div>
                  <label className="block text-muted-foreground text-xs mb-1">Material</label>
                  <Input
                    value={item.material}
                    onChange={(e) => updateOrderItem(index, { material: e.target.value })}
                    placeholder="Stal 316L"
                  />
                </div>
                {/* Quantity */}
                <div>
                  <label className="block text-muted-foreground text-xs mb-1">Ilosc *</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateOrderItem(index, { quantity: Number(e.target.value) || 1 })}
                  />
                </div>
                {/* Complexity */}
                <div>
                  <label className="block text-muted-foreground text-xs mb-1">Zlozonosc</label>
                  <Select
                    options={complexityOptions}
                    value={item.complexity}
                    onChange={(value) => updateOrderItem(index, { complexity: String(value) })}
                  />
                </div>
                {/* Dimensions + Tolerances */}
                <div className="col-span-2 bg-muted/50 p-3 rounded-lg border border-violet-200 dark:border-violet-500/30">
                  <h5 className="text-xs font-semibold text-foreground mb-2">Wymiary detalu (L x W x H)</h5>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Dlugosc (mm)</label>
                      <Input type="number" step="0.01" value={item.length ?? ''}
                        onChange={(e) => updateOrderItem(index, { length: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Szerokosc (mm)</label>
                      <Input type="number" step="0.01" value={item.width ?? ''}
                        onChange={(e) => updateOrderItem(index, { width: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Wysokosc (mm)</label>
                      <Input type="number" step="0.01" value={item.height ?? ''}
                        onChange={(e) => updateOrderItem(index, { height: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                      <Input type="number" step="0.001" placeholder="0.1" value={item.tolerance_length ?? ''}
                        onChange={(e) => updateOrderItem(index, { tolerance_length: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                      <Input type="number" step="0.001" placeholder="0.1" value={item.tolerance_width ?? ''}
                        onChange={(e) => updateOrderItem(index, { tolerance_width: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                    <div>
                      <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                      <Input type="number" step="0.001" placeholder="0.1" value={item.tolerance_height ?? ''}
                        onChange={(e) => updateOrderItem(index, { tolerance_height: e.target.value ? Number(e.target.value) : null })} />
                    </div>
                  </div>
                </div>
                {/* Notes */}
                <div className="col-span-2">
                  <label className="block text-muted-foreground text-xs mb-1">Notatki</label>
                  <Input
                    value={item.notes}
                    onChange={(e) => updateOrderItem(index, { notes: e.target.value })}
                    placeholder="Uwagi..."
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addOrderItem}
            className="w-full py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-violet-500 hover:text-violet-500 transition font-medium"
          >
            + Dodaj kolejna pozycje
          </button>
        </div>
      ) : itemsLoaded && !hasItems ? (
        /* Flat mode for old orders without items */
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Material */}
          <div>
            <InventorySelect
              items={materialItems}
              loading={materialsLoading}
              value={currentMaterialNameForDisplay}
              onChange={(value, item) => {
                setValue('material', value)
                setValue('linked_inventory_item_id', item?.id || null)
              }}
              label="Material"
              placeholder="Wybierz material"
              emptyMessage="Brak materialow w magazynie"
              allowCustom={true}
              error={errors.linked_inventory_item_id?.message || errors.material?.message}
            />
          </div>

          {/* Material Quantity Needed */}
          <div>
            <label htmlFor="material_quantity_needed" className="block text-slate-300 mb-2">Ilosc materialu na jednostke *</label>
            <Input
              id="material_quantity_needed"
              type="number"
              step="0.01"
              placeholder="np. 0.5 (kg/szt)"
              {...register('material_quantity_needed', { valueAsNumber: true })}
            />
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="edit_quantity" className="block text-foreground mb-2">Ilosc *</label>
            <input
              id="edit_quantity"
              {...register('quantity', { valueAsNumber: true })}
              type="number"
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              placeholder="100"
            />
            {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>}
          </div>

          {/* Part Name */}
          <div>
            <label htmlFor="edit_part_name" className="block text-foreground mb-2">Nazwa czesci</label>
            <input
              id="edit_part_name"
              {...register('part_name')}
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              placeholder="Flange 50mm"
            />
          </div>

          {/* Dimensions */}
          <div className="col-span-2 bg-muted border border-violet-200 dark:border-violet-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Wymiary detalu (L x W x H)</h4>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Dlugosc (mm)</label>
                <Input type="number" step="0.01" placeholder="np. 100" {...register('length', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Szerokosc (mm)</label>
                <Input type="number" step="0.01" placeholder="np. 50" {...register('width', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Wysokosc (mm)</label>
                <Input type="number" step="0.01" placeholder="np. 20" {...register('height', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                <Input type="number" step="0.001" placeholder="0.1" {...register('tolerance_length', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                <Input type="number" step="0.001" placeholder="0.1" {...register('tolerance_width', { valueAsNumber: true })} />
              </div>
              <div>
                <label className="block text-muted-foreground text-xs mb-1">Tolerancja +/- (mm)</label>
                <Input type="number" step="0.001" placeholder="0.1" {...register('tolerance_height', { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          {/* Button to convert to multi-item */}
          <div className="col-span-2">
            <button
              type="button"
              onClick={addOrderItem}
              className="w-full py-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-violet-500 hover:text-violet-500 transition text-sm"
            >
              + Przejdz na tryb wielu pozycji
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 text-center text-muted-foreground py-4">Ladowanie pozycji...</div>
      )}

      {/* COST BREAKDOWN SECTION */}
      <div className="bg-muted/50 p-6 rounded-lg mb-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Kalkulacja Kosztow</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="edit_material_cost" className="block text-foreground mb-2">Koszt Materialu (PLN)</label>
            <input
              id="edit_material_cost"
              {...register('material_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.material_cost && <p className="text-red-400 text-sm mt-1">{errors.material_cost.message}</p>}
          </div>
          <div>
            <label htmlFor="edit_labor_cost" className="block text-foreground mb-2">Koszt Pracy (PLN)</label>
            <input
              id="edit_labor_cost"
              {...register('labor_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.labor_cost && <p className="text-red-400 text-sm mt-1">{errors.labor_cost.message}</p>}
          </div>
          <div>
            <label htmlFor="edit_overhead_cost" className="block text-foreground mb-2">Koszty Ogolne (PLN)</label>
            <input
              id="edit_overhead_cost"
              {...register('overhead_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.overhead_cost && <p className="text-red-400 text-sm mt-1">{errors.overhead_cost.message}</p>}
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-foreground">Laczny Koszt:</span>
            <span className="text-3xl font-bold text-green-400">
              {(materialCost + laborCost + overheadCost).toFixed(2)} PLN
            </span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 font-semibold transition"
        >
          {isSubmitting ? 'Aktualizowanie...' : 'Zapisz zmiany'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="px-8 py-3 bg-muted text-foreground rounded-lg hover:bg-accent transition"
        >
          Anuluj
        </button>
      </div>
    </form>
  )
}
