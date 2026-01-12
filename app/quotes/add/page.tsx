'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import DatePicker from '@/components/ui/DatePicker'
import type { UnifiedPricingResult } from '@/types/quotes'
import type { Customer } from '@/types/customers'
import { logger } from '@/lib/logger'
import AppLayout from '@/components/layout/AppLayout'
import CustomerSelect from '@/components/customers/CustomerSelect'
import QuickAddCustomerModal from '@/components/customers/QuickAddCustomerModal'
import InventoryAutocomplete from '@/components/inventory/InventoryAutocomplete'
import ProductsAutocomplete from '@/components/products/ProductsAutocomplete'

// Typ dla pozycji oferty
interface QuoteItem {
  id: string
  part_name: string
  material: string
  quantity: number
  complexity: 'simple' | 'medium' | 'complex'
  unit_price: number | null
  total_price: number | null
  pricing_result: UnifiedPricingResult | null
  isCalculating: boolean
}

// Generuj unikalne ID
const generateId = () => Math.random().toString(36).substr(2, 9)

// Domyślna pozycja
const createEmptyItem = (): QuoteItem => ({
  id: generateId(),
  part_name: '',
  material: '',
  quantity: 1,
  complexity: 'medium',
  unit_price: null,
  total_price: null,
  pricing_result: null,
  isCalculating: false,
})

