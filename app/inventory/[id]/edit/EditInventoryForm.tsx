'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

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

interface EditInventoryFormProps {
  item: any
}

export default function EditInventoryForm({ item }: EditInventoryFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
  })

  // Pre-fill form
  useEffect(() => {
    setValue('sku', item.sku)
    setValue('name', item.name)
    setValue('description', item.description || '')
    setValue('category', item.category)
    setValue('quantity', Number(item.quantity))
    setValue('unit', item.unit)
    setValue('low_stock_threshold', Number(item.low_stock_threshold))
    setValue('location', item.location || '')
    setValue('supplier', item.supplier || '')
    setValue('unit_cost', item.unit_cost ? Number(item.unit_cost) : 0)
    setValue('batch_number', item.batch_number || '')
    setValue('expiry_date', item.expiry_date?.split('T')[0] || '')
    setValue('notes', item.notes || '')
  }, [item, setValue])

  const onSubmit = async (data: InventoryFormData) => {
    const loadingToast = toast.loading('Updating item...')

    const { error } = await supabase
      .from('inventory_items')
      .update({
        ...data,
        quantity: Number(data.quantity),
        low_stock_threshold: Number(data.low_stock_threshold),
        unit_cost: data.unit_cost ? Number(data.unit_cost) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    toast.dismiss(loadingToast)

    if (error) {
      if (error.code === '23505') {
        toast.error('SKU already exists')
      } else {
        toast.error('Failed to update: ' + error.message)
      }
      return
    }

    toast.success('Item updated successfully!')
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

        {/* Name */}
        <div className="col-span-2">
          <label className="block text-slate-300 mb-2">Name *</label>
          <input
            {...register('name')}
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
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>}
        </div>

        {/* Unit */}
        <div>
          <label className="block text-slate-300 mb-2">Unit *</label>
          <input
            {...register('unit')}
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
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.low_stock_threshold && <p className="text-red-400 text-sm mt-1">{errors.low_stock_threshold.message}</p>}
        </div>

        {/* Location */}
        <div>
          <label className="block text-slate-300 mb-2">Location</label>
          <input
            {...register('location')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="block text-slate-300 mb-2">Supplier</label>
          <input
            {...register('supplier')}
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
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Batch Number */}
        <div>
          <label className="block text-slate-300 mb-2">Batch/Lot Number</label>
          <input
            {...register('batch_number')}
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
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label className="block text-slate-300 mb-2">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
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
          {isSubmitting ? 'Updating...' : 'Update Item'}
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
