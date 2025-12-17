'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import type { UnifiedPricingResult } from '@/types/quotes'
import type { Customer } from '@/types/customers'
import { logger } from '@/lib/logger'
import UnifiedPricingCard from '@/components/pricing/UnifiedPricingCard'
import { useMaterials, useParts } from '@/hooks/useInventoryItems'
import InventorySelect from '@/components/inventory/InventorySelect'
import CustomerSelect from '@/components/customers/CustomerSelect'
import QuickAddCustomerModal from '@/components/customers/QuickAddCustomerModal'
import DrawingUpload from '@/components/orders/DrawingUpload'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { useOperators } from '@/hooks/useOperators'
import { sanitizeText } from '@/lib/sanitization'

export default function AddOrderPage() {
  const router = useRouter()
  const { t } = useTranslation() // Initialize useTranslation, removing lang as it's handled internally
  const [pricingResult, setPricingResult] = useState<UnifiedPricingResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [companyId, setCompanyId] = useState<string>('')
  const [userId, setUserId] = useState<number>(0)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [pendingCustomerName, setPendingCustomerName] = useState('')
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState<string>('')
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(true)

  const orderSchema = z.object({
    customer_id: z.string().min(1, 'Wybierz klienta z listy lub dodaj nowego'),
    quantity: z.number().min(1, t('orders', 'quantityRequired')),
    part_name: z.string().optional(),
    material: z.string().optional(),
    deadline: z.string().min(1, t('orders', 'deadlineRequired')),
    status: z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']),
    notes: z.string().optional(),
    // Technical drawing
    drawing_file_id: z.string().uuid().optional().nullable(),
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
      drawing_file_id: null,
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

  // Auto-generate order number when company_id is available
  useEffect(() => {
    async function generateOrderNumber() {
      if (!companyId) return

      setIsGeneratingNumber(true)

      try {
        const { data, error } = await supabase
          .rpc('generate_order_number', { p_company_id: companyId })

        if (error) {
          logger.error('Failed to generate order number', { error })
          toast.error('Nie udało się wygenerować numeru zamówienia')
          setGeneratedOrderNumber('ORD-TEMP-0001') // Fallback
        } else {
          setGeneratedOrderNumber(data)
        }
      } catch (error) {
        logger.error('Error generating order number', { error })
        toast.error('Błąd generowania numeru')
        setGeneratedOrderNumber('ORD-TEMP-0001') // Fallback
      } finally {
        setIsGeneratingNumber(false)
      }
    }

    if (companyId) {
      generateOrderNumber()
    }
  }, [companyId])

  useEffect(() => {
    const total = materialCost + laborCost + overheadCost
    setValue('total_cost', total)
  }, [materialCost, laborCost, overheadCost, setValue])

  // Unified Pricing Calculator
  const handleCalculatePricing = async () => {
    const currentMaterial = watch('material')
    const currentQuantity = watch('quantity')
    const currentComplexity = watch('complexity')

    if (!currentMaterial || !currentQuantity) {
      toast.error(t('orders', 'fillMaterialQuantity'))
      return
    }

    setIsCalculating(true)
    const loadingToast = toast.loading('Obliczam najlepszą cenę...')

    try {
      const response = await fetch('/api/quotes/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: currentMaterial,
          quantity: currentQuantity,
          partName: watch('part_name') || undefined,
          length: watch('length') || undefined,
          width: watch('width') || undefined,
          height: watch('height') || undefined,
          complexity: currentComplexity || 'medium',
        }),
      })

      toast.dismiss(loadingToast)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Nie udało się obliczyć wyceny')
      }

      const data: UnifiedPricingResult = await response.json()
      setPricingResult(data)
      toast.success('Wycena gotowa! 💰')
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Błąd kalkulacji')
      logger.error('Pricing calculation error', { error })
    } finally {
      setIsCalculating(false)
    }
  }

  // Apply Unified Pricing to form
  const handleApplyPricing = (finalPrice: number) => {
    if (!pricingResult) return

    const breakdown = pricingResult.recommended.breakdown
    setValue('material_cost', Math.round(breakdown.materialCost * 100) / 100)
    setValue('labor_cost', Math.round(breakdown.laborCost * 100) / 100)
    setValue('overhead_cost', Math.round(breakdown.setupCost * 100) / 100)
    setValue('total_cost', Math.round(finalPrice * 100) / 100)

    setPricingResult(null) // Close the pricing modal
    toast.success('Wycena zastosowana!')
  }

  // Customer selection handlers
  const handleCustomerChange = (customerId: string | null, customerName: string) => {
    setValue('customer_id', customerId || '', { shouldValidate: true })
  }

  const handleCreateNewCustomer = (name: string) => {
    setPendingCustomerName(name)
    setIsQuickAddOpen(true)
  }

  const handleCustomerCreated = (customer: Customer) => {
    setValue('customer_id', customer.id, { shouldValidate: true })
    setIsQuickAddOpen(false)
    toast.success(`Klient "${customer.name}" został dodany!`)
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

    // Validate that order number was generated
    if (!generatedOrderNumber || isGeneratingNumber) {
      toast.dismiss(loadingToast)
      toast.error('Poczekaj na wygenerowanie numeru zamówienia')
      return
    }

    // Sanitize user inputs to prevent XSS attacks
    const finalOrderData = {
      ...orderData,
      customer_id: orderData.customer_id,
      order_number: generatedOrderNumber, // Use auto-generated number
      part_name: orderData.part_name ? sanitizeText(orderData.part_name) : null,
      material: materialString ? sanitizeText(materialString) : null,
      notes: orderData.notes ? sanitizeText(orderData.notes) : null,
      linked_inventory_item_id: data.linked_inventory_item_id,
      material_quantity_needed: data.material_quantity_needed,
      assigned_operator_id: data.assigned_operator_id,
      drawing_file_id: data.drawing_file_id,
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
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">{t('orders', 'addNewOrder')}</h1>

        {/* Unified Pricing Modal */}
        {pricingResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <UnifiedPricingCard
                pricingResult={pricingResult}
                quantity={watch('quantity') || 1}
                onApply={handleApplyPricing}
                onCancel={() => setPricingResult(null)}
                allowEdit={true}
                isApplying={false}
                showCancelButton={true}
                applyButtonText="✅ Zastosuj do formularza"
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="mb-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  {/* Order Number - Auto-generated */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2">
                      {t('orders', 'orderNumber')} *
                    </label>
                    <div className="relative">
                      <Input
                        value={isGeneratingNumber ? 'Generowanie...' : generatedOrderNumber}
                        disabled
                        className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isGeneratingNumber ? (
                          <span className="animate-spin text-blue-500">⏳</span>
                        ) : (
                          <span className="text-green-500">✓</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-blue-400 mt-1">Numer nadany automatycznie</p>
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

                  {/* Customer Selection */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      {t('orders', 'customer')} *
                    </label>
                    <CustomerSelect
                      value={watch('customer_id')}
                      onChange={handleCustomerChange}
                      onCreateNew={handleCreateNewCustomer}
                      error={errors.customer_id?.message}
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

                  {/* Technical Drawing Upload */}
                  <div className="col-span-2">
                    <DrawingUpload
                      value={watch('drawing_file_id') || null}
                      onChange={(fileId) => setValue('drawing_file_id', fileId)}
                      companyId={companyId}
                      userId={userId}
                    />
                  </div>
                </div>

                {/* Unified Pricing Calculator */}
                <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg mb-6 border border-purple-200 dark:border-purple-500/30">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🧮 Kalkulator wyceny</h3>

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
                    onClick={handleCalculatePricing}
                    disabled={isCalculating}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0"
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

                {/* Cost Section */}
                <div className="bg-slate-100 dark:bg-slate-700/50 p-6 rounded-lg mb-6 border border-slate-200 dark:border-slate-600">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">💰 {t('orders', 'costCalculationTitle')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('orders', 'materialCostLabel')}</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register('material_cost', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('orders', 'laborCostLabel')}</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register('labor_cost', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">{t('orders', 'overheadCostLabel')}</label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register('overhead_cost', { valueAsNumber: true })}
                      />
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
      </div>
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
  )
}