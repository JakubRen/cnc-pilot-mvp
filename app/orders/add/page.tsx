'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect, useState, useRef } from 'react'
import type { PricingEstimateResponse } from '@/types/pricing'
import { useSmartPricing } from '@/hooks/useSmartPricing'
import SmartEstimateCard from '@/components/orders/SmartEstimateCard'
import SimilarOrdersWidget from '@/components/orders/SimilarOrdersWidget'
import { logAiCorrection } from '@/lib/ai/feedback-logger'
import { useMaterials, useParts } from '@/hooks/useInventoryItems'
import InventorySelect from '@/components/inventory/InventorySelect'

const orderSchema = z.object({
  order_number: z.string().min(1, 'Numer zamówienia wymagany'),
  customer_name: z.string().min(2, 'Nazwa klienta wymagana'),
  quantity: z.number().min(1, 'Ilość musi być minimum 1'),
  part_name: z.string().optional(),
  material: z.string().optional(),
  deadline: z.string().min(1, 'Termin wymagany'),
  status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
  notes: z.string().optional(),
  // DAY 14-15: Pricing calculator fields
  length: z.union([z.number(), z.nan()]).optional().nullable(),
  width: z.union([z.number(), z.nan()]).optional().nullable(),
  height: z.union([z.number(), z.nan()]).optional().nullable(),
  complexity: z.enum(['simple', 'medium', 'complex']).optional().nullable(),
  // DAY 12: Cost tracking fields
  material_cost: z.number().min(0, 'Koszt materiału musi być dodatni'),
  labor_cost: z.number().min(0, 'Koszt pracy musi być dodatni'),
  overhead_cost: z.number().min(0, 'Koszty ogólne muszą być dodatnie'),
  total_cost: z.number().min(0, 'Całkowity koszt musi być dodatni'),
})

type OrderFormData = z.infer<typeof orderSchema>

