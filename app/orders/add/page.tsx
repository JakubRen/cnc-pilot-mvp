'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import type { UnifiedPricingResult } from '@/types/quotes'
import type { PriceEstimateResult } from '@/lib/ai/openai-client'
import { estimatePriceAction } from '@/lib/ai/estimate-price-action'
import type { Customer } from '@/types/customers'
import { logger } from '@/lib/logger'
import UnifiedPricingCard from '@/components/pricing/UnifiedPricingCard'
import { useMaterials, useParts } from '@/hooks/useInventoryItems'
import CustomerSelect from '@/components/customers/CustomerSelect'
import QuickAddCustomerModal from '@/components/customers/QuickAddCustomerModal'
import OrderItemCard from '@/components/orders/OrderItemCard'
import type { OrderItemEntry } from '@/components/orders/OrderItemCard'
import DatePicker from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/hooks/useTranslation'
import { useOperators } from '@/hooks/useOperators'
import { useUserProfile } from '@/hooks/useUserProfile'
import { sanitizeText } from '@/lib/sanitization'

const generateTempId = () => Math.random().toString(36).substr(2, 9)

const createEmptyItem = (): OrderItemEntry => ({
  tempId: generateTempId(),
  part_name: '',
  material: '',
  linked_inventory_item_id: null,
  material_quantity_needed: null,
  quantity: 1,
  length: null,
  width: null,
  height: null,
  tolerance_length: null,
  tolerance_width: null,
  tolerance_height: null,
  complexity: 'medium',
  drawing_file_id: null,
  notes: '',
})

