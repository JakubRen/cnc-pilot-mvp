'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitization'
import QCMeasurementForm from './QCMeasurementForm'
import QCCreatePlanForm from './QCCreatePlanForm'
import QCMeasurementsList from './QCMeasurementsList'

// ─── Types ───────────────────────────────────────────────

export interface QCItem {
  id: string
  name: string
  nominal_value: number
  tolerance_plus: number
  tolerance_minus: number
  unit: string
  is_critical: boolean
  sort_order: number
}

export interface QCPlan {
  id: string
  name: string
  part_name: string | null
  description: string | null
  quality_control_items: QCItem[]
}

export interface Measurement {
  id: string
  is_pass: boolean
  measured_value: number
  measured_at: string
  batch_number: string | null
  sample_number: number | null
  quality_control_items: {
    name: string
    nominal_value: number
    tolerance_plus: number
    tolerance_minus: number
    unit: string
    is_critical: boolean
  } | null
  quality_control_plans: { name: string } | null
  users: { full_name: string } | null
}

interface NewPlanItem {
  tempId: string
  name: string
  nominal_value: string
  tolerance_plus: string
  tolerance_minus: string
  unit: string
  is_critical: boolean
}

interface OrderDimensions {
  partName: string
  length: number | null
  width: number | null
  height: number | null
  tolerance_length: number | null
  tolerance_width: number | null
  tolerance_height: number | null
}

interface Props {
  orderId: string
  orderNumber: string
  plans: QCPlan[]
  measurements: Measurement[]
  userId: number
  companyId: string
  orderDimensions?: OrderDimensions
}

// ─── Component ───────────────────────────────────────────

