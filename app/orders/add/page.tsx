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
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { useOperators } from '@/hooks/useOperators'

export default function AddOrderPage() {
  const router = useRouter()
  const { t } = useTranslation() // Initialize useTranslation, removing lang as it's handled internally
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimateResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  // AI Feedback Loop: Track what AI suggested vs what user enters
  const aiSuggestedPrice = useRef<number | null>(null)

  const orderSchema = z.object({
    order_number: z.string().min(1, t('orders', 'orderNumberRequired')),
    customer_name: z.string().min(2, t('orders', 'customerNameRequired')),
    quantity: z.number().min(1, t('orders', 'quantityRequired')),
    part_name: z.string().optional(),
    material: z.string().optional(),
    deadline: z.string().min(1, t('orders', 'deadlineRequired')),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
    notes: z.string().optional(),
    // DAY 14-15: Pricing calculator fields
    length: z.union([z.number(), z.nan()]).optional().nullable(),
    width: z.union([z.number(), z.nan()]).optional().nullable(),
    height: z.union([z.number(), z.nan()]).optional().nullable(),
    complexity: z.enum(['simple', 'medium', 'complex']).optional().nullable(),
    // DAY 12: Cost tracking fields
    material_cost: z.number().min(0, t('orders', 'materialCostPositive')),
    labor_cost: z.number().min(0, t('orders', 'laborCostPositive')),
    overhead_cost: z.number().min(0, t('orders', 'overheadCostPositive')),
    total_cost: z.number().min(0, t('orders', 'totalCostPositive')),
    // Auto-Deduct fields
    linked_inventory_item_id: z.string().uuid().optional().nullable(),
    material_quantity_needed: z.number().min(0, 'Ilość materiału na jednostkę musi być większa lub równa 0').optional().nullable(),
    // Operator assignment
    assigned_operator_id: z.number().optional().nullable(),
  })

  type OrderFormData = z.infer<typeof orderSchema>

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
      linked_inventory_item_id: null,
      material_quantity_needed: null,
      assigned_operator_id: null,
    },
  })

  // Watch fields for Local Intelligence
  const partName = watch('part_name') || ''
  const materialString = watch('material') || '' // Changed to avoid conflict with `material` object
  const linkedInventoryItemId = watch('linked_inventory_item_id')
  const quantity = watch('quantity') || 1
  
  // Watch cost fields for auto-calculation
  const materialCost = watch('material_cost') || 0
  const laborCost = watch('labor_cost') || 0
  const overheadCost = watch('overhead_cost') || 0

  // Inventory hooks for Material and Part Name dropdowns
  const { items: materialItems, loading: materialsLoading } = useMaterials()
  const { items: partItems, loading: partsLoading } = useParts()

  // Operators hook for assignment dropdown
  const { operators, loading: operatorsLoading } = useOperators()

  // Get current selected material object for display in InventorySelect
  const currentMaterialItem = materialItems.find(item => item.id === linkedInventoryItemId)
  const currentMaterialNameForDisplay = currentMaterialItem?.name || ''

  // Use Local Intelligence Hook
  const { estimate: localEstimate, similarOrders, loading: localLoading } = useSmartPricing(partName, materialString)
  
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

    toast.success(t('orders', 'localPriceApplied', { price: price.toFixed(2) }))
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
            material: materialString,
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
      toast.error(t('orders', 'fillMaterialQuantity'))
      return
    }

    setIsCalculating(true)
    const loadingToast = toast.loading(t('orders', 'calculating'))

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
        throw new Error(error.error || t('orders', 'pricingCalculationError'))
      }

      const data: PricingEstimateResponse = await response.json()
      setPricingEstimate(data)
      toast.success(t('orders', 'pricingEstimateReady'))
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : t('orders', 'pricingCalculationError'))
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

    toast.success(t('orders', 'pricingApplied'))
  }

  const onSubmit = async (data: OrderFormData) => {
    const loadingToast = toast.loading(t('orders', 'savingOrder'))

    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.dismiss(loadingToast)
      toast.error(t('orders', 'notLoggedIn'))
      return
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) {
      toast.dismiss(loadingToast)
      toast.error(t('orders', 'noCompanyAssigned'))
      return
    }

    // Exclude pricing calculator fields (not in database)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { length, width, height, complexity, ...orderData } = data

    // Ensure material is stored as string but linked_inventory_item_id is also set
    const finalOrderData = {
      ...orderData,
      material: materialString, // Ensure the material name is stored
      linked_inventory_item_id: data.linked_inventory_item_id,
      material_quantity_needed: data.material_quantity_needed,
      assigned_operator_id: data.assigned_operator_id,
    };

    const { error } = await supabase
      .from('orders')
      .insert({
        ...finalOrderData,
        created_by: userProfile.id,
        company_id: userProfile.company_id,
      })

    toast.dismiss(loadingToast)

    if (error) {
      toast.error(`${t('orders', 'createOrderFailed')}: ${error.message}`)
      return
    }

    toast.success(t('orders', 'orderCreated'))
    router.push('/orders')
    router.refresh()
  }

  const complexityOptions = [
    { value: 'simple', label: t('orders', 'complexitySimple') },
    { value: 'medium', label: t('orders', 'complexityMedium') },
    { value: 'complex', label: t('orders', 'complexityComplex') },
  ]

  const statusOptions = [
    { value: 'pending', label: t('orderStatus', 'pending') },
    { value: 'in_progress', label: t('orderStatus', 'in_progress') },
    { value: 'completed', label: t('orderStatus', 'completed') },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{t('orders', 'addNewOrder')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* LEFT COLUMN - FORM */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="mb-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {/* Order Number */}
                  <div>
                    <label htmlFor="order_number" className="block text-slate-700 dark:text-slate-300 mb-2">{t('orders', 'orderNumber')} *</label>
                    <Input
                      id="order_number"
                      autoFocus
                      placeholder="ORD-001"
                      {...register('order_number')}
                    />
                    {errors.order_number && <p className="text-red-400 text-sm mt-1">{errors.order_number.message}</p>}
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
                      label={`${t('common', 'material')}`}
                      placeholder={t('inventory', 'selectMaterial')}
                      emptyMessage={t('inventory', 'noMaterialsInStock')}
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
                    <label htmlFor="customer_name" className="block text-slate-700 dark:text-slate-300 mb-2">{t('orders', 'customer')} *</label>
                    <Input
                      id="customer_name"
                      placeholder="Firma XYZ"
                      {...register('customer_name')}
                    />
                  </div>

                  {/* Deadline */}
                  <div>
                    <label htmlFor="deadline" className="block text-slate-700 dark:text-slate-300 mb-2">{t('orders', 'deadline')} *</label>
                    <Input
                      id="deadline"
                      type="date"
                      {...register('deadline')}
                    />
                  </div>

                  {/* Quantity */}
                  <div>
                    <label htmlFor="quantity" className="block text-slate-700 dark:text-slate-300 mb-2">{t('common', 'quantity')} *</label>
                    <Input
                      id="quantity"
                      type="number"
                      {...register('quantity', { valueAsNumber: true })}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-slate-700 dark:text-slate-300 mb-2">{t('common', 'status')} *</label>
                    <Select
                      options={statusOptions}
                      value={watch('status')}
                      onChange={(value) => setValue('status', value as "pending" | "in_progress" | "completed" | "delayed" | "cancelled")}
                    />
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

                  {/* Part Name - from Inventory (part/finished_good categories) */}
                  <div className="col-span-2">
                    <InventorySelect
                      items={partItems}
                      loading={partsLoading}
                      value={partName}
                      onChange={(value) => setValue('part_name', value)}
                      label={`${t('orders', 'partName')} (${t('orders', 'suggestedPrice')}!)`}
                      placeholder={t('inventory', 'selectPart')}
                      emptyMessage={t('inventory', 'noPartsInStock')}
                      allowCustom={true}
                    />
                    <p className="text-xs text-blue-400 mt-1">
                      {t('orders', 'partNameHint')}
                    </p>
                  </div>
                </div>

                {/* DAY 14-15: AI Pricing Calculator Section */}
                <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg mb-6 border border-purple-200 dark:border-purple-500/30">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🤖 {t('orders', 'aiPricingCalculatorTitle')}</h3>

                  {/* Dimensions */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('common', 'length')} ({t('common', 'milimeters')})</label>
                      <Input
                        type="number"
                        placeholder="np. 100"
                        {...register('length', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('common', 'width')} ({t('common', 'milimeters')})</label>
                      <Input
                        type="number"
                        placeholder="np. 50"
                        {...register('width', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('common', 'height')} ({t('common', 'milimeters')})</label>
                      <Input
                        type="number"
                        placeholder="np. 20"
                        {...register('height', { valueAsNumber: true })}
                      />
                    </div>
                  </div>

                  {/* Complexity */}
                  <div className="mb-4">
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('common', 'complexity')}</label>
                    <Select
                      options={complexityOptions}
                      value={watch('complexity') || 'medium'}
                      onChange={(value) => setValue('complexity', value as "simple" | "medium" | "complex")}
                    />
                  </div>

                  {/* Calculate Button */}
                  <Button
                    type="button"
                    onClick={handleGetPricingEstimate}
                    disabled={isCalculating}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
                  >
                    {isCalculating ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        {t('orders', 'calculating')}
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🧠</span>
                        {t('orders', 'calculateAiPrice')}
                      </>
                    )}
                  </Button>

                  {/* AI Estimate Result */}
                  {pricingEstimate && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-100/50 to-blue-100/50 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-300 dark:border-purple-500 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-slate-700 dark:text-slate-300">{t('orders', 'suggestedPrice')}:</span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {pricingEstimate.suggestedPrice.toFixed(2)} PLN
                        </span>
                      </div>

                      <div className="flex justify-between items-center mb-3">
                        <span className="text-slate-700 dark:text-slate-300">{t('orders', 'pricePerUnit')}:</span>
                        <span className="text-lg text-slate-900 dark:text-white">
                          {pricingEstimate.pricePerUnit.toFixed(2)} PLN
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-slate-700 dark:text-slate-300">{t('common', 'confidence')}:</span>
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${pricingEstimate.confidence}%` }}
                          />
                        </div>
                        <span className="text-slate-900 dark:text-white font-semibold">{pricingEstimate.confidence}%</span>
                      </div>

                      <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800/50 rounded text-sm text-slate-700 dark:text-slate-300">
                        <p className="font-medium text-slate-900 dark:text-white mb-1">{t('common', 'reasoning')}:</p>
                        {pricingEstimate.reasoning}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4">
                        <div>{t('common', 'material')}: {pricingEstimate.breakdown.materialCost.toFixed(2)} PLN</div>
                        <div>{t('common', 'labor')}: {pricingEstimate.breakdown.machiningCost.toFixed(2)} PLN</div>
                        <div>{t('common', 'overhead')}: {pricingEstimate.breakdown.setupCost.toFixed(2)} PLN</div>
                        <div>{t('common', 'margin')}: {pricingEstimate.breakdown.marginPercentage}%</div>
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          onClick={handleApplyPricingEstimate}
                          className="flex-1 bg-green-600 hover:bg-green-700 border-0"
                        >
                          ✅ {t('common', 'apply')}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setPricingEstimate(null)}
                          variant="secondary"
                          className="flex-1"
                        >
                          ❌ {t('common', 'discard')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost Section */}
                <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg mb-6 border border-slate-200 dark:border-slate-600">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">💰 {t('orders', 'costCalculationTitle')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('orders', 'materialCostLabel')}</label>
                      {(() => {
                        const { onBlur, ...rest } = register('material_cost', { valueAsNumber: true })
                        return (
                          <Input
                            type="number"
                            step="0.01"
                            {...rest}
                            onBlur={(e) => {
                              onBlur(e)
                              handleCostBlur()
                            }}
                          />
                        )
                      })()}
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('orders', 'laborCostLabel')}</label>
                      {(() => {
                        const { onBlur, ...rest } = register('labor_cost', { valueAsNumber: true })
                        return (
                          <Input
                            type="number"
                            step="0.01"
                            {...rest}
                            onBlur={(e) => {
                              onBlur(e)
                              handleCostBlur()
                            }}
                          />
                        )
                      })()}
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('orders', 'overheadCostLabel')}</label>
                      {(() => {
                        const { onBlur, ...rest } = register('overhead_cost', { valueAsNumber: true })
                        return (
                          <Input
                            type="number"
                            step="0.01"
                            {...rest}
                            onBlur={(e) => {
                              onBlur(e)
                              handleCostBlur()
                            }}
                          />
                        )
                      })()}
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-600 pt-4">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{t('orders', 'totalCostCalculated')}</span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {(materialCost + laborCost + overheadCost).toFixed(2)} PLN
                    </span>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 border-0"
                  >
                    {isSubmitting ? t('orders', 'savingOrder') : t('orders', 'createOrderBtn')}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => router.push('/orders')}
                    variant="secondary"
                    className="px-8"
                  >
                    {t('common', 'cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-1">{t('orders', 'howItWorksTitle')}</p>
                  <p>
                    {t('orders', 'howItWorksDesc')}
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