export default function AddOrderPage() {
  const router = useRouter()
  const { t } = useTranslation()

  // --- Header (order-level) state ---
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerError, setCustomerError] = useState('')
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'>('pending')
  const [assignedOperatorId, setAssignedOperatorId] = useState<number | null>(null)
  const [orderNotes, setOrderNotes] = useState('')
  const [materialCost, setMaterialCost] = useState(0)
  const [laborCost, setLaborCost] = useState(0)
  const [overheadCost, setOverheadCost] = useState(0)

  // --- Items state ---
  const [items, setItems] = useState<OrderItemEntry[]>([createEmptyItem()])

  // --- Other state ---
  const { profile } = useUserProfile()
  const companyId = profile?.company_id || ''
  const userId = profile?.id || 0
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [pendingCustomerName, setPendingCustomerName] = useState('')
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState('')
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pricing
  const [pricingResult, setPricingResult] = useState<UnifiedPricingResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [pricingItemIndex, setPricingItemIndex] = useState<number>(0)

  // AI Estimate
  const [aiEstimate, setAiEstimate] = useState<PriceEstimateResult | null>(null)
  const [isAIEstimating, setIsAIEstimating] = useState(false)
  const [aiEstimateItemIndex, setAiEstimateItemIndex] = useState<number>(0)

  // Inventory hooks
  const { items: materialItems, loading: materialsLoading } = useMaterials()
  const { items: partItems, loading: partsLoading } = useParts()
  const { operators, loading: operatorsLoading } = useOperators()

  const totalCost = materialCost + laborCost + overheadCost

  // Auto-generate order number
  useEffect(() => {
    async function generateOrderNumber() {
      if (!companyId) return
      setIsGeneratingNumber(true)
      try {
        const { data, error } = await supabase.rpc('generate_order_number', { p_company_id: companyId })
        if (error) {
          logger.error('Failed to generate order number', { error })
          toast.error('Nie udalo sie wygenerowac numeru zamowienia')
          setGeneratedOrderNumber('ORD-TEMP-0001')
        } else {
          setGeneratedOrderNumber(data)
        }
      } catch (error) {
        logger.error('Error generating order number', { error })
        setGeneratedOrderNumber('ORD-TEMP-0001')
      } finally {
        setIsGeneratingNumber(false)
      }
    }
    if (companyId) generateOrderNumber()
  }, [companyId])

  // --- Item manipulation ---
  const updateItem = (index: number, updates: Partial<OrderItemEntry>) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }

  const addItem = () => {
    setItems(prev => [...prev, createEmptyItem()])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // --- Pricing ---
  const handleCalculatePricing = async (itemIndex: number) => {
    const item = items[itemIndex]
    if (!item.material || !item.quantity) {
      toast.error(t('orders', 'fillMaterialQuantity'))
      return
    }
    setIsCalculating(true)
    setPricingItemIndex(itemIndex)
    const loadingToast = toast.loading('Obliczam najlepsza cene...')
    try {
      const response = await fetch('/api/quotes/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: item.material,
          quantity: item.quantity,
          partName: item.part_name || undefined,
          length: item.length || undefined,
          width: item.width || undefined,
          height: item.height || undefined,
          complexity: item.complexity || 'medium',
        }),
      })
      toast.dismiss(loadingToast)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Nie udalo sie obliczyc wyceny')
      }
      const data: UnifiedPricingResult = await response.json()
      setPricingResult(data)
      toast.success('Wycena gotowa!')
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Blad kalkulacji')
      logger.error('Pricing calculation error', { error })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleApplyPricing = (finalPrice: number) => {
    if (!pricingResult) return
    const breakdown = pricingResult.recommended.breakdown
    setMaterialCost(Math.round(breakdown.materialCost * 100) / 100)
    setLaborCost(Math.round(breakdown.laborCost * 100) / 100)
    setOverheadCost(Math.round(breakdown.setupCost * 100) / 100)
    setPricingResult(null)
    toast.success('Wycena zastosowana!')
  }

  // --- AI Estimate ---
  const handleAIEstimate = async (itemIndex: number) => {
    const item = items[itemIndex]
    if (!item.material) {
      toast.error('Podaj materiał aby użyć AI wyceny')
      return
    }
    setIsAIEstimating(true)
    setAiEstimateItemIndex(itemIndex)
    setAiEstimate(null)
    try {
      const dimensions = [item.length, item.width, item.height]
        .filter(Boolean)
        .join('x')

      const result = await estimatePriceAction({
        material: item.material,
        dimensions: dimensions ? `${dimensions}mm` : undefined,
        complexity: item.complexity === 'simple' ? 'low' : item.complexity === 'complex' ? 'high' : 'medium',
        quantity: item.quantity || 1,
        additionalNotes: item.notes || undefined,
      })

      if ('error' in result && result.error) {
        toast.error(result.error)
      } else {
        setAiEstimate(result)
        toast.success('AI wycena gotowa!')
      }
    } catch {
      toast.error('Błąd AI wyceny')
    } finally {
      setIsAIEstimating(false)
    }
  }

  const handleApplyAICosts = (material: number, labor: number, overhead: number) => {
    setMaterialCost(Math.round(material * 100) / 100)
    setLaborCost(Math.round(labor * 100) / 100)
    setOverheadCost(Math.round(overhead * 100) / 100)
    setAiEstimate(null)
    toast.success('Koszty AI zastosowane!')
  }

  // --- Customer handlers ---
  const handleCustomerChange = (cId: string | null, name: string) => {
    setCustomerId(cId || '')
    setCustomerName(name || '')
    setCustomerError('')
  }

  const handleCreateNewCustomer = (name: string) => {
    setPendingCustomerName(name)
    setIsQuickAddOpen(true)
  }

  const handleCustomerCreated = (customer: Customer) => {
    setCustomerId(customer.id)
    setCustomerName(customer.name)
    setIsQuickAddOpen(false)
    toast.success(`Klient "${customer.name}" zostal dodany!`)
  }

  // --- Submit ---
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!customerId) {
      setCustomerError('Wybierz klienta z listy lub dodaj nowego')
      return
    }
    if (!deadline) {
      toast.error(t('orders', 'deadlineRequired'))
      return
    }
    if (!generatedOrderNumber || isGeneratingNumber) {
      toast.error('Poczekaj na wygenerowanie numeru zamowienia')
      return
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (items[i].quantity < 1) {
        toast.error(`Pozycja ${i + 1}: ilosc musi byc minimum 1`)
        return
      }
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading(t('orders', 'savingOrder'))

    try {
      if (!profile?.company_id) {
        toast.dismiss(loadingToast)
        toast.error(t('orders', 'noCompanyAssigned'))
        return
      }

      const cleanNum = (v: number | null | undefined) => (v != null && !isNaN(v)) ? v : null

      // Summary fields for backwards compatibility
      const summaryPartName = items.length === 1
        ? (items[0].part_name || null)
        : `${items.length} pozycji`
      const summaryMaterial = items.length === 1
        ? (items[0].material || null)
        : 'Rozne'
      const summaryQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)

      // For single item, keep linked_inventory_item_id and material_quantity_needed on order level
      const singleItem = items.length === 1 ? items[0] : null

      const orderPayload = {
        order_number: generatedOrderNumber,
        customer_id: customerId,
        customer_name: sanitizeText(customerName),
        part_name: summaryPartName ? sanitizeText(summaryPartName) : null,
        material: summaryMaterial ? sanitizeText(summaryMaterial) : null,
        quantity: summaryQuantity || 1,
        deadline,
        status,
        notes: orderNotes ? sanitizeText(orderNotes) : null,
        material_cost: materialCost,
        labor_cost: laborCost,
        overhead_cost: overheadCost,
        total_cost: totalCost,
        assigned_operator_id: assignedOperatorId,
        linked_inventory_item_id: singleItem?.linked_inventory_item_id || null,
        material_quantity_needed: singleItem?.material_quantity_needed || null,
        drawing_file_id: singleItem?.drawing_file_id || null,
        length: singleItem ? cleanNum(singleItem.length) : null,
        width: singleItem ? cleanNum(singleItem.width) : null,
        height: singleItem ? cleanNum(singleItem.height) : null,
        tolerance_length: singleItem ? cleanNum(singleItem.tolerance_length) : null,
        tolerance_width: singleItem ? cleanNum(singleItem.tolerance_width) : null,
        tolerance_height: singleItem ? cleanNum(singleItem.tolerance_height) : null,
        created_by: profile.id,
        company_id: profile.company_id,
      }

      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select('id')
        .single()

      if (orderError || !insertedOrder) {
        toast.dismiss(loadingToast)
        toast.error(`${t('orders', 'createOrderFailed')}: ${orderError?.message}`)
        return
      }

      // Insert order_items
      if (items.length > 0) {
        const orderItems = items.map(item => ({
          order_id: insertedOrder.id,
          part_name: item.part_name ? sanitizeText(item.part_name) : 'Bez nazwy',
          material: item.material ? sanitizeText(item.material) : null,
          quantity: item.quantity || 1,
          length: cleanNum(item.length),
          width: cleanNum(item.width),
          height: cleanNum(item.height),
          tolerance_length: cleanNum(item.tolerance_length) ?? 0.1,
          tolerance_width: cleanNum(item.tolerance_width) ?? 0.1,
          tolerance_height: cleanNum(item.tolerance_height) ?? 0.1,
          complexity: item.complexity || null,
          drawing_file_id: item.drawing_file_id || null,
          notes: item.notes ? sanitizeText(item.notes) : null,
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)

        if (itemsError) {
          logger.error('Failed to insert order_items', { error: itemsError })
          // Order was created, items failed — warn but don't block
          toast.error('Zamowienie utworzone, ale nie udalo sie zapisac pozycji: ' + itemsError.message)
        }
      }

      toast.dismiss(loadingToast)
      toast.success(t('orders', 'orderCreated'))
      router.push('/orders')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Wystapil blad podczas tworzenia zamowienia')
      logger.error('Order creation error', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: t('orderStatus', 'pending') },
    { value: 'in_progress', label: t('orderStatus', 'in_progress') },
    { value: 'completed', label: t('orderStatus', 'completed') },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">{t('orders', 'addNewOrder')}</h1>

        {/* Unified Pricing Modal */}
        {pricingResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <UnifiedPricingCard
                pricingResult={pricingResult}
                quantity={items[pricingItemIndex]?.quantity || 1}
                onApply={handleApplyPricing}
                onCancel={() => setPricingResult(null)}
                allowEdit={true}
                isApplying={false}
                showCancelButton={true}
                applyButtonText="Zastosuj do formularza"
              />
            </div>
          </div>
        )}

        <form onSubmit={onSubmit}>
          {/* === ORDER HEADER === */}
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold text-foreground mb-6">Dane zamowienia</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Order Number */}
                <div>
                  <label className="block text-foreground mb-2">
                    {t('orders', 'orderNumber')} *
                  </label>
                  <div className="relative">
                    <Input
                      value={isGeneratingNumber ? 'Generowanie...' : generatedOrderNumber}
                      disabled
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isGeneratingNumber ? (
                        <span className="animate-spin text-violet-500">&#x23F3;</span>
                      ) : (
                        <span className="text-green-500">&#x2713;</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-violet-400 mt-1">Numer nadany automatycznie</p>
                </div>

                {/* Customer */}
                <div className="sm:col-span-2">
                  <label className="block text-foreground mb-2 font-medium">
                    {t('orders', 'customer')} *
                  </label>
                  <CustomerSelect
                    value={customerId}
                    onChange={handleCustomerChange}
                    onCreateNew={handleCreateNewCustomer}
                    error={customerError}
                  />
                </div>

                {/* Deadline */}
                <div>
                  <DatePicker
                    label={`${t('orders', 'deadline')}`}
                    value={deadline}
                    onChange={setDeadline}
                    required
                    minDate={new Date()}
                    placeholder="Wybierz termin..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-foreground mb-2">{t('common', 'status')} *</label>
                  <Select
                    options={statusOptions}
                    value={status}
                    onChange={(value) => setStatus(value as typeof status)}
                  />
                </div>

                {/* Operator */}
                <div>
                  <label className="block text-foreground mb-2">Przypisany operator</label>
                  <Select
                    options={[
                      { value: '', label: operatorsLoading ? 'Ladowanie...' : 'Brak przypisania' },
                      ...operators.map(op => ({ value: String(op.id), label: op.full_name }))
                    ]}
                    value={assignedOperatorId ? String(assignedOperatorId) : ''}
                    onChange={(value) => setAssignedOperatorId(value ? Number(value) : null)}
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-foreground mb-2">Notatki</label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                    placeholder="Dodatkowe uwagi dotyczace zamowienia..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* === ORDER ITEMS === */}
          {items.map((item, index) => (
            <OrderItemCard
              key={item.tempId}
              item={item}
              index={index}
              itemCount={items.length}
              onUpdate={updateItem}
              onRemove={removeItem}
              onCalculatePricing={handleCalculatePricing}
              onAIEstimate={handleAIEstimate}
              isCalculating={isCalculating}
              isPricingTarget={pricingItemIndex === index}
              isAIEstimating={isAIEstimating}
              isAIEstimateTarget={aiEstimateItemIndex === index}
              aiEstimate={aiEstimateItemIndex === index ? aiEstimate : null}
              onApplyAICosts={handleApplyAICosts}
              onApplyAIPrice={(price) => {
                toast.success(`Cena ${price.toFixed(2)} PLN — ustaw ją jako cenę sprzedaży po zapisaniu zamówienia`)
                setAiEstimate(null)
              }}
              onDismissAIEstimate={() => setAiEstimate(null)}
              materialItems={materialItems}
              materialsLoading={materialsLoading}
              partItems={partItems}
              partsLoading={partsLoading}
              companyId={companyId}
              userId={userId}
            />
          ))}

          {/* Add item button */}
          <div className="mb-6">
            <Button
              type="button"
              variant="secondary"
              onClick={addItem}
              className="w-full border-2 border-dashed border-border hover:border-violet-500 dark:hover:border-violet-400"
            >
              + Dodaj kolejna pozycje
            </Button>
          </div>

          {/* === COST SECTION === */}
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">{t('orders', 'costCalculationTitle')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-foreground mb-2 text-sm">{t('orders', 'materialCostLabel')}</label>
                  <Input type="number" step="0.01" value={materialCost} onChange={(e) => setMaterialCost(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-foreground mb-2 text-sm">{t('orders', 'laborCostLabel')}</label>
                  <Input type="number" step="0.01" value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-foreground mb-2 text-sm">{t('orders', 'overheadCostLabel')}</label>
                  <Input type="number" step="0.01" value={overheadCost} onChange={(e) => setOverheadCost(Number(e.target.value) || 0)} />
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center border-t border-border pt-4">
                <span className="text-foreground font-medium">{t('orders', 'totalCostCalculated')}</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {totalCost.toFixed(2)} PLN
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText={t('orders', 'savingOrder')}
              className="flex-1 bg-green-600 hover:bg-green-700 border-0"
            >
              {t('orders', 'createOrderBtn')}
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
        </form>
      </div>

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