export default function AddOrderPage() {
  const router = useRouter()
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimateResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // AI Feedback Loop: Track what AI suggested vs what user enters
  const aiSuggestedPrice = useRef<number | null>(null)

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

  // Inventory hooks for Material and Part Name dropdowns
  const { items: materialItems, loading: materialsLoading } = useMaterials()
  const { items: partItems, loading: partsLoading } = useParts()

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

    // AI Feedback Loop: Store what AI suggested for later comparison
    aiSuggestedPrice.current = totalSuggested

    toast.success(`Zastosowano cenę: ${price} PLN/szt`)
  }

  // AI Feedback Loop: Log correction when user changes cost after AI suggestion
  const handleCostBlur = () => {
    if (aiSuggestedPrice.current !== null) {
      const currentTotal = materialCost + laborCost + overheadCost

      // Only log if user actually changed the value
      if (currentTotal !== aiSuggestedPrice.current) {
        logAiCorrection({
          feature: 'price_calculation',
          aiValue: aiSuggestedPrice.current,
          userValue: currentTotal,
          context: {
            material: material,
            part_name: partName,
            quantity: quantity,
          },
        })
      }
    }
  }

  // DAY 14-15: AI Pricing Calculator
  const handleGetPricingEstimate = async () => {
    const currentMaterial = watch('material')
    const currentQuantity = watch('quantity')
    const currentComplexity = watch('complexity')

    if (!currentMaterial || !currentQuantity) {
      toast.error('Wypełnij materiał i ilość przed kalkulacją')
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
          material: currentMaterial,
          length: watch('length') || undefined,
          width: watch('width') || undefined,
          height: watch('height') || undefined,
          quantity: currentQuantity,
          complexity: currentComplexity || 'medium',
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
      console.error('Pricing estimate error:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  // Apply AI Pricing Estimate
  const handleApplyPricingEstimate = () => {
    if (!pricingEstimate) return

    const breakdown = pricingEstimate.breakdown
    setValue('material_cost', Math.round(breakdown.materialCost * 100) / 100)
    setValue('labor_cost', Math.round(breakdown.machiningCost * 100) / 100)
    setValue('overhead_cost', Math.round(breakdown.setupCost * 100) / 100)
    setValue('total_cost', Math.round(pricingEstimate.suggestedPrice * 100) / 100)

    // Track for feedback loop
    aiSuggestedPrice.current = pricingEstimate.suggestedPrice

    toast.success('Wycena zastosowana!')
  }

  const onSubmit = async (data: OrderFormData) => {
    const loadingToast = toast.loading('Tworzenie zamówienia...')

    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.dismiss(loadingToast)
      toast.error('Nie jesteś zalogowany')
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) {
      toast.dismiss(loadingToast)
      toast.error('Użytkownik nie przypisany do firmy')
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
      toast.error('Nie udało się utworzyć zamówienia: ' + error.message)
      return
    }

    toast.success('Zamówienie utworzone!')
    router.push('/orders')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Dodaj nowe zamówienie</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* LEFT COLUMN - FORM */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {/* Order Number */}
              <div>
                <label htmlFor="order_number" className="block text-slate-300 mb-2">Numer zamówienia *</label>
                <input
                  id="order_number"
                  autoFocus
                  {...register('order_number')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="ORD-001"
                />
                {errors.order_number && <p className="text-red-400 text-sm mt-1">{errors.order_number.message}</p>}
              </div>

              {/* Material - from Inventory (raw_material category) */}
              <div>
                <InventorySelect
                  items={materialItems}
                  loading={materialsLoading}
                  value={material}
                  onChange={(value) => setValue('material', value)}
                  label="Materiał"
                  placeholder="Wybierz materiał z magazynu..."
                  emptyMessage="Brak materiałów w magazynie. Dodaj materiały w zakładce Magazyn."
                  allowCustom={true}
                />
              </div>

              {/* Customer Name */}
              <div>
                <label htmlFor="customer_name" className="block text-slate-300 mb-2">Nazwa klienta *</label>
                <input
                  id="customer_name"
                  {...register('customer_name')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Firma XYZ"
                />
              </div>

              {/* Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-slate-300 mb-2">Termin *</label>
                <input
                  id="deadline"
                  {...register('deadline')}
                  type="date"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block text-slate-300 mb-2">Ilość *</label>
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
                  <option value="pending">Oczekujące</option>
                  <option value="in_progress">W realizacji</option>
                  <option value="completed">Ukończone</option>
                </select>
              </div>

              {/* Part Name - from Inventory (part/finished_good categories) */}
              <div className="col-span-2">
                <InventorySelect
                  items={partItems}
                  loading={partsLoading}
                  value={partName}
                  onChange={(value) => setValue('part_name', value)}
                  label="Nazwa Części (Podpowiada cenę!)"
                  placeholder="Wybierz część z magazynu lub wpisz nową..."
                  emptyMessage="Brak części w magazynie. Możesz wpisać nową nazwę."
                  allowCustom={true}
                />
                <p className="text-xs text-blue-400 mt-1">
                  💡 Wybierz z magazynu lub wpisz nową nazwę, aby zobaczyć historię podobnych zleceń.
                </p>
              </div>
            </div>

            {/* DAY 14-15: AI Pricing Calculator Section */}
            <div className="bg-slate-700/50 p-6 rounded-lg mb-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold text-white mb-4">🤖 Kalkulator Wyceny AI</h3>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Długość (mm)</label>
                  <input
                    {...register('length', { valueAsNumber: true })}
                    type="number"
                    placeholder="np. 100"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Szerokość (mm)</label>
                  <input
                    {...register('width', { valueAsNumber: true })}
                    type="number"
                    placeholder="np. 50"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Wysokość (mm)</label>
                  <input
                    {...register('height', { valueAsNumber: true })}
                    type="number"
                    placeholder="np. 20"
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>

              {/* Complexity */}
              <div className="mb-4">
                <label className="block text-slate-300 mb-2 text-sm">Złożoność</label>
                <select
                  {...register('complexity')}
                  className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="simple">Proste (1-2h obróbki)</option>
                  <option value="medium">Średnie (3-6h obróbki)</option>
                  <option value="complex">Złożone (8-20h obróbki)</option>
                </select>
              </div>

              {/* Calculate Button */}
              <button
                type="button"
                onClick={handleGetPricingEstimate}
                disabled={isCalculating}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCalculating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Obliczam...
                  </>
                ) : (
                  <>
                    <span>🧠</span>
                    Oblicz Wycenę AI
                  </>
                )}
              </button>

              {/* AI Estimate Result */}
              {pricingEstimate && (
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-300">Sugerowana cena:</span>
                    <span className="text-2xl font-bold text-green-400">
                      {pricingEstimate.suggestedPrice.toFixed(2)} PLN
                    </span>
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-300">Cena za sztukę:</span>
                    <span className="text-lg text-white">
                      {pricingEstimate.pricePerUnit.toFixed(2)} PLN
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-slate-300">Pewność:</span>
                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${pricingEstimate.confidence}%` }}
                      />
                    </div>
                    <span className="text-white font-semibold">{pricingEstimate.confidence}%</span>
                  </div>

                  <div className="mb-4 p-3 bg-slate-800/50 rounded text-sm text-slate-300">
                    <p className="font-medium text-white mb-1">Uzasadnienie:</p>
                    {pricingEstimate.reasoning}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-4">
                    <div>Materiał: {pricingEstimate.breakdown.materialCost.toFixed(2)} PLN</div>
                    <div>Obróbka: {pricingEstimate.breakdown.machiningCost.toFixed(2)} PLN</div>
                    <div>Setup: {pricingEstimate.breakdown.setupCost.toFixed(2)} PLN</div>
                    <div>Marża: {pricingEstimate.breakdown.marginPercentage}%</div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleApplyPricingEstimate}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                    >
                      ✅ Zastosuj
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingEstimate(null)}
                      className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition"
                    >
                      ❌ Odrzuć
                    </button>
                  </div>
                </div>
              )}
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
                    onBlur={handleCostBlur}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Praca (PLN)</label>
                  <input
                    {...register('labor_cost', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    onBlur={handleCostBlur}
                    className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2 text-sm">Setup/Inne (PLN)</label>
                  <input
                    {...register('overhead_cost', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    onBlur={handleCostBlur}
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