'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

const orderSchema = z.object({
  order_number: z.string().min(1, 'Order number required'),
  customer_name: z.string().min(2, 'Customer name required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  part_name: z.string().optional(),
  material: z.string().optional(),
  deadline: z.string().min(1, 'Deadline required'),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  notes: z.string().optional(),
  // DAY 12: Cost tracking fields
  material_cost: z.number().min(0, 'Material cost must be positive'),
  labor_cost: z.number().min(0, 'Labor cost must be positive'),
  overhead_cost: z.number().min(0, 'Overhead cost must be positive'),
  total_cost: z.number().min(0, 'Total cost must be positive'),
})

type OrderFormData = z.infer<typeof orderSchema>

interface EditOrderFormProps {
  order: any
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
    },
  })

  // Watch cost fields and auto-calculate total
  const materialCost = watch('material_cost') || 0
  const laborCost = watch('labor_cost') || 0
  const overheadCost = watch('overhead_cost') || 0

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
    // DAY 12: Pre-fill cost fields
    setValue('material_cost', order.material_cost || 0)
    setValue('labor_cost', order.labor_cost || 0)
    setValue('overhead_cost', order.overhead_cost || 0)
    setValue('total_cost', order.total_cost || 0)
  }, [order, setValue])

  const onSubmit = async (data: OrderFormData) => {
    const loadingToast = toast.loading('Updating order...')

    const { error } = await supabase
      .from('orders')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Failed to update order: ' + error.message)
      return
    }

    toast.success('Order updated successfully!')
    router.push('/orders')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
      {/* 2-Column Grid - Same layout as add form */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* LEFT COLUMN */}

        {/* Order Number */}
        <div>
          <label htmlFor="edit_order_number" className="block text-slate-300 mb-2">Order Number *</label>
          <input
            id="edit_order_number"
            {...register('order_number')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            placeholder="ORD-001"
          />
          {errors.order_number && (
            <p className="text-red-400 text-sm mt-1">{errors.order_number.message}</p>
          )}
        </div>

        {/* Material */}
        <div>
          <label htmlFor="edit_material" className="block text-slate-300 mb-2">Material (Optional)</label>
          <input
            id="edit_material"
            {...register('material')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            placeholder="Stainless steel 304"
          />
        </div>

        {/* Customer Name */}
        <div>
          <label htmlFor="edit_customer_name" className="block text-slate-300 mb-2">Customer Name *</label>
          <input
            id="edit_customer_name"
            {...register('customer_name')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            placeholder="Metal-Precyzja Sp. z o.o."
          />
          {errors.customer_name && (
            <p className="text-red-400 text-sm mt-1">{errors.customer_name.message}</p>
          )}
        </div>

        {/* Deadline */}
        <div>
          <label htmlFor="edit_deadline" className="block text-slate-300 mb-2">Deadline *</label>
          <input
            id="edit_deadline"
            {...register('deadline')}
            type="date"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.deadline && (
            <p className="text-red-400 text-sm mt-1">{errors.deadline.message}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="edit_quantity" className="block text-slate-300 mb-2">Quantity *</label>
          <input
            id="edit_quantity"
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            placeholder="100"
          />
          {errors.quantity && (
            <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label htmlFor="edit_status" className="block text-slate-300 mb-2">Status *</label>
          <select
            id="edit_status"
            {...register('status')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Part Name */}
        <div>
          <label htmlFor="edit_part_name" className="block text-slate-300 mb-2">Part Name (Optional)</label>
          <input
            id="edit_part_name"
            {...register('part_name')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            placeholder="Flange 50mm"
          />
        </div>

        {/* Notes - Full Width */}
        <div className="col-span-2">
          <label htmlFor="edit_notes" className="block text-slate-300 mb-2">Notes (Optional)</label>
          <textarea
            id="edit_notes"
            {...register('notes')}
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            placeholder="Additional notes about this order..."
          />
        </div>
      </div>

      {/* DAY 12: COST BREAKDOWN SECTION */}
      <div className="bg-slate-700/50 p-6 rounded-lg mb-6 border border-slate-600">
        <h3 className="text-lg font-semibold text-white mb-4">💰 Kalkulacja Kosztów</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Material Cost */}
          <div>
            <label htmlFor="edit_material_cost" className="block text-slate-300 mb-2">Koszt Materiału (PLN)</label>
            <input
              id="edit_material_cost"
              {...register('material_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.material_cost && (
              <p className="text-red-400 text-sm mt-1">{errors.material_cost.message}</p>
            )}
          </div>

          {/* Labor Cost */}
          <div>
            <label htmlFor="edit_labor_cost" className="block text-slate-300 mb-2">Koszt Pracy (PLN)</label>
            <input
              id="edit_labor_cost"
              {...register('labor_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.labor_cost && (
              <p className="text-red-400 text-sm mt-1">{errors.labor_cost.message}</p>
            )}
          </div>

          {/* Overhead Cost */}
          <div>
            <label htmlFor="edit_overhead_cost" className="block text-slate-300 mb-2">Koszty Ogólne (PLN)</label>
            <input
              id="edit_overhead_cost"
              {...register('overhead_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min="0"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {errors.overhead_cost && (
              <p className="text-red-400 text-sm mt-1">{errors.overhead_cost.message}</p>
            )}
          </div>
        </div>

        {/* Total Cost Display */}
        <div className="pt-4 border-t border-slate-600">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-slate-200">Łączny Koszt:</span>
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
          {isSubmitting ? 'Updating Order...' : 'Update Order'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
