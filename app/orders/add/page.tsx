'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import type { PricingEstimateResponse } from '@/types/pricing'
import { useSmartPricing } from '@/hooks/useSmartPricing'
import SmartEstimateCard from '@/components/orders/SmartEstimateCard'
import SimilarOrdersWidget from '@/components/orders/SimilarOrdersWidget'

const orderSchema = z.object({
  order_number: z.string().min(1, 'Order number required'),
  customer_name: z.string().min(2, 'Customer name required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  part_name: z.string().optional(),
  material: z.string().optional(),
  deadline: z.string().min(1, 'Deadline required'),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  notes: z.string().optional(),
  // DAY 14-15: Pricing calculator fields
  length: z.union([z.number(), z.nan()]).optional().nullable(),
  width: z.union([z.number(), z.nan()]).optional().nullable(),
  height: z.union([z.number(), z.nan()]).optional().nullable(),
  complexity: z.enum(['simple', 'medium', 'complex']).optional().nullable(),
  // DAY 12: Cost tracking fields
  material_cost: z.number().min(0, 'Material cost must be positive'),
  labor_cost: z.number().min(0, 'Labor cost must be positive'),
  overhead_cost: z.number().min(0, 'Overhead cost must be positive'),
  total_cost: z.number().min(0, 'Total cost must be positive'),
})

type OrderFormData = z.infer<typeof orderSchema>

export default function AddOrderPage() {
  const router = useRouter()
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimateResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      status: 'pending',
      complexity: 'medium',
      material_cost: 0,
      labor_cost: 0,
      overhead_cost: 0,
      total_cost: 0,
    },
  })

  // Watch fields for Local Intelligence
  const partName = watch('part_name') || ''
  const material = watch('material') || ''
  const quantity = watch('quantity') || 1
  
  // Watch cost fields for auto-calculation
  const materialCost = watch('material_cost') || 0
  const laborCost = watch('labor_cost') || 0
  const overheadCost = watch('overhead_cost') || 0

  // Use Local Intelligence Hook
  const { estimate: localEstimate, similarOrders, loading: localLoading } = useSmartPricing(partName, material)

  useEffect(() => {
    const total = materialCost + laborCost + overheadCost
    setValue('total_cost', total)
  }, [materialCost, laborCost, overheadCost, setValue])

  // Apply Local Estimate Price
  const handleApplyLocalPrice = (price: number) => {
    // Calculate price per unit based on estimate
    const totalSuggested = price * quantity
    setValue('total_cost', totalSuggested)
    
    // Distribute costs (simplified heuristic)
    setValue('material_cost', totalSuggested * 0.4)
    setValue('labor_cost', totalSuggested * 0.4)
    setValue('overhead_cost', totalSuggested * 0.2)
    
    toast.success(`Zastosowano cenę: ${price} PLN/szt`)
  }

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

    // Exclude pricing calculator fields (not in database)
    const { length, width, height, complexity, ...orderData } = data

    const { error } = await supabase
      .from('orders')
      .insert({
        ...orderData,
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Add New Order</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* LEFT COLUMN - FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {/* Order Number */}
              <div>
                <label htmlFor="order_number" className="block text-slate-300 mb-2">Order Number *</label>
                <input
                  id="order_number"
                  autoFocus
                  {...register('order_number')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="ORD-001"
                />
                {errors.order_number && <p className="text-red-400 text-sm mt-1">{errors.order_number.message}</p>}
              </div>

              {/* Material */}
              <div>
                <label htmlFor="material" className="block text-slate-300 mb-2">Materiał *</label>
                <select
                  id="material"
                  {...register('material')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Wybierz materiał...</option>
                  <option value="aluminum">Aluminium (ogólnie)</option>
                  <option value="steel">Stal (ogólnie)</option>
                  <option value="stainless">Stal nierdzewna</option>
                  <option value="brass">Mosiądz</option>
                  <option value="plastic">Tworzywo</option>
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label htmlFor="customer_name" className="block text-slate-300 mb-2">Customer Name *</label>
                <input
                  id="customer_name"
                  {...register('customer_name')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Firma XYZ"
                />
              </div>

              {/* Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-slate-300 mb-2">Deadline *</label>
                <input
                  id="deadline"
                  {...register('deadline')}
                  type="date"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-slate-300 mb-2">Quantity *</label>
                <input
                  id="quantity"
                  {...register('quantity', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-slate-300 mb-2">Status *</label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Part Name - Connected to Intelligence */}
              <div className="col-span-2">
                <label htmlFor="part_name" className="block text-slate-300 mb-2">
                  Nazwa Części (Podpowiada cenę!)
                </label>
                <input
                  id="part_name"
                  {...register('part_name')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-blue-500/50 text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none transition"
                  placeholder="np. Wałek napędowy, Kołnierz..."
                  autoComplete="off"
                />
                <p className="text-xs text-blue-400 mt-1">
                  💡 Wpisz nazwę, aby zobaczyć historię podobnych zleceń.
                </p>
              </div>
            </div>

            {/* Cost Section */}
            <div className="bg-slate-700/50 p-6 rounded-lg mb-6 border border-slate-600">
              <h3 className="text-lg font-semibold text-white mb-4">💰 Kalkulacja Kosztów</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Materiał (PLN)</label>
                  <input
                    {...register('material_cost', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Praca (PLN)</label>
                  <input
                    {...register('labor_cost', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Setup/Inne (PLN)</label>
                  <input
                    {...register('overhead_cost', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center border-t border-slate-600 pt-4">
                <span className="text-slate-300 font-medium">Łączny Koszt:</span>
                <span className="text-2xl font-bold text-green-400">
                  {(materialCost + laborCost + overheadCost).toFixed(2)} PLN
                </span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition"
              >
                {isSubmitting ? 'Zapisywanie...' : 'Utwórz Zamówienie'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
              >
                Anuluj
              </button>
            </div>
          </form>

          {/* RIGHT COLUMN - LOCAL INTELLIGENCE SIDEBAR */}
          <div className="space-y-6">
            {/* Smart Estimate Card */}
            <div className="sticky top-6">
              <SmartEstimateCard
                estimate={localEstimate}
                loading={localLoading}
                onApplyPrice={handleApplyLocalPrice}
              />
              
              <SimilarOrdersWidget
                orders={similarOrders}
                loading={localLoading}
              />

              {/* Help Tip */}
              {!localEstimate && !localLoading && (
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg text-sm text-blue-300">
                  <p className="font-semibold mb-1">💡 Jak to działa?</p>
                  <p>
                    System analizuje Twoją historię zleceń. Wpisz nazwę części lub wybierz materiał, 
                    aby zobaczyć średnie ceny i czasy realizacji z przeszłości.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}