export default function AddQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlCustomerId = searchParams.get('customer_id')

  const [companyId, setCompanyId] = useState<string>('')
  const [userId, setUserId] = useState<number>(0)

  // Customer state
  const [customerId, setCustomerId] = useState<string>(urlCustomerId || '')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [pendingCustomerName, setPendingCustomerName] = useState('')

  // Quote details
  const [deadline, setDeadline] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Items state
  const [items, setItems] = useState<QuoteItem[]>([createEmptyItem()])

  // Submit state
  const [isCreating, setIsCreating] = useState(false)

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

  // Pre-fetch customer if customer_id in URL
  useEffect(() => {
    async function fetchCustomerFromUrl() {
      if (!urlCustomerId) return

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', urlCustomerId)
        .single()

      if (customer) {
        setSelectedCustomer(customer)
        setCustomerId(customer.id)
      }
    }

    fetchCustomerFromUrl()
  }, [urlCustomerId])

  // Add new item
  const addItem = () => {
    setItems([...items, createEmptyItem()])
  }

  // Remove item
  const removeItem = (id: string) => {
    if (items.length === 1) {
      toast.error('Oferta musi mieć przynajmniej jedną pozycję')
      return
    }
    setItems(items.filter(item => item.id !== id))
  }

  // Update item field
  const updateItem = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Calculate pricing for single item
  const calculateItemPricing = async (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    if (!item.part_name || !item.material || item.quantity <= 0) {
      toast.error('Wypełnij nazwę części, materiał i ilość')
      return
    }

    // Set calculating state
    setItems(items.map(i =>
      i.id === itemId ? { ...i, isCalculating: true } : i
    ))

    try {
      const response = await fetch('/api/quotes/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material: item.material,
          quantity: item.quantity,
          partName: item.part_name,
          complexity: item.complexity,
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się obliczyć ceny')
      }

      // Update item with pricing
      setItems(items.map(i =>
        i.id === itemId ? {
          ...i,
          pricing_result: result,
          unit_price: result.recommended.price / item.quantity,
          total_price: result.recommended.price,
          isCalculating: false,
        } : i
      ))

      toast.success('Wycena gotowa!')

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd kalkulacji')
      logger.error('Pricing calculation failed', { error })
      setItems(items.map(i =>
        i.id === itemId ? { ...i, isCalculating: false } : i
      ))
    }
  }

  // Calculate total
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0)
  }

  // Check if all items have pricing
  const allItemsHavePricing = () => {
    return items.every(item => item.total_price !== null && item.total_price > 0)
  }

  // Customer handlers
  const handleCustomerChange = (id: string | null) => {
    setCustomerId(id || '')
  }

  const handleCreateNewCustomer = (name: string) => {
    setPendingCustomerName(name)
    setIsQuickAddOpen(true)
  }

  const handleCustomerCreated = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerId(customer.id)
    setIsQuickAddOpen(false)
    toast.success(`Klient "${customer.name}" został dodany!`)
  }

  // Create quote
  const handleCreateQuote = async () => {
    if (!customerId) {
      toast.error('Wybierz klienta')
      return
    }

    if (!allItemsHavePricing()) {
      toast.error('Oblicz cenę dla wszystkich pozycji')
      return
    }

    setIsCreating(true)
    const loadingToast = toast.loading('Tworzę ofertę...')

    try {
      // Get customer details
      const { data: customer } = await supabase
        .from('customers')
        .select('name, email, phone')
        .eq('id', customerId)
        .single()

      // Generate quote number
      const year = new Date().getFullYear()
      const { count } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', `${year}-01-01`)

      const quoteNumber = `QT-${year}-${String((count || 0) + 1).padStart(4, '0')}`

      // Create main quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: quoteNumber,
          company_id: companyId,
          created_by: userId,
          customer_id: customerId,
          customer_name: customer?.name || '',
          customer_email: customer?.email || null,
          customer_phone: customer?.phone || null,
          // For multi-item quotes, main fields are summary
          part_name: items.length === 1 ? items[0].part_name : `${items.length} pozycji`,
          material: items.length === 1 ? items[0].material : 'Różne',
          quantity: items.reduce((sum, i) => sum + i.quantity, 0),
          total_price: calculateTotal(),
          deadline: deadline || null,
          notes: notes || null,
          status: 'draft',
          pricing_method: 'multi_item',
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Create quote items
      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(
          items.map(item => ({
            quote_id: quote.id,
            part_name: item.part_name,
            material: item.material,
            quantity: item.quantity,
            complexity: item.complexity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            notes: item.pricing_result ? `Metoda: ${item.pricing_result.recommended.method}, Pewność: ${item.pricing_result.recommended.confidence}%` : null,
          }))
        )

      if (itemsError) throw itemsError

      toast.dismiss(loadingToast)
      toast.success('Oferta utworzona!')
      router.push(`/quotes/${quote.id}`)

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(error instanceof Error ? error.message : 'Błąd tworzenia oferty')
      logger.error('Quote creation failed', { error })
    } finally {
      setIsCreating(false)
    }
  }

  const complexityOptions = [
    { value: 'simple', label: 'Prosta (1-2h)' },
    { value: 'medium', label: 'Średnia (3-6h)' },
    { value: 'complex', label: 'Złożona (8-20h)' },
  ]

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              📋 Nowa Oferta
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Dodaj wiele pozycji i wyceniaj każdą z osobna
            </p>
          </div>

          {/* Customer Section */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Klient
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Wybierz klienta *
                </label>
                <CustomerSelect
                  value={customerId}
                  onChange={handleCustomerChange}
                  onCreateNew={handleCreateNewCustomer}
                />
              </div>
              <div>
                <DatePicker
                  label="Termin realizacji"
                  value={deadline}
                  onChange={setDeadline}
                  placeholder="Wybierz termin..."
                  minDate={new Date()}
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Pozycje oferty
            </h2>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-900 dark:text-white font-semibold">
                      Pozycja {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.total_price !== null && (
                        <span className="text-green-600 dark:text-green-400 font-bold">
                          {item.total_price.toFixed(2)} PLN
                        </span>
                      )}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium"
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Part Name */}
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
                        Nazwa części *
                      </label>
                      <ProductsAutocomplete
                        value={item.part_name}
                        onChange={(value) => updateItem(item.id, 'part_name', value)}
                        categoryFilter="finished_good"
                        placeholder="Wybierz wyrób gotowy..."
                        allowCustom={true}
                      />
                    </div>

                    {/* Material */}
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
                        Materiał *
                      </label>
                      <InventoryAutocomplete
                        value={item.material}
                        onChange={(value) => updateItem(item.id, 'material', value)}
                        categoryFilter="raw_material"
                        placeholder="Wybierz materiał..."
                        allowCustom={true}
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
                        Ilość *
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    {/* Complexity */}
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
                        Złożoność
                      </label>
                      <select
                        value={item.complexity}
                        onChange={(e) => updateItem(item.id, 'complexity', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      >
                        {complexityOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calculate Button */}
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => calculateItemPricing(item.id)}
                      disabled={item.isCalculating}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {item.isCalculating ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Obliczam...
                        </>
                      ) : item.total_price !== null ? (
                        '🔄 Przelicz cenę'
                      ) : (
                        '🧮 Oblicz cenę'
                      )}
                    </Button>
                  </div>

                  {/* Pricing Result */}
                  {item.pricing_result && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Metoda:</span> {item.pricing_result.recommended.method === 'rule_based' ? 'Kalkulator' : item.pricing_result.recommended.method === 'historical' ? 'Historia' : 'Hybrid'}
                          <span className="mx-2">|</span>
                          <span className="font-medium">Pewność:</span> {item.pricing_result.recommended.confidence}%
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {item.unit_price?.toFixed(2)} PLN/szt
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Item Button */}
            <button
              type="button"
              onClick={addItem}
              className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm border-2 border-dashed border-blue-400 hover:border-blue-500"
            >
              + Dodaj kolejną pozycję
            </button>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6 shadow-lg">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Uwagi (opcjonalnie)
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Dodatkowe informacje dla klienta..."
              className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Summary & Submit */}
          <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-2 border-green-500 rounded-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Podsumowanie
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {items.length} {items.length === 1 ? 'pozycja' : items.length < 5 ? 'pozycje' : 'pozycji'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 dark:text-slate-400">Suma</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {calculateTotal().toFixed(2)} PLN
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleCreateQuote}
              disabled={isCreating || !allItemsHavePricing() || !customerId}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 text-lg"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Tworzę ofertę...
                </>
              ) : (
                '✅ Utwórz ofertę'
              )}
            </Button>

            {!allItemsHavePricing() && items.some(i => i.part_name && i.material) && (
              <p className="text-center text-amber-600 dark:text-amber-400 mt-2 text-sm">
                Oblicz cenę dla wszystkich pozycji przed utworzeniem oferty
              </p>
            )}
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
      </div>
    </AppLayout>
  )
}
