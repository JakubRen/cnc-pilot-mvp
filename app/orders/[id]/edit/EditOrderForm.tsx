'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect } from 'react'
import { useMaterials } from '@/hooks/useInventoryItems' // Import useMaterials
import InventorySelect from '@/components/inventory/InventorySelect' // Import InventorySelect
import { Input } from '@/components/ui/Input' // Import Input
import { Select } from '@/components/ui/Select'
import { useOperators } from '@/hooks/useOperators'
import { sanitizeText } from '@/lib/sanitization'

const orderSchema = z.object({
  order_number: z.string().min(1, 'Numer zamówienia wymagany'),
  customer_name: z.string().min(2, 'Nazwa klienta wymagana'),
  quantity: z.number().min(1, 'Ilość musi być minimum 1'),
  part_name: z.string().optional(),
  material: z.string().optional(),
  deadline: z.string().min(1, 'Termin wymagany'),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  notes: z.string().optional(),
  // DAY 12: Cost tracking fields
  material_cost: z.number().min(0, 'Koszt materiału musi być dodatni'),
  labor_cost: z.number().min(0, 'Koszt pracy musi być dodatni'),
  overhead_cost: z.number().min(0, 'Koszty ogólne muszą być dodatnie'),
  total_cost: z.number().min(0, 'Całkowity koszt musi być dodatni'),
  // Auto-Deduct fields
  linked_inventory_item_id: z.string().uuid().optional().nullable(),
  material_quantity_needed: z.number().min(0, 'Ilość materiału na jednostkę musi być większa lub równa 0').optional().nullable(),
  // Operator assignment
  assigned_operator_id: z.number().optional().nullable(),
})

