'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface InventoryItem {
  id: string
  sku: string
  name: string
  quantity: number
  unit: string
}

interface DocumentItem {
  inventory_id: string
  quantity: number
  notes: string
}

interface Document {
  id: string
  document_type: 'PW' | 'RW' | 'WZ'
  document_number: string
  contractor: string
  description: string
  status: string
}

interface ExistingItem {
  id: string
  inventory_id: string
  quantity: number
  notes: string | null
  inventory: InventoryItem | null
}

interface Props {
  documentId: string
  document: Document
  items: ExistingItem[]
  inventoryItems: InventoryItem[]
  companyId: string
}

export default function EditDocumentForm({ documentId, document, items: existingItems, inventoryItems, companyId }: Props) {
  const router = useRouter()

  // Form state
  const [documentType, setDocumentType] = useState<'PW' | 'RW' | 'WZ'>(document.document_type)
  const [contractor, setContractor] = useState(document.contractor)
  const [description, setDescription] = useState(document.description || '')

  // Items state
  const [items, setItems] = useState<DocumentItem[]>([
    { inventory_id: '', quantity: 0, notes: '' }
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill form with existing data
  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setItems(existingItems.map(item => ({
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        notes: item.notes || ''
      })))
    }
  }, [existingItems])

  // Dodaj nową pozycję
  const addItem = () => {
    setItems([...items, { inventory_id: '', quantity: 0, notes: '' }])
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
      if (!items[i].inventory_id) {
        toast.error(`Wybierz komponent dla pozycji ${i + 1}`)
        return false
      }
      if (items[i].quantity <= 0) {
        toast.error(`Podaj ilość dla pozycji ${i + 1}`)
        return false
      }

      // Sprawdź czy wystarczy towaru (dla RW/WZ)
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

  // Submit - Update draft
  const handleUpdate = async () => {
    if (!validate()) return

    setIsSubmitting(true)
    const loadingToast = toast.loading('Aktualizuję dokument...')

    try {
      // Update document
      const { error: docError } = await supabase
        .from('warehouse_documents')
        .update({
          document_type: documentType,
          contractor,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('company_id', companyId) // Security

      if (docError) throw docError

      // Delete old items
      const { error: deleteError } = await supabase
        .from('warehouse_document_items')
        .delete()
        .eq('document_id', documentId)

      if (deleteError) throw deleteError

      // Insert new items
      const { error: itemsError } = await supabase
        .from('warehouse_document_items')
        .insert(
          items.map(item => ({
            document_id: documentId,
            inventory_id: item.inventory_id,
            quantity: item.quantity,
            notes: item.notes || null
          }))
        )

      if (itemsError) throw itemsError

      toast.dismiss(loadingToast)
      toast.success('Dokument zaktualizowany!')
      router.push(`/documents/${documentId}`)
      router.refresh()

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd aktualizacji: ' + (error as Error).message)
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit - Confirm (update status to confirmed)
  const handleConfirm = async () => {
    if (!validate()) return

    const confirmed = confirm(
      `Czy na pewno chcesz zatwierdzić dokument ${documentType}?\n\n` +
      `Spowoduje to automatyczną aktualizację stanów magazynowych!\n` +
      `Pozycji: ${items.length}`
    )

    if (!confirmed) return

    setIsSubmitting(true)
    const loadingToast = toast.loading('Aktualizuję i zatwierdzam dokument...')

    try {
      // Update document
      const { error: docError } = await supabase
        .from('warehouse_documents')
        .update({
          document_type: documentType,
          contractor,
          description,
          status: 'confirmed', // Change to confirmed → trigger will update inventory
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('company_id', companyId)

      if (docError) throw docError

      // Delete old items
      const { error: deleteError } = await supabase
        .from('warehouse_document_items')
        .delete()
        .eq('document_id', documentId)

      if (deleteError) throw deleteError

      // Insert new items
      const { error: itemsError } = await supabase
        .from('warehouse_document_items')
        .insert(
          items.map(item => ({
            document_id: documentId,
            inventory_id: item.inventory_id,
            quantity: item.quantity,
            notes: item.notes || null
          }))
        )

      if (itemsError) throw itemsError

      toast.dismiss(loadingToast)
      toast.success('Dokument zatwierdzony! Stany magazynowe zaktualizowane.')
      router.push(`/documents/${documentId}`)
      router.refresh()

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd zapisu: ' + (error as Error).message)
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="bg-slate-800 p-8 rounded-lg border border-slate-700 space-y-6">
      {/* Typ dokumentu */}
      <div>
        <label htmlFor="document_type" className="block text-slate-300 mb-3 font-medium">
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
                  : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kontrahent */}
      <div>
        <label htmlFor="contractor" className="block text-slate-300 mb-2 font-medium">
          Kontrahent *
        </label>
        <input
          id="contractor"
          type="text"
          value={contractor}
          onChange={(e) => setContractor(e.target.value)}
          className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          placeholder="Nazwa firmy lub dostawcy"
        />
      </div>

      {/* Opis */}
      <div>
        <label htmlFor="description" className="block text-slate-300 mb-2 font-medium">
          Opis (opcjonalnie)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          placeholder="Dodatkowe informacje o dokumencie..."
        />
      </div>

      {/* Pozycje dokumentu */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <label className="block text-slate-300 font-medium">
            Pozycje Dokumentu *
          </label>
          <button
            type="button"
            onClick={addItem}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
          >
            + Dodaj Pozycję
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const selectedItem = inventoryItems.find(inv => inv.id === item.inventory_id)

            return (
              <div key={index} className="bg-slate-900 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white font-semibold">Pozycja {index + 1}</span>
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
                  {/* Komponent */}
                  <div>
                    <label className="block text-slate-400 mb-2 text-sm">Komponent *</label>
                    <select
                      value={item.inventory_id}
                      onChange={(e) => updateItem(index, 'inventory_id', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Wybierz komponent...</option>
                      {inventoryItems.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.sku} - {inv.name} (Dostępne: {inv.quantity} {inv.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ilość */}
                  <div>
                    <label className="block text-slate-400 mb-2 text-sm">
                      Ilość * {selectedItem && `(${selectedItem.unit})`}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                      placeholder="0"
                    />
                    {selectedItem && (
                      <p className="text-slate-500 text-xs mt-1">
                        Dostępne: {selectedItem.quantity} {selectedItem.unit}
                      </p>
                    )}
                  </div>

                  {/* Notatka */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-2 text-sm">Notatka (opcjonalnie)</label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white focus:border-blue-500 focus:outline-none"
                      placeholder="Dodatkowe informacje..."
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
          onClick={handleUpdate}
          disabled={isSubmitting}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition"
        >
          Zapisz jako Szkic
        </button>
        <button
          type="button"
          onClick={() => router.push(`/documents/${documentId}`)}
          className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-semibold transition"
        >
          Anuluj
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-sm text-blue-200">
        <p className="font-semibold mb-2">ℹ️ Informacja:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-300">
          <li><strong>Zapisz jako Szkic:</strong> Dokument pozostanie szkicem (możesz edytować dalej)</li>
          <li><strong>Zatwierdź i Zapisz:</strong> Automatycznie zaktualizuje stany magazynowe (nieodwracalne)</li>
          <li><strong>PW:</strong> Dodaje do magazynu (+)</li>
          <li><strong>RW/WZ:</strong> Odejmuje z magazynu (-)</li>
        </ul>
      </div>
    </form>
  )
}