export default function OrderQCClient({ orderId, orderNumber, plans, measurements, userId, companyId, orderDimensions }: Props) {
  const router = useRouter()

  // Tab state
  const [tab, setTab] = useState<'measure' | 'create-plan'>(plans.length > 0 ? 'measure' : 'create-plan')

  // ─── Measurement state ─────────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [planItems, setPlanItems] = useState<QCItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [batchNumber, setBatchNumber] = useState('')
  const [sampleNumber, setSampleNumber] = useState('1')
  const [values, setValues] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── Create plan state ─────────────────────────────────
  const buildInitialItems = (): NewPlanItem[] => {
    const items: NewPlanItem[] = []
    if (orderDimensions?.length != null) {
      items.push({
        tempId: crypto.randomUUID(),
        name: 'Długość',
        nominal_value: String(orderDimensions.length),
        tolerance_plus: String(orderDimensions.tolerance_length ?? 0.1),
        tolerance_minus: String(orderDimensions.tolerance_length ?? 0.1),
        unit: 'mm',
        is_critical: false,
      })
    }
    if (orderDimensions?.width != null) {
      items.push({
        tempId: crypto.randomUUID(),
        name: 'Szerokość',
        nominal_value: String(orderDimensions.width),
        tolerance_plus: String(orderDimensions.tolerance_width ?? 0.1),
        tolerance_minus: String(orderDimensions.tolerance_width ?? 0.1),
        unit: 'mm',
        is_critical: false,
      })
    }
    if (orderDimensions?.height != null) {
      items.push({
        tempId: crypto.randomUUID(),
        name: 'Wysokość',
        nominal_value: String(orderDimensions.height),
        tolerance_plus: String(orderDimensions.tolerance_height ?? 0.1),
        tolerance_minus: String(orderDimensions.tolerance_height ?? 0.1),
        unit: 'mm',
        is_critical: false,
      })
    }
    if (items.length === 0) {
      items.push({ tempId: crypto.randomUUID(), name: '', nominal_value: '', tolerance_plus: '0.05', tolerance_minus: '0.05', unit: 'mm', is_critical: false })
    }
    return items
  }

  const [planName, setPlanName] = useState(orderDimensions?.partName ? `Kontrola: ${orderDimensions.partName}` : '')
  const [planPartName, setPlanPartName] = useState(orderDimensions?.partName || '')
  const [planDescription, setPlanDescription] = useState('')
  const [newItems, setNewItems] = useState<NewPlanItem[]>(buildInitialItems)
  const [isCreatingPlan, setIsCreatingPlan] = useState(false)

  // ─── Measurement helpers ───────────────────────────────

  const checkPass = (item: QCItem, value: number): boolean => {
    return value >= (item.nominal_value - item.tolerance_minus) && value <= (item.nominal_value + item.tolerance_plus)
  }

  const handlePlanChange = async (planId: string) => {
    setSelectedPlanId(planId)
    setValues({})

    if (!planId) {
      setPlanItems([])
      return
    }

    const plan = plans.find(p => p.id === planId)
    if (plan && plan.quality_control_items?.length > 0) {
      const sorted = [...plan.quality_control_items].sort((a, b) => a.sort_order - b.sort_order)
      setPlanItems(sorted)
      return
    }

    setLoadingItems(true)
    try {
      const { data, error } = await supabase
        .from('quality_control_items')
        .select('id, name, nominal_value, tolerance_plus, tolerance_minus, unit, is_critical, sort_order')
        .eq('plan_id', planId)
        .order('sort_order', { ascending: true })
      if (error) throw error
      setPlanItems(data || [])
    } catch (err) {
      logger.error('Failed to fetch QC items', { error: err })
      toast.error('Nie udało się pobrać wymiarów')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleSubmitMeasurement = async (e: React.FormEvent) => {
    e.preventDefault()
    const filled = Object.entries(values).filter(([, v]) => v && v.trim() !== '')
    if (filled.length === 0) {
      toast.error('Wprowadź przynajmniej jeden pomiar')
      return
    }

    setIsSubmitting(true)
    const loading = toast.loading('Zapisywanie pomiarów...')

    try {
      const sanitizedBatch = batchNumber ? sanitizeText(batchNumber) : null
      const rows = filled.map(([itemId, value]) => {
        const item = planItems.find(i => i.id === itemId)!
        const num = parseFloat(value)
        return {
          company_id: companyId,
          order_id: orderId,
          plan_id: selectedPlanId,
          item_id: itemId,
          measured_value: num,
          is_pass: checkPass(item, num),
          measured_by: userId,
          batch_number: sanitizedBatch,
          sample_number: parseInt(sampleNumber) || 1,
        }
      })

      const { error } = await supabase.from('quality_measurements').insert(rows)
      if (error) throw error

      const passed = rows.filter(r => r.is_pass).length
      toast.dismiss(loading)
      if (passed === rows.length) {
        toast.success(`Zapisano ${rows.length} pomiarów — wszystkie OK!`)
      } else {
        toast.error(`Zapisano ${rows.length} pomiarów — ${rows.length - passed} NOK!`)
      }

      setValues({})
      setSampleNumber(String(parseInt(sampleNumber) + 1))
      router.refresh()
    } catch (err) {
      toast.dismiss(loading)
      logger.error('Error saving measurements', { error: err })
      toast.error('Nie udało się zapisać pomiarów')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Create plan helpers ───────────────────────────────

  const addNewItem = () => {
    setNewItems([...newItems, {
      tempId: crypto.randomUUID(), name: '', nominal_value: '', tolerance_plus: '0.05', tolerance_minus: '0.05', unit: 'mm', is_critical: false
    }])
  }

  const removeNewItem = (tempId: string) => {
    if (newItems.length > 1) setNewItems(newItems.filter(i => i.tempId !== tempId))
  }

  const updateNewItem = (tempId: string, field: string, value: string | boolean) => {
    setNewItems(newItems.map(i => i.tempId === tempId ? { ...i, [field]: value } : i))
  }

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planName.trim()) { toast.error('Nazwa planu jest wymagana'); return }
    const validItems = newItems.filter(i => i.name.trim() && i.nominal_value)
    if (validItems.length === 0) { toast.error('Dodaj przynajmniej jeden wymiar'); return }

    setIsCreatingPlan(true)
    const loading = toast.loading('Tworzenie planu kontroli...')

    try {
      const { data: plan, error: planError } = await supabase
        .from('quality_control_plans')
        .insert({
          company_id: companyId,
          name: sanitizeText(planName),
          part_name: planPartName ? sanitizeText(planPartName) : null,
          description: planDescription ? sanitizeText(planDescription) : null,
          created_by: userId,
        })
        .select()
        .single()

      if (planError) throw planError

      const itemsToInsert = validItems.map((item, index) => ({
        plan_id: plan.id,
        name: sanitizeText(item.name),
        nominal_value: parseFloat(item.nominal_value),
        tolerance_plus: parseFloat(item.tolerance_plus) || 0,
        tolerance_minus: parseFloat(item.tolerance_minus) || 0,
        unit: item.unit,
        is_critical: item.is_critical,
        sort_order: index,
      }))

      const { error: itemsError } = await supabase.from('quality_control_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      toast.dismiss(loading)
      toast.success('Plan kontroli utworzony! Możesz teraz dodawać pomiary.')

      setPlanName('')
      setPlanPartName('')
      setPlanDescription('')
      setNewItems([{ tempId: crypto.randomUUID(), name: '', nominal_value: '', tolerance_plus: '0.05', tolerance_minus: '0.05', unit: 'mm', is_critical: false }])
      setTab('measure')
      router.refresh()
    } catch (err) {
      toast.dismiss(loading)
      logger.error('Error creating QC plan', { error: err })
      toast.error('Nie udało się utworzyć planu')
    } finally {
      setIsCreatingPlan(false)
    }
  }

  // ─── Stats ─────────────────────────────────────────────

  const totalMeasurements = measurements.length
  const passedCount = measurements.filter(m => m.is_pass).length
  const failedCount = totalMeasurements - passedCount
  const passRate = totalMeasurements > 0 ? Math.round((passedCount / totalMeasurements) * 100) : 0

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stats */}
      {totalMeasurements > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card border border-border p-4 rounded-lg text-center">
            <p className="text-muted-foreground text-xs">Pomiary</p>
            <p className="text-3xl font-bold text-foreground">{totalMeasurements}</p>
          </div>
          <div className="bg-card border border-green-200 dark:border-green-700/50 p-4 rounded-lg text-center">
            <p className="text-muted-foreground text-xs">Zgodne</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{passedCount}</p>
          </div>
          <div className="bg-card border border-red-200 dark:border-red-700/50 p-4 rounded-lg text-center">
            <p className="text-muted-foreground text-xs">Niezgodne</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{failedCount}</p>
          </div>
          <div className={`bg-card p-4 rounded-lg text-center border ${passRate >= 95 ? 'border-green-200 dark:border-green-700/50' : passRate >= 80 ? 'border-yellow-200 dark:border-yellow-700/50' : 'border-red-200 dark:border-red-700/50'}`}>
            <p className="text-muted-foreground text-xs">Zgodność</p>
            <p className={`text-3xl font-bold ${passRate >= 95 ? 'text-green-600 dark:text-green-400' : passRate >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
              {passRate}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab('measure')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === 'measure' ? 'border-violet-600 text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
        >
          Wprowadź pomiary
        </button>
        <button
          onClick={() => setTab('create-plan')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === 'create-plan' ? 'border-violet-600 text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
        >
          + Nowy plan kontroli
        </button>
      </div>

      {/* Tab: Measure */}
      {tab === 'measure' && (
        <QCMeasurementForm
          plans={plans}
          selectedPlanId={selectedPlanId}
          onPlanChange={handlePlanChange}
          planItems={planItems}
          loadingItems={loadingItems}
          batchNumber={batchNumber}
          onBatchNumberChange={setBatchNumber}
          sampleNumber={sampleNumber}
          onSampleNumberChange={setSampleNumber}
          values={values}
          onValueChange={(itemId, value) => setValues(prev => ({ ...prev, [itemId]: value }))}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmitMeasurement}
          onSwitchToCreatePlan={() => setTab('create-plan')}
        />
      )}

      {/* Tab: Create Plan */}
      {tab === 'create-plan' && (
        <QCCreatePlanForm
          planName={planName}
          onPlanNameChange={setPlanName}
          planPartName={planPartName}
          onPlanPartNameChange={setPlanPartName}
          planDescription={planDescription}
          onPlanDescriptionChange={setPlanDescription}
          newItems={newItems}
          onAddItem={addNewItem}
          onRemoveItem={removeNewItem}
          onUpdateItem={updateNewItem}
          isCreatingPlan={isCreatingPlan}
          onSubmit={handleCreatePlan}
        />
      )}

      {/* Measurements history */}
      <QCMeasurementsList measurements={measurements} />
    </div>
  )
}