type OrderFormData = z.infer<typeof orderSchema>

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

  // Pre-fill form with existing order data
  useEffect(() => {
    setValue('order_number', order.order_number)
    setValue('customer_name', order.customer_name)
    setValue('quantity', order.quantity)
    setValue('part_name', order.part_name || '')
    setValue('material', order.material || '')
    // Convert timestamp to date format (YYYY-MM-DD)
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
  }, [order, setValue])

  const onSubmit = async (data: OrderFormData) => {
    const loadingToast = toast.loading('Aktualizowanie zamówienia...')

    // Sanitize user inputs to prevent XSS attacks
    const finalOrderData = {
      ...data,
      customer_name: sanitizeText(data.customer_name),
      order_number: sanitizeText(data.order_number),
      part_name: data.part_name ? sanitizeText(data.part_name) : null,
      material: materialString ? sanitizeText(materialString) : null,
      notes: data.notes ? sanitizeText(data.notes) : null,
      linked_inventory_item_id: data.linked_inventory_item_id,
      material_quantity_needed: data.material_quantity_needed,
      assigned_operator_id: data.assigned_operator_id,
    };

    const { error } = await supabase
      .from('orders')
      .update({
        ...finalOrderData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Nie udało się zaktualizować zamówienia: ' + error.message)
      return
    }

    toast.success('Zamówienie zaktualizowane!')
    router.push('/orders')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* 2-Column Grid - Same layout as add form */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* LEFT COLUMN */}

        {/* Order Number */}
        <div>
          <label htmlFor="edit_order_number" className="block text-slate-700 dark:text-slate-300 mb-2">Numer zamówienia *</label>
          <input
            id="edit_order_number"
            {...register('order_number')}
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            placeholder="ORD-001"
          />
          {errors.order_number && (
            <p className="text-red-400 text-sm mt-1">{errors.order_number.message}</p>
          )}
        </div>

        {/* Material - from Inventory (raw_material category) */}
        <div>
          <InventorySelect
            items={materialItems}
            loading={materialsLoading}
            value={currentMaterialNameForDisplay}
            onChange={(value, item) => {
              setValue('material', value) // Keep material name as string
              setValue('linked_inventory_item_id', item?.id || null)
            }}
            label="Materiał"
            placeholder="Wybierz materiał"
            emptyMessage="Brak materiałów w magazynie"
            allowCustom={true}
            error={errors.linked_inventory_item_id?.message || errors.material?.message}
          />
        </div>

        {/* Material Quantity Needed per unit */}
        <div>
          <label htmlFor="material_quantity_needed" className="block text-slate-300 mb-2">Ilość materiału na jednostkę *</label>
          <Input
            id="material_quantity_needed"
            type="number"
            step="0.01"
            placeholder="np. 0.5 (kg/szt)"
            {...register('material_quantity_needed', { valueAsNumber: true })}
          />
          {errors.material_quantity_needed && <p className="text-red-400 text-sm mt-1">{errors.material_quantity_needed.message}</p>}
        </div>

        {/* Customer Name */}
        <div>
          <label htmlFor="edit_customer_name" className="block text-slate-700 dark:text-slate-300 mb-2">Nazwa klienta *</label>
          <input
            id="edit_customer_name"
            {...register('customer_name')}
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            placeholder="Metal-Precyzja Sp. z o.o."
          />
          {errors.customer_name && (
            <p className="text-red-400 text-sm mt-1">{errors.customer_name.message}</p>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="edit_deadline" className="block text-slate-700 dark:text-slate-300 mb-2">Termin *</label>
          <input
            id="edit_deadline"
            {...register('deadline')}
            type="date"
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.deadline && (
            <p className="text-red-400 text-sm mt-1">{errors.deadline.message}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="edit_quantity" className="block text-slate-700 dark:text-slate-300 mb-2">Ilość *</label>
          <input
            id="edit_quantity"
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            placeholder="100"
          />
          {errors.quantity && (
            <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label htmlFor="edit_status" className="block text-slate-700 dark:text-slate-300 mb-2">Status *</label>
          <select
            id="edit_status"
            {...register('status')}
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="pending">Oczekujące</option>
            <option value="in_progress">W realizacji</option>
            <option value="completed">Ukończone</option>
            <option value="delayed">Opóźnione</option>
            <option value="cancelled">Anulowane</option>
          </select>
        </div>

        {/* Assigned Operator */}
        <div>
          <label htmlFor="assigned_operator_id" className="block text-slate-700 dark:text-slate-300 mb-2">Przypisany operator</label>
          <Select
            options={[
              { value: '', label: operatorsLoading ? 'Ładowanie...' : 'Brak przypisania' },
              ...operators.map(op => ({ value: String(op.id), label: op.full_name }))
            ]}
            value={watch('assigned_operator_id') ? String(watch('assigned_operator_id')) : ''}
            onChange={(value) => setValue('assigned_operator_id', value ? Number(value) : null)}
          />
        </div>

        {/* Part Name */}
        <div>
          <label htmlFor="edit_part_name" className="block text-slate-700 dark:text-slate-300 mb-2">Nazwa części</label>
          <input
            id="edit_part_name"
            {...register('part_name')}
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            placeholder="Flange 50mm"
          />
        </div>

        {/* Notes - Full Width */}
        <div className="col-span-2">
          <label htmlFor="edit_notes" className="block text-slate-700 dark:text-slate-300 mb-2">Notatki</label>
          <textarea
            id="edit_notes"
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            placeholder="Dodatkowe uwagi dotyczące zamówienia..."
          />
        </div>
      </div>

      {/* DAY 12: COST BREAKDOWN SECTION */}
      <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg mb-6 border border-slate-200 dark:border-slate-600">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">💰 Kalkulacja Kosztów</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Material Cost */}
          <div>
            <label htmlFor="edit_material_cost" className="block text-slate-700 dark:text-slate-300 mb-2">Koszt Materiału (PLN)</label>
            <input
              id="edit_material_cost"
              {...register('material_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.material_cost && (
              <p className="text-red-400 text-sm mt-1">{errors.material_cost.message}</p>
            )}
          </div>

          {/* Labor Cost */}
          <div>
            <label htmlFor="edit_labor_cost" className="block text-slate-700 dark:text-slate-300 mb-2">Koszt Pracy (PLN)</label>
            <input
              id="edit_labor_cost"
              {...register('labor_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.labor_cost && (
              <p className="text-red-400 text-sm mt-1">{errors.labor_cost.message}</p>
            )}
          </div>

          {/* Overhead Cost */}
          <div>
            <label htmlFor="edit_overhead_cost" className="block text-slate-700 dark:text-slate-300 mb-2">Koszty Ogólne (PLN)</label>
            <input
              id="edit_overhead_cost"
              {...register('overhead_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.overhead_cost && (
              <p className="text-red-400 text-sm mt-1">{errors.overhead_cost.message}</p>
            )}
          </div>
        </div>

        {/* Total Cost Display */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">Łączny Koszt:</span>
            <span className="text-3xl font-bold text-green-400">
              {(materialCost + laborCost + overheadCost).toFixed(2)} PLN
            </span>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
        >
          {isSubmitting ? 'Aktualizowanie...' : 'Zapisz zmiany'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="px-8 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
        >
          Anuluj
        </button>
      </div>
    </form>
  )
}
