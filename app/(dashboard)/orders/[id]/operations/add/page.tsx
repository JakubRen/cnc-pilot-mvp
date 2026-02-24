'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import OperationForm from '@/components/operations/OperationForm'
import DrawingUpload from '@/components/orders/DrawingUpload'
import {
  OperationFormData,
  Complexity,
  complexityLabels,
  formatCost,
  formatDuration,
  calculateOperationCost
} from '@/types/operations'
import Link from 'next/link'
import { useUserProfile } from '@/hooks/useUserProfile'

export default function AddOrderItemPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const { profile } = useUserProfile()

  const companyId = profile?.company_id || ''
  const userId = profile?.id || 0
  const [orderNumber, setOrderNumber] = useState<string>('')

  // Form state
  const [partName, setPartName] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [drawingFileId, setDrawingFileId] = useState<string | null>(null)
  const [length, setLength] = useState<number | undefined>(undefined)
  const [width, setWidth] = useState<number | undefined>(undefined)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const [material, setMaterial] = useState('')
  const [complexity, setComplexity] = useState<Complexity>('medium')
  const [notes, setNotes] = useState('')
  const [operations, setOperations] = useState<OperationFormData[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load order info when profile is ready
  useEffect(() => {
    async function loadOrder() {
      if (!profile?.company_id) return

      const { data: order } = await supabase
        .from('orders')
        .select('order_number, company_id')
        .eq('id', orderId)
        .single()

      if (!order) {
        toast.error('Nie znaleziono zlecenia')
        router.push('/orders')
        return
      }

      // Verify company_id matches
      if (order.company_id !== profile.company_id) {
        toast.error('Brak dostępu do tego zlecenia')
        router.push('/orders')
        return
      }

      setOrderNumber(order.order_number)
    }

    loadOrder()
  }, [orderId, router, profile?.company_id])

  // Validation
  const validate = (): boolean => {
    if (!partName.trim()) {
      toast.error('Podaj nazwę części')
      return false
    }

    if (quantity <= 0) {
      toast.error('Ilość musi być większa od 0')
      return false
    }

    if (operations.length === 0) {
      toast.error('Dodaj przynajmniej jedną operację')
      return false
    }

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]
      if (!op.operation_name.trim()) {
        toast.error(`Podaj nazwę dla operacji #${i + 1}`)
        return false
      }
      if (op.setup_time_minutes < 0 || op.run_time_per_unit_minutes < 0) {
        toast.error(`Czasy dla operacji #${i + 1} muszą być >= 0`)
        return false
      }
      if (op.hourly_rate <= 0) {
        toast.error(`Stawka dla operacji #${i + 1} musi być > 0`)
        return false
      }
    }

    return true
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)
    const loadingToast = toast.loading('Dodaję pozycję z operacjami...')

    try {
      // 1. Create order_item
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          part_name: partName,
          quantity: quantity,
          drawing_file_id: drawingFileId,
          length: length,
          width: width,
          height: height,
          material: material || null,
          complexity: complexity,
          notes: notes || null
        })
        .select()
        .single()

      if (itemError) throw itemError

      // 2. Create operations for this order_item
      const operationsToInsert = operations.map((op, index) => ({
        order_item_id: orderItem.id,
        operation_number: index + 1,
        operation_type: op.operation_type,
        operation_name: op.operation_name,
        description: op.description || null,
        machine_id: op.machine_id || null,
        setup_time_minutes: op.setup_time_minutes,
        run_time_per_unit_minutes: op.run_time_per_unit_minutes,
        hourly_rate: op.hourly_rate,
        status: 'pending'
      }))

      const { error: operationsError } = await supabase
        .from('operations')
        .insert(operationsToInsert)

      if (operationsError) throw operationsError

      toast.dismiss(loadingToast)
      toast.success('Pozycja z operacjami dodana!')
      router.push(`/orders/${orderId}`)
      router.refresh()

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd: ' + (error as Error).message)
      logger.error('Error adding operation', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate total cost
  const totalCost = operations.reduce((sum, op) => {
    const costs = calculateOperationCost(
      op.setup_time_minutes,
      op.run_time_per_unit_minutes,
      quantity,
      op.hourly_rate
    )
    return sum + costs.totalCost
  }, 0)

  const totalTime = operations.reduce((sum, op) => {
    return sum + op.setup_time_minutes + (op.run_time_per_unit_minutes * quantity)
  }, 0)

  if (!companyId) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Dodaj Pozycję do Zlecenia
            </h1>
            <p className="text-muted-foreground">
              Zlecenie: <strong>#{orderNumber}</strong>
            </p>
          </div>
          <Link
            href={`/orders/${orderId}`}
            className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-accent transition"
          >
            Anuluj
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-card p-8 rounded-lg border border-border space-y-6">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-3">
              📦 Informacje o pozycji
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part Name */}
              <div className="md:col-span-2">
                <label className="block text-foreground mb-2 font-medium">
                  Nazwa części *
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="np. Flansza Ø100, Wałek Ø50x300"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-foreground mb-2 font-medium">
                  Ilość sztuk *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                  required
                />
              </div>

              {/* Material */}
              <div>
                <label className="block text-foreground mb-2 font-medium">
                  Materiał
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="np. Stal nierdzewna, Aluminium"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* Complexity */}
              <div>
                <label className="block text-foreground mb-2 font-medium">
                  Złożoność
                </label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value as Complexity)}
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                >
                  {Object.entries(complexityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-foreground mb-2 font-medium">
                  Wymiary (opcjonalnie)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={length || ''}
                    onChange={(e) => setLength(parseFloat(e.target.value) || undefined)}
                    placeholder="D (mm)"
                    className="w-1/3 px-3 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={width || ''}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || undefined)}
                    placeholder="S (mm)"
                    className="w-1/3 px-3 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={height || ''}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || undefined)}
                    placeholder="W (mm)"
                    className="w-1/3 px-3 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-foreground mb-2 font-medium">
                  Notatki
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Dodatkowe informacje o pozycji..."
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Drawing Upload */}
          <div className="bg-card p-8 rounded-lg border border-border">
            <DrawingUpload
              value={drawingFileId}
              onChange={setDrawingFileId}
              companyId={companyId}
              userId={userId}
            />
          </div>

          {/* Operations */}
          <div className="bg-card p-8 rounded-lg border border-border">
            <OperationForm
              operations={operations}
              onChange={setOperations}
              quantity={quantity}
              complexity={complexity}
              companyId={companyId}
            />
          </div>

          {/* Summary Card */}
          {operations.length > 0 && (
            <div className="bg-gradient-to-r from-green-900/30 to-violet-900/30 border-2 border-green-500/50 rounded-lg p-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                💰 Podsumowanie pozycji
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-green-300 mb-2">Część</p>
                  <p className="text-xl font-bold text-white">{partName || '---'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-green-300 mb-2">Ilość</p>
                  <p className="text-xl font-bold text-white">{quantity} szt.</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-green-300 mb-2">Czas całkowity</p>
                  <p className="text-xl font-bold text-white">{formatDuration(totalTime)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-green-300 mb-2">Koszt całkowity</p>
                  <p className="text-3xl font-bold text-green-400">{formatCost(totalCost)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || operations.length === 0}
              className="flex-1 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg text-lg"
            >
              {isSubmitting ? 'Zapisuję...' : '✓ Dodaj Pozycję'}
            </button>
            <Link
              href={`/orders/${orderId}`}
              className="px-8 py-4 bg-muted text-foreground rounded-lg hover:bg-accent font-semibold transition"
            >
              Anuluj
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
