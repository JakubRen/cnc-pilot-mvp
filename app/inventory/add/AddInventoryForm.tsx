'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const inventorySchema = z.object({
  sku: z.string().min(1, 'SKU required'),
  name: z.string().min(2, 'Name required'),
  description: z.string().optional(),
  category: z.enum(['raw_material', 'part', 'tool', 'consumable', 'finished_good']),
  quantity: z.number().min(0, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit required'),
  low_stock_threshold: z.number().min(0, 'Threshold must be positive'),
  location: z.string().optional(),
  supplier: z.string().optional(),
  unit_cost: z.number().min(0).optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
})

type InventoryFormData = z.infer<typeof inventorySchema>

export default function AddInventoryForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      unit: 'pcs',
      low_stock_threshold: 10,
      quantity: 0,
      category: 'raw_material',
    }
  })

  const onSubmit = async (data: InventoryFormData) => {
    const loadingToast = toast.loading('Creating inventory item...')

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.dismiss(loadingToast)
      toast.error('Not authenticated')
      return
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      toast.dismiss(loadingToast)
      toast.error('User company not found')
      return
    }

    // Create inventory item
    const { data: newItem, error: itemError } = await supabase
      .from('inventory_items')
      .insert({
        ...data,
        quantity: Number(data.quantity),
        low_stock_threshold: Number(data.low_stock_threshold),
        unit_cost: data.unit_cost ? Number(data.unit_cost) : null,
        company_id: userData.company_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (itemError) {
      toast.dismiss(loadingToast)
      if (itemError.code === '23505') {
        toast.error('SKU already exists for this company')
      } else {
        toast.error('Failed to create item: ' + itemError.message)
      }
      return
    }

    // Create initial transaction
    if (newItem && Number(data.quantity) > 0) {
      await supabase
        .from('inventory_transactions')
        .insert({
          item_id: newItem.id,
          transaction_type: 'initial',
          quantity: Number(data.quantity),
          quantity_after: Number(data.quantity),
          reason: 'Initial stock',
          batch_number: data.batch_number,
          company_id: userData.company_id,
          created_by: user.id,
        })
    }

    toast.dismiss(loadingToast)
    toast.success('Inventory item created successfully!')
    router.push('/inventory')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* SKU */}
        <div>
          <label className="block text-slate-300 mb-2">SKU *</label>
          <input
            {...register('sku')}
            placeholder="e.g., ALU-6061-100"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none font-mono"
          />
          {errors.sku && <p className="text-red-400 text-sm mt-1">{errors.sku.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label className="block text-slate-300 mb-2">Category *</label>
          <select
            {...register('category')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="raw_material">Raw Material</option>
            <option value="part">Part</option>
            <option value="tool">Tool</option>
            <option value="consumable">Consumable</option>
            <option value="finished_good">Finished Good</option>
          </select>
        </div>

        {/* Name - Full Width */}
        <div className="col-span-2">
          <label className="block text-slate-300 mb-2">Name *</label>
          <input
            {...register('name')}
            placeholder="e.g., Aluminum 6061 Bar 100mm"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-slate-300 mb-2">Quantity *</label>
          <input
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>}
        </div>

        {/* Unit */}
        <div>
          <label className="block text-slate-300 mb-2">Unit *</label>
          <input
            {...register('unit')}
            placeholder="e.g., pcs, kg, m, L"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.unit && <p className="text-red-400 text-sm mt-1">{errors.unit.message}</p>}
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label className="block text-slate-300 mb-2">Low Stock Threshold *</label>
          <input
            {...register('low_stock_threshold', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="10"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.low_stock_threshold && <p className="text-red-400 text-sm mt-1">{errors.low_stock_threshold.message}</p>}
        </div>

        {/* Location */}
        <div>
          <label className="block text-slate-300 mb-2">Location</label>
          <input
            {...register('location')}
            placeholder="e.g., A1, Shelf-3"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-slate-300 mb-2">Supplier</label>
          <input
            {...register('supplier')}
            placeholder="Supplier name"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Unit Cost */}
        <div>
          <label className="block text-slate-300 mb-2">Unit Cost (PLN)</label>
          <input
            {...register('unit_cost', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0.00"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Batch Number */}
        <div>
          <label className="block text-slate-300 mb-2">Batch/Lot Number</label>
          <input
            {...register('batch_number')}
            placeholder="For traceability"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>

        {/* Expiry Date */}
        <div>
          <label className="block text-slate-300 mb-2">Expiry Date</label>
          <input
            {...register('expiry_date')}
            type="date"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label className="block text-slate-300 mb-2">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Additional details..."
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-slate-300 mb-2">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Internal notes..."
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
        >
          {isSubmitting ? 'Creating Item...' : 'Create Item'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/inventory')}
          className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
