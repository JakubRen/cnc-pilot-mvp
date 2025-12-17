/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useMaterials, useParts } from '@/hooks/useInventoryItems'
import { MATERIAL_OPTIONS } from '@/lib/pricing-calculator'
import type { UnifiedPricingResult } from '@/types/quotes'
import type { Customer } from '@/types/customers'
import { logger } from '@/lib/logger'
import AppLayout from '@/components/layout/AppLayout'
import UnifiedPricingCard from '@/components/pricing/UnifiedPricingCard'
import CustomerSelect from '@/components/customers/CustomerSelect'
import QuickAddCustomerModal from '@/components/customers/QuickAddCustomerModal'

// Form schema
const expressQuoteSchema = z.object({
  customer_id: z.string().min(1, 'Wybierz klienta z listy lub dodaj nowego'),
  part_name: z.string().min(1, 'Nazwa części wymagana'),
  material: z.string().min(1, 'Materiał wymagany'),
  quantity: z.number().min(1, 'Ilość musi być >= 1').max(10000, 'Maksymalnie 10000 sztuk'),
  complexity: z.enum(['simple', 'medium', 'complex']),
  deadline: z.string().optional(),
})

type ExpressQuoteFormData = z.infer<typeof expressQuoteSchema>

export default function ExpressQuotePage() {
  const router = useRouter()
  const [isCalculating, setIsCalculating] = useState(false)
  const [pricingResult, setPricingResult] = useState<UnifiedPricingResult | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [userId, setUserId] = useState<number>(0)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [pendingCustomerName, setPendingCustomerName] = useState('')

  // Inventory hooks for autocomplete
  const { items: materialItems } = useMaterials()
  const { items: partItems } = useParts()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ExpressQuoteFormData>({
    resolver: zodResolver(expressQuoteSchema),
    defaultValues: {
      quantity: 1,
      material: '',
      part_name: '',
      customer_id: '',
      complexity: 'medium',
      deadline: ''
    }
  })

  const formData = watch()

  // Get user and company info
  useEffect(() => {
    async function fetchUserInfo() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (userProfile) {
        setCompanyId(userProfile.company_id)
        setUserId(userProfile.id)
      }
    }

    fetchUserInfo()
  }, [])

  // Step 1: Calculate pricing
  const handleCalculatePricing = async (data: ExpressQuoteFormData) => {
    setIsCalculating(true)
    setPricingResult(null)
    const loadingToast = toast.loading('Obliczam najlepszą cenę...')

    try {
      const response = await fetch('/api/quotes/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: data.material,
          quantity: data.quantity,
          partName: data.part_name,
          complexity: data.complexity,
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się obliczyć ceny')
      }

      setPricingResult(result)
      toast.dismiss(loadingToast)
      toast.success('Wycena gotowa! 💰')

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Błąd kalkulacji')
      logger.error('Pricing calculation failed', { error })
    } finally {
      setIsCalculating(false)
    }
  }

  // Step 2: Create quote and get link
  const handleCreateQuote = async (finalPrice: number, customMargin?: number | null) => {
    if (!pricingResult) return

    setIsCreating(true)
    const loadingToast = toast.loading('Generuję ofertę...')

    try {
      const isManuallyAdjusted = finalPrice !== pricingResult.recommended.price

      // Create quote
      const response = await fetch('/api/quotes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          part_name: formData.part_name,
          material: formData.material,
          quantity: formData.quantity,
          deadline: formData.deadline || null,
          total_price: finalPrice,
          breakdown: pricingResult.recommended.breakdown,
          pricing_method: pricingResult.recommended.method, // Keep original method
          confidence_score: pricingResult.recommended.confidence,
          reasoning: isManuallyAdjusted
            ? `[EDYTOWANA] Cena ręcznie dostosowana (marża: ${(customMargin ?? pricingResult.recommended.breakdown.marginPercentage).toFixed(1)}%). Oryginalna rekomendacja: ${pricingResult.recommended.reasoning}`
            : pricingResult.recommended.reasoning,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Nie udało się utworzyć oferty')
      }

      toast.dismiss(loadingToast)
      toast.success('Oferta utworzona! 🎉')

      // Redirect to quote details with actions
      router.push(`/quotes/${data.quote.id}`)

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Błąd tworzenia oferty')
      logger.error('Quote creation failed', { error })
    } finally {
      setIsCreating(false)
    }
  }

  // Customer selection handlers
  const handleCustomerChange = (customerId: string | null, customerName: string) => {
    setValue('customer_id', customerId || '', { shouldValidate: true })
  }

  const handleCreateNewCustomer = (name: string) => {
    setPendingCustomerName(name)
    setIsQuickAddOpen(true)
  }

  const handleCustomerCreated = async (customer: Customer) => {
    setSelectedCustomer(customer)
    setValue('customer_id', customer.id, { shouldValidate: true })
    setIsQuickAddOpen(false)
    toast.success(`Klient "${customer.name}" został dodany!`)
  }

  const complexityOptions = [
    { value: 'simple', label: 'Proste' },
    { value: 'medium', label: 'Średnie' },
    { value: 'complex', label: 'Złożone' },
  ]

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              ⚡ Express Quote
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Wyceniaj w 4 minuty. System łączy kalkulator z historią zamówień.
            </p>
          </div>

          {/* Form Card */}
          {!pricingResult && (
            <form onSubmit={handleSubmit(handleCalculatePricing)}>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 shadow-xl">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                  Podstawowe informacje
                </h2>

                <div className="space-y-6">
                  {/* Customer Selection */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      Klient *
                    </label>
                    <CustomerSelect
                      value={formData.customer_id}
                      onChange={handleCustomerChange}
                      onCreateNew={handleCreateNewCustomer}
                      error={errors.customer_id?.message}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Part Name */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2">
                      Nazwa części *
                    </label>
                    <Input
                      {...register('part_name')}
                      placeholder="Flansza, Tuleja, Wałek..."
                      list="parts-list"
                    />
                    {errors.part_name && (
                      <p className="text-red-400 text-sm mt-1">{errors.part_name.message}</p>
                    )}
                    {/* Datalist for autocomplete from inventory */}
                    <datalist id="parts-list">
                      {partItems.map(item => (
                        <option key={item.id} value={item.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Material */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2">
                      Materiał *
                    </label>
                    <select
                      {...register('material')}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Wybierz materiał...</option>
                      {MATERIAL_OPTIONS.map(mat => (
                        <option key={mat.value} value={mat.value}>{mat.label}</option>
                      ))}
                    </select>
                    {errors.material && (
                      <p className="text-red-400 text-sm mt-1">{errors.material.message}</p>
                    )}
                  </div>

                  {/* Complexity */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2">
                      Złożoność obróbki *
                    </label>
                    <select
                      {...register('complexity')}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="simple">Proste (1-2h obróbki)</option>
                      <option value="medium">Średnie (3-6h obróbki)</option>
                      <option value="complex">Złożone (8-20h obróbki)</option>
                    </select>
                    {errors.complexity && (
                      <p className="text-red-400 text-sm mt-1">{errors.complexity.message}</p>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2">
                      Ilość *
                    </label>
                    <Input
                      {...register('quantity', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      max="10000"
                      placeholder="50"
                    />
                    {errors.quantity && (
                      <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>
                    )}
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2">
                      Termin realizacji
                    </label>
                    <Input
                      {...register('deadline')}
                      type="date"
                    />
                  </div>
                </div>
                </div>

                <Button
                  type="submit"
                  disabled={isCalculating}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 text-lg"
                >
                  {isCalculating ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Obliczam...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🧮</span>
                      Oblicz najlepszą cenę
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Pricing Result */}
          {pricingResult && (
            <UnifiedPricingCard
              pricingResult={pricingResult}
              quantity={formData.quantity}
              onApply={handleCreateQuote}
              onCancel={() => setPricingResult(null)}
              allowEdit={true}
              isApplying={isCreating}
              showCancelButton={true}
              applyButtonText="✅ Utwórz ofertę"
            />
          )}

          {/* Quick Add Customer Modal */}
          <QuickAddCustomerModal
            isOpen={isQuickAddOpen}
            onClose={() => setIsQuickAddOpen(false)}
            onSuccess={handleCustomerCreated}
            initialName={pendingCustomerName}
            companyId={companyId}
            userId={userId}
          />
        </div>
      </div>
    </AppLayout>
  )
}
