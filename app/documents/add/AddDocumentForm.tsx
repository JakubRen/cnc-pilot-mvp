'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { sanitizeText } from '@/lib/sanitization'
import InventoryAutocomplete from '@/components/form/InventoryAutocomplete'
import ProductAutocomplete from '@/components/form/ProductAutocomplete'
import CustomerAutocomplete from '@/components/form/CustomerAutocomplete'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'

interface InventoryItem {
  id: string
  sku: string
  name: string
  quantity: number
  unit: string
}

interface Product {
  id: string
  sku: string
  name: string
  category: string | null
  unit: string | null
}

interface Customer {
  id: string
  name: string
  type: 'client' | 'supplier' | 'cooperator'
}

interface DocumentItem {
  inventory_id: string  // For RW/WZ
  product_id: string    // For PW
  quantity: number
  notes: string
}

interface Props {
  inventoryItems: InventoryItem[]
  products: Product[]
  customers: Customer[]
  userId: number
  companyId: string
}

export default function AddDocumentForm({ inventoryItems, products, customers, userId, companyId }: Props) {
  const router = useRouter()
  const { confirm, ConfirmDialog } = useConfirmation()

  // Helper: Generate fallback document number if RPC fails
  const generateFallbackDocNumber = (type: 'PW' | 'RW' | 'WZ'): string => {
    const year = new Date().getFullYear()
    const timestamp = Date.now().toString().slice(-6) // Last 6 digits of timestamp
    return `${type}/${timestamp}/${year}`
  }

  // Helper: Get document number (with fallback)
  const getDocumentNumber = async (type: 'PW' | 'RW' | 'WZ'): Promise<string> => {
    try {
      const { data: docNumber, error } = await supabase.rpc('generate_document_number', {
        p_company_id: companyId,
        p_document_type: type
      })

      if (error || !docNumber) {
        logger.error('RPC generate_document_number failed, using fallback', { error })
        return generateFallbackDocNumber(type)
      }

      return docNumber
    } catch (err) {
      logger.error('Exception calling generate_document_number', { error: err })
      return generateFallbackDocNumber(type)
    }
  }

  // Form state
  const [documentType, setDocumentType] = useState<'PW' | 'RW' | 'WZ'>('PW')
  const [contractor, setContractor] = useState('')
  const [description, setDescription] = useState('')

  // Items state - dynamiczna lista pozycji
  const [items, setItems] = useState<DocumentItem[]>([
    { inventory_id: '', product_id: '', quantity: 0, notes: '' }
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dodaj nową pozycję
  const addItem = () => {
    setItems([...items, { inventory_id: '', product_id: '', quantity: 0, notes: '' }])
  }

  // Usuń pozycję
  const removeItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Dokument musi mieć przynajmniej jedną pozycję')
      return
    }
    setItems(items.filter((_, i) => i !== index))
  }

  // Update pozycji
  const updateItem = (index: number, field: keyof DocumentItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  // Walidacja
  const validate = (): boolean => {
    if (!contractor.trim()) {
      toast.error('Podaj nazwę kontrahenta')
      return false
    }

    for (let i = 0; i < items.length; i++) {
      // Dla PW sprawdzamy product_id, dla RW/WZ sprawdzamy inventory_id
      if (documentType === 'PW') {
        if (!items[i].product_id) {
          toast.error(`Wybierz produkt dla pozycji ${i + 1}`)
          return false
        }
      } else {
        if (!items[i].inventory_id) {
          toast.error(`Wybierz komponent dla pozycji ${i + 1}`)
          return false
        }
      }

      if (items[i].quantity <= 0) {
        toast.error(`Podaj ilość dla pozycji ${i + 1}`)
        return false
      }

      // Sprawdź czy wystarczy towaru (tylko dla RW/WZ)
      if (documentType === 'RW' || documentType === 'WZ') {
        const inventoryItem = inventoryItems.find(item => item.id === items[i].inventory_id)
        if (inventoryItem && items[i].quantity > inventoryItem.quantity) {
          toast.error(`Za mało ${inventoryItem.name} w magazynie (dostępne: ${inventoryItem.quantity} ${inventoryItem.unit})`)
          return false
        }
      }
    }

    return true
  }

  // Helper: Dla PW - znajdź lub utwórz pozycję w inventory dla produktu
  const getOrCreateInventoryForProduct = async (productId: string): Promise<string> => {
    const product = products.find(p => p.id === productId)
    if (!product) throw new Error('Produkt nie znaleziony')

    // Sprawdź czy istnieje już pozycja w inventory z tym SKU
    const { data: existingItem } = await supabase
      .from('inventory')
      .select('id')
      .eq('company_id', companyId)
      .eq('sku', product.sku)
      .single()

    if (existingItem) {
      return existingItem.id
    }

    // Utwórz nową pozycję w inventory
    const { data: newItem, error } = await supabase
      .from('inventory')
      .insert({
        company_id: companyId,
        sku: product.sku,
        name: product.name,
        category: product.category || 'part',
        unit: product.unit || 'szt',
        quantity: 0, // Początkowa ilość 0, PW ją zwiększy
        low_stock_threshold: 0,
        created_by: userId
      })
      .select('id')
      .single()

    if (error) throw error
    return newItem.id
  }

  // Submit - Zapisz jako szkic
  const handleSaveDraft = async () => {
    if (!validate()) return

    setIsSubmitting(true)
    const loadingToast = toast.loading('Zapisuję szkic...')

    try {
      // Generuj numer dokumentu (z fallbackiem)
      const docNumber = await getDocumentNumber(documentType)

      // Sanitize user inputs to prevent XSS attacks
      const sanitizedContractor = sanitizeText(contractor)
      const sanitizedDescription = description ? sanitizeText(description) : null

      // Wstaw dokument
      const { data: doc, error: docError } = await supabase
        .from('warehouse_documents')
        .insert({
          company_id: companyId,
          document_type: documentType,
          document_number: docNumber,
          contractor: sanitizedContractor,
          description: sanitizedDescription,
          status: 'draft',
          created_by: userId
        })
        .select()
        .single()

      if (docError) throw docError

      // Dla PW w szkicu: też znajdź/utwórz inventory entries
      let documentItems: { inventory_id: string; quantity: number; notes: string | null }[] = []

      if (documentType === 'PW') {
        for (const item of items) {
          const inventoryId = await getOrCreateInventoryForProduct(item.product_id)
          documentItems.push({
            inventory_id: inventoryId,
            quantity: item.quantity,
            notes: item.notes ? sanitizeText(item.notes) : null
          })
        }
      } else {
        documentItems = items.map(item => ({
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          notes: item.notes ? sanitizeText(item.notes) : null
        }))
      }

      // Wstaw pozycje
      const { error: itemsError } = await supabase
        .from('warehouse_document_items')
        .insert(
          documentItems.map(item => ({
            document_id: doc.id,
            ...item
          }))
        )

      if (itemsError) throw itemsError

      toast.dismiss(loadingToast)
      toast.success('Szkic zapisany!')
      router.push('/documents')
      router.refresh()

    } catch (error) {
      toast.dismiss(loadingToast)
      const errorMessage = (error as Error).message || 'Nieznany błąd'
      toast.error('Błąd zapisu: ' + errorMessage, { duration: 10000 })
      logger.error('Document draft save error', { error, errorMessage })
      console.error('[AddDocumentForm] Draft save error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit - Zatwierdź (wpływa na stany)
  const handleConfirm = async () => {
    if (!validate()) return

    const confirmed = await confirm({
      title: 'Zatwierdzić dokument?',
      description: `Czy na pewno chcesz zatwierdzić dokument ${documentType}? Spowoduje to automatyczną aktualizację stanów magazynowych! Pozycji: ${items.length}`,
      confirmText: 'Zatwierdź',
      cancelText: 'Anuluj',
      variant: 'warning',
    })

    if (!confirmed) return

    setIsSubmitting(true)
    const loadingToast = toast.loading('Tworzę i zatwierdzam dokument...')

    try {
      // Generuj numer dokumentu (z fallbackiem)
      const docNumber = await getDocumentNumber(documentType)

      // Sanitize user inputs to prevent XSS attacks
      const sanitizedContractor = sanitizeText(contractor)
      const sanitizedDescription = description ? sanitizeText(description) : null

      // Dla PW: Najpierw znajdź/utwórz pozycje w inventory
      let documentItems: { inventory_id: string; quantity: number; notes: string | null }[] = []

      if (documentType === 'PW') {
        // Dla każdego produktu znajdź lub utwórz inventory entry
        for (const item of items) {
          const inventoryId = await getOrCreateInventoryForProduct(item.product_id)
          documentItems.push({
            inventory_id: inventoryId,
            quantity: item.quantity,
            notes: item.notes ? sanitizeText(item.notes) : null
          })
        }
      } else {
        // Dla RW/WZ używamy bezpośrednio inventory_id
        documentItems = items.map(item => ({
          inventory_id: item.inventory_id,
          quantity: item.quantity,
          notes: item.notes ? sanitizeText(item.notes) : null
        }))
      }

      // KROK 1: Wstaw dokument jako DRAFT (pozycje jeszcze nie istnieją)
      const { data: doc, error: docError } = await supabase
        .from('warehouse_documents')
        .insert({
          company_id: companyId,
          document_type: documentType,
          document_number: docNumber,
          contractor: sanitizedContractor,
          description: sanitizedDescription,
          status: 'draft', // Najpierw draft
          created_by: userId
        })
        .select()
        .single()

      if (docError) throw docError

      // KROK 2: Wstaw pozycje dokumentu
      const { error: itemsError } = await supabase
        .from('warehouse_document_items')
        .insert(
          documentItems.map(item => ({
            document_id: doc.id,
            ...item
          }))
        )

      if (itemsError) throw itemsError

      // KROK 3: Zmień status na CONFIRMED → trigger zaktualizuje stany magazynowe
      const { error: confirmError } = await supabase
        .from('warehouse_documents')
        .update({ status: 'confirmed' })
        .eq('id', doc.id)

      if (confirmError) throw confirmError

      toast.dismiss(loadingToast)
      toast.success('Dokument zatwierdzony! Stany magazynowe zaktualizowane.')
      router.push('/documents')
      router.refresh()

    } catch (error) {
      toast.dismiss(loadingToast)
      const errorMessage = (error as Error).message || 'Nieznany błąd'
      toast.error('Błąd zapisu: ' + errorMessage, { duration: 10000 })
      logger.error('Document confirm error', { error, errorMessage })
      console.error('[AddDocumentForm] Confirm error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ConfirmDialog />
      <form className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 space-y-6">
        {/* Typ dokumentu */}
      <div>
        <label htmlFor="document_type" className="block text-slate-700 dark:text-slate-300 mb-3 font-medium">
          Typ Dokumentu *
        </label>
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: 'PW', label: 'PW - Przyjęcie', color: 'green' },
            { value: 'RW', label: 'RW - Rozchód', color: 'blue' },
            { value: 'WZ', label: 'WZ - Wydanie', color: 'orange' }
          ].map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setDocumentType(type.value as 'PW' | 'RW' | 'WZ')}
              className={`px-4 py-3 rounded-lg border-2 font-semibold transition ${
                documentType === type.value
                  ? `bg-${type.color}-600 border-${type.color}-500 text-white`
                  : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kontrahent */}
      <div>
        <label htmlFor="contractor" className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
          Kontrahent *
        </label>
        <CustomerAutocomplete
          value={contractor}
          onChange={setContractor}
          customers={customers}
          placeholder="Wybierz lub wpisz nazwę kontrahenta..."
        />
      </div>

      {/* Opis */}
      <div>
        <label htmlFor="description" className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
          Opis (opcjonalnie)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          placeholder="Dodatkowe informacje o dokumencie..."
        />
      </div>

      {/* Pozycje dokumentu */}
      <div>
        <div className="mb-4">
          <label className="block text-slate-700 dark:text-slate-300 font-medium">
            Pozycje Dokumentu *
          </label>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            // Dla PW szukamy w products, dla RW/WZ w inventory
            const selectedProduct = documentType === 'PW'
              ? products.find(p => p.id === item.product_id)
              : null
            const selectedInventoryItem = documentType !== 'PW'
              ? inventoryItems.find(inv => inv.id === item.inventory_id)
              : null
            const selectedUnit = selectedProduct?.unit || selectedInventoryItem?.unit || 'szt'

            return (
              <div key={index} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-slate-900 dark:text-white font-semibold">Pozycja {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium"
                    >
                      Usuń
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Produkt (PW) lub Komponent magazynowy (RW/WZ) */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
                      {documentType === 'PW' ? 'Produkt *' : 'Komponent *'}
                    </label>
                    {documentType === 'PW' ? (
                      <ProductAutocomplete
                        value={item.product_id}
                        onChange={(value) => updateItem(index, 'product_id', value)}
                        products={products}
                        placeholder="Wyszukaj produkt do przyjęcia..."
                      />
                    ) : (
                      <InventoryAutocomplete
                        value={item.inventory_id}
                        onChange={(value) => updateItem(index, 'inventory_id', value)}
                        items={inventoryItems}
                        placeholder="Wyszukaj komponent..."
                      />
                    )}
                  </div>

                  {/* Ilość */}
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">
                      Ilość * ({selectedUnit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                    />
                    {selectedInventoryItem && (
                      <p className="text-slate-500 text-xs mt-1">
                        Dostępne: {selectedInventoryItem.quantity} {selectedInventoryItem.unit}
                      </p>
                    )}
                  </div>

                  {/* Notatka */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 dark:text-slate-400 mb-2 text-sm">Notatka (opcjonalnie)</label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Dodatkowe informacje..."
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Przycisk dodaj pozycję - na dole listy */}
        <button
          type="button"
          onClick={addItem}
          className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm border-2 border-dashed border-blue-400 hover:border-blue-500"
        >
          + Dodaj kolejną pozycję
        </button>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg"
        >
          {isSubmitting ? 'Zapisuję...' : '✓ Zatwierdź i Zapisz'}
        </button>
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
        >
          Zapisz jako Szkic
        </button>
        <button
          type="button"
          onClick={() => router.push('/documents')}
          className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 font-semibold transition"
        >
          Anuluj
        </button>
      </div>

        {/* Info */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-sm text-blue-200">
          <p className="font-semibold mb-2">ℹ️ Informacja:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-300">
            <li><strong>Zapisz jako Szkic:</strong> Dokument nie wpłynie na stany magazynowe (możesz edytować)</li>
            <li><strong>Zatwierdź i Zapisz:</strong> Automatycznie zaktualizuje stany magazynowe (nieodwracalne)</li>
            <li><strong>PW:</strong> Dodaje do magazynu (+)</li>
            <li><strong>RW/WZ:</strong> Odejmuje z magazynu (-)</li>
          </ul>
        </div>
      </form>
    </>
  )
}
