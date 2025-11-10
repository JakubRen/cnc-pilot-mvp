'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const orderSchema = z.object({
  order_number: z.string().min(1, 'Order number required'),
  customer_name: z.string().min(2, 'Customer name required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  part_name: z.string().optional(),
  material: z.string().optional(),
  deadline: z.string().min(1, 'Deadline required'),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  notes: z.string().optional(),
})

type OrderFormData = z.infer<typeof orderSchema>

export default function AddOrderPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'pending',
    },
  })

  const onSubmit = async (data: OrderFormData) => {
    const loadingToast = toast.loading('Creating order...')

    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.dismiss(loadingToast)
      toast.error('Not authenticated')
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) {
      toast.dismiss(loadingToast)
      toast.error('User not assigned to a company')
      return
    }

    const { error } = await supabase
      .from('orders')
      .insert({
        ...data,
        created_by: userProfile.id,
        company_id: userProfile.company_id,
      })

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Failed to create order: ' + error.message)
      return
    }

    toast.success('Order created successfully!')
    router.push('/orders')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Add New Order</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
          {/* 2-Column Grid */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* LEFT COLUMN */}

            {/* Order Number */}
            <div>
              <label className="block text-slate-300 mb-2">Order Number *</label>
              <input
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
              <label className="block text-slate-300 mb-2">Material (Optional)</label>
              <input
                {...register('material')}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Stainless steel 304"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-slate-300 mb-2">Customer Name *</label>
              <input
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
              <label className="block text-slate-300 mb-2">Deadline *</label>
              <input
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
              <label className="block text-slate-300 mb-2">Quantity *</label>
              <input
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
              <label className="block text-slate-300 mb-2">Status *</label>
              <select
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
              <label className="block text-slate-300 mb-2">Part Name (Optional)</label>
              <input
                {...register('part_name')}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Flange 50mm"
              />
            </div>

            {/* Notes - Full Width */}
            <div className="col-span-2">
              <label className="block text-slate-300 mb-2">Notes (Optional)</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Additional notes about this order..."
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold transition"
            >
              {isSubmitting ? 'Creating Order...' : 'Create Order'}
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
      </div>
    </div>
  )
}
