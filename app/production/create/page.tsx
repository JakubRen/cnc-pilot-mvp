'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import OperationForm from '@/components/operations/OperationForm'
import DrawingUpload from '@/components/orders/DrawingUpload'
import AppLayout from '@/components/layout/AppLayout'
import {
  OperationFormData,
  Complexity,
  complexityLabels,
  formatCost,
  formatDuration,
  calculateOperationCost
} from '@/types/operations'
import Link from 'next/link'

export default function CreateProductionPlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')

  const [companyId, setCompanyId] = useState<string>('')
  const [userId, setUserId] = useState<number>(0)
  const [orderNumber, setOrderNumber] = useState<string>('')
  const [customerName, setCustomerName] = useState<string>('')

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

  // Load user and order info
  useEffect(() => {
    async function loadUserAndOrder() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) {
        toast.error('Nie znaleziono profilu użytkownika')
        return
      }

      setCompanyId(userProfile.company_id)
      setUserId(userProfile.id)

      // If order_id provided, load order details
      if (orderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('order_number, customer_name, company_id, part_name, quantity, material')
          .eq('id', orderId)
          .single()

        if (!order) {
          toast.error('Nie znaleziono zlecenia')
          router.push('/orders')
          return
        }

        // Verify company_id matches
        if (order.company_id !== userProfile.company_id) {
          toast.error('Brak dostępu do tego zlecenia')
          router.push('/orders')
          return
        }

        setOrderNumber(order.order_number)
        setCustomerName(order.customer_name)

        // Pre-fill from order if available
        if (order.part_name) setPartName(order.part_name)
        if (order.quantity) setQuantity(order.quantity)
        if (order.material) setMaterial(order.material)
      }
    }

    loadUserAndOrder()
  }, [orderId, router])

  // Validation
  const validate = (): boolean => {
    if (!orderId) {
      toast.error('Brak ID zlecenia')
      return false
    }

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
    const loadingToast = toast.loading('Tworzę plan produkcji...')

    try {
      // 1. Generate production plan number
      let planNumberData: string
      const { data: rpcData, error: planNumberError } = await supabase
        .rpc('generate_production_plan_number', { p_company_id: companyId })

      if (planNumberError || !rpcData) {
        // Fallback: Generate plan number manually if RPC fails
        logger.warn('RPC generate_production_plan_number failed, using fallback', { error: planNumberError })
        const timestamp = Date.now().toString().slice(-6)
        planNumberData = `PP-${timestamp}`
      } else {
        planNumberData = rpcData
      }

      // 2. Create production plan
      const { data: productionPlan, error: planError } = await supabase
        .from('production_plans')
        .insert({
          company_id: companyId,
          plan_number: planNumberData,
          order_id: orderId,
          part_name: partName,
          quantity: quantity,
          drawing_file_id: drawingFileId,
          length: length,
          width: width,
          height: height,
          material: material || null,
          technical_notes: notes || null,
          status: 'draft',
          created_by: userId
        })
        .select()
        .single()

      if (planError) throw planError

      // 3. Create operations for this production plan
      const operationsToInsert = operations.map((op, index) => ({
        production_plan_id: productionPlan.id,
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
      toast.success(`Plan produkcji ${planNumberData} utworzony!`)

      // Redirect to production list view (not detail view)
      // This ensures the plan appears in the list and user can see it in context
      // Note: router.refresh() removed - Next.js automatically revalidates after router.push()
      router.push('/production')

    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd: ' + (error as Error).message)
      logger.error('Error creating production plan', { error })
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
      <AppLayout>
        <div className="p-8 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400">Ładowanie...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              ⚙️ Nowy Plan Produkcji
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Zlecenie: <strong>#{orderNumber}</strong> • Klient: <strong>{customerName}</strong>
            </p>
          </div>
          <Link
            href={`/orders/${orderId}`}
            className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
          >
            Anuluj
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 space-y-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-3">
              📦 Informacje o detalu
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part Name */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Nazwa części *
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="np. Flansza Ø100, Wałek Ø50x300"
                  data-testid="part-name-input"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Ilość sztuk *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  data-testid="quantity-input"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {/* Material */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Materiał
                </label>
                <input
                  type="text"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="np. Stal nierdzewna, Aluminium"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Complexity - używane tylko do auto-estymacji czasów operacji */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Złożoność (dla estymacji)
                </label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value as Complexity)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(complexityLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Pomaga AI w estymacji czasów operacji
                </p>
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Wymiary (opcjonalnie)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={length || ''}
                    onChange={(e) => setLength(parseFloat(e.target.value) || undefined)}
                    placeholder="D (mm)"
                    className="w-1/3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={width || ''}
                    onChange={(e) => setWidth(parseFloat(e.target.value) || undefined)}
                    placeholder="S (mm)"
                    className="w-1/3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={height || ''}
                    onChange={(e) => setHeight(parseFloat(e.target.value) || undefined)}
                    placeholder="W (mm)"
                    className="w-1/3 px-3 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Notatki technologiczne
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Dodatkowe informacje o planie produkcji..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Drawing Upload */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700">
            <DrawingUpload
              value={drawingFileId}
              onChange={setDrawingFileId}
              companyId={companyId}
              userId={userId}
            />
          </div>

          {/* Operations */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700">
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
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-2 border-green-500/50 rounded-lg p-8" data-testid="production-summary">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                💰 Podsumowanie planu produkcji
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
                  <p className="text-3xl font-bold text-green-400" data-testid="total-cost">{formatCost(totalCost)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || operations.length === 0}
              data-testid="submit-production-plan"
              className="flex-1 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg text-lg"
            >
              {isSubmitting ? 'Zapisuję...' : '✓ Utwórz Plan Produkcji'}
            </button>
            <Link
              href={`/orders/${orderId}`}
              className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold transition"
            >
              Anuluj
            </Link>
          </div>
        </form>
        </div>
      </div>
    </AppLayout>
  )
}
