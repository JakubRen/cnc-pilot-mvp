'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import type { PricingEstimateResponse } from '@/types/pricing'

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
  length: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  complexity: z.enum(['simple', 'medium', 'complex']).optional(),
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

  // Watch cost fields and auto-calculate total
  const materialCost = watch('material_cost') || 0
  const laborCost = watch('labor_cost') || 0
  const overheadCost = watch('overhead_cost') || 0

  useEffect(() => {
    const total = materialCost + laborCost + overheadCost
    setValue('total_cost', total)
  }, [materialCost, laborCost, overheadCost, setValue])

  // Calculate pricing estimate
  const handleCalculatePricing = async () => {
    const material = watch('material')
    const quantity = watch('quantity')
    const complexity = watch('complexity')

    if (!material) {
      toast.error('Proszę wybrać materiał')
      return
    }
    if (!quantity || quantity < 1) {
      toast.error('Proszę podać ilość (min. 1)')
      return
    }
    if (!complexity) {
      toast.error('Proszę wybrać złożoność')
      return
    }

    setIsCalculating(true)
    const loadingToast = toast.loading('Obliczam wycenę...')

    try {
      const response = await fetch('/api/pricing/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partName: watch('part_name') || '',
          material,
          length: watch('length'),
          width: watch('width'),
          height: watch('height'),
          quantity,
          complexity,
          notes: watch('notes') || '',
        }),
      })

      toast.dismiss(loadingToast)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Błąd kalkulacji')
      }

      const data: PricingEstimateResponse = await response.json()
      setPricingEstimate(data)
      toast.success('Wycena gotowa!')
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Nie udało się obliczyć wyceny')
      console.error('Pricing calculation error:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  // Accept pricing estimate
  const handleAcceptEstimate = () => {
    if (!pricingEstimate) return

    setValue('material_cost', pricingEstimate.breakdown.materialCost)
    setValue('labor_cost', pricingEstimate.breakdown.machiningCost)
    setValue('overhead_cost', pricingEstimate.breakdown.setupCost)
    setValue('total_cost', pricingEstimate.suggestedPrice)

    toast.success('Wycena zaakceptowana i wypełniona!')
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
              <label className="block text-slate-300 mb-2">Materiał *</label>
              <select
                {...register('material')}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">Wybierz materiał...</option>
                <option value="aluminum">Aluminium (ogólnie)</option>
                <option value="aluminum_6061">Aluminium 6061</option>
                <option value="steel">Stal (ogólnie)</option>
                <option value="steel_c45">Stal C45</option>
                <option value="stainless">Stal nierdzewna (ogólnie)</option>
                <option value="stainless_304">Stal nierdzewna 304</option>
                <option value="brass">Mosiądz</option>
                <option value="bronze">Brąz</option>
                <option value="copper">Miedź</option>
                <option value="plastic">Plastik (ogólnie)</option>
                <option value="plastic_abs">Plastik ABS</option>
                <option value="plastic_pom">Plastik POM (Delrin)</option>
              </select>
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
              <label className="block text-slate-300 mb-2">Nazwa Części (Opcjonalnie)</label>
              <input
                {...register('part_name')}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Kołnierz 50mm"
              />
            </div>

            {/* Complexity */}
            <div>
              <label className="block text-slate-300 mb-2">Złożoność *</label>
              <select
                {...register('complexity')}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="simple">Proste (1-2h obróbki)</option>
                <option value="medium">Średnie (3-6h obróbki)</option>
                <option value="complex">Złożone (8-20h obróbki)</option>
              </select>
            </div>

            {/* Dimensions Section - Full Width */}
            <div className="col-span-2">
              <h4 className="text-slate-300 font-semibold mb-3">📐 Wymiary (mm) - Opcjonalnie</h4>
              <div className="grid grid-cols-3 gap-4">
                {/* Length */}
                <div>
                  <label className="block text-slate-400 mb-2 text-sm">Długość (mm)</label>
                  <input
                    {...register('length', { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="100"
                  />
                </div>

                {/* Width */}
                <div>
                  <label className="block text-slate-400 mb-2 text-sm">Szerokość (mm)</label>
                  <input
                    {...register('width', { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="50"
                  />
                </div>

                {/* Height */}
                <div>
                  <label className="block text-slate-400 mb-2 text-sm">Wysokość (mm)</label>
                  <input
                    {...register('height', { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    placeholder="25"
                  />
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-2">
                💡 Podaj wymiary dla dokładniejszej wyceny. Bez wymiarów kalkulacja będzie szacunkowa.
              </p>
            </div>

            {/* Notes - Full Width */}
            <div className="col-span-2">
              <label className="block text-slate-300 mb-2">Notatki (Opcjonalnie)</label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Dodatkowe informacje o zamówieniu..."
              />
            </div>
          </div>

          {/* DAY 14-15: PRICING CALCULATOR SECTION */}
          <div className="mb-6">
            <button
              type="button"
              onClick={handleCalculatePricing}
              disabled={isCalculating}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg"
            >
              {isCalculating ? (
                <>
                  <span className="animate-spin text-xl">⏳</span>
                  <span>Obliczam wycenę...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🧮</span>
                  <span>Oblicz Wycenę Automatycznie</span>
                </>
              )}
            </button>
          </div>

          {/* Pricing Estimate Result */}
          {pricingEstimate && (
            <div className="mb-6 p-6 bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-2 border-purple-500 rounded-lg shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🧮</span>
                  <span>Automatyczna Wycena</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setPricingEstimate(null)}
                  className="text-slate-400 hover:text-white transition"
                  title="Zamknij"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Price Display */}
                <div className="bg-slate-800/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">Sugerowana Cena (łącznie):</span>
                    <span className="text-3xl font-bold text-green-400">
                      {pricingEstimate.suggestedPrice.toFixed(2)} PLN
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Cena za sztukę:</span>
                    <span className="text-lg font-semibold text-green-300">
                      {pricingEstimate.pricePerUnit.toFixed(2)} PLN/szt
                    </span>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm">Pewność:</span>
                  <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pricingEstimate.confidence >= 80
                          ? 'bg-green-500'
                          : pricingEstimate.confidence >= 60
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${pricingEstimate.confidence}%` }}
                    />
                  </div>
                  <span className="text-white font-semibold text-sm w-12 text-right">
                    {pricingEstimate.confidence}%
                  </span>
                </div>

                {/* Reasoning */}
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-1">Uzasadnienie:</p>
                  <p className="text-sm text-slate-200">{pricingEstimate.reasoning}</p>
                </div>

                {/* Breakdown */}
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400 mb-2">Szczegóły kalkulacji:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Materiał:</span>
                      <span className="text-white font-medium">
                        {pricingEstimate.breakdown.materialCost.toFixed(2)} PLN
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Obróbka:</span>
                      <span className="text-white font-medium">
                        {pricingEstimate.breakdown.machiningCost.toFixed(2)} PLN
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Setup:</span>
                      <span className="text-white font-medium">
                        {pricingEstimate.breakdown.setupCost.toFixed(2)} PLN
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Marża:</span>
                      <span className="text-white font-medium">
                        {pricingEstimate.breakdown.marginPercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleAcceptEstimate}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition shadow-lg"
                  >
                    ✓ Akceptuj i Wypełnij
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingEstimate(null)}
                    className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                  >
                    ✕ Odrzuć
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DAY 12: COST BREAKDOWN SECTION */}
          <div className="bg-slate-700/50 p-6 rounded-lg mb-6 border border-slate-600">
            <h3 className="text-lg font-semibold text-white mb-4">💰 Kalkulacja Kosztów</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Material Cost */}
              <div>
                <label className="block text-slate-300 mb-2">Koszt Materiału (PLN)</label>
                <input
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
                <label className="block text-slate-300 mb-2">Koszt Pracy (PLN)</label>
                <input
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
                <label className="block text-slate-300 mb-2">Koszty Ogólne (PLN)</label>
                <input
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
