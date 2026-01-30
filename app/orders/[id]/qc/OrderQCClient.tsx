'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitization'

// ─── Types ───────────────────────────────────────────────

interface QCItem {
  id: string
  name: string
  nominal_value: number
  tolerance_plus: number
  tolerance_minus: number
  unit: string
  is_critical: boolean
  sort_order: number
}

interface QCPlan {
  id: string
  name: string
  part_name: string | null
  description: string | null
  quality_control_items: QCItem[]
}

interface Measurement {
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

  // Tab state: 'measure' | 'create-plan'
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
  // Auto-generate initial QC items from order dimensions
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

  const handlePlanChange = async (planId: string) => {
    setSelectedPlanId(planId)
    setValues({})

    if (!planId) {
      setPlanItems([])
      return
    }

    // Check if items already loaded in server data
    const plan = plans.find(p => p.id === planId)
    if (plan && plan.quality_control_items?.length > 0) {
      const sorted = [...plan.quality_control_items].sort((a, b) => a.sort_order - b.sort_order)
      setPlanItems(sorted)
      return
    }

    // Fetch from DB
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

  const checkPass = (item: QCItem, value: number): boolean => {
    return value >= (item.nominal_value - item.tolerance_minus) && value <= (item.nominal_value + item.tolerance_plus)
  }

  const getStatus = (item: QCItem, val: string): 'ok' | 'nok' | 'empty' => {
    if (!val || val.trim() === '') return 'empty'
    const num = parseFloat(val)
    if (isNaN(num)) return 'empty'
    return checkPass(item, num) ? 'ok' : 'nok'
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

  const updateNewItem = (tempId: string, field: keyof NewPlanItem, value: string | boolean) => {
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

      // Reset form and switch to measure tab
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
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-lg text-center">
            <p className="text-slate-500 dark:text-slate-400 text-xs">Pomiary</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{totalMeasurements}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-green-200 dark:border-green-700/50 p-4 rounded-lg text-center">
            <p className="text-slate-500 dark:text-slate-400 text-xs">Zgodne</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{passedCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700/50 p-4 rounded-lg text-center">
            <p className="text-slate-500 dark:text-slate-400 text-xs">Niezgodne</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{failedCount}</p>
          </div>
          <div className={`bg-white dark:bg-slate-800 p-4 rounded-lg text-center border ${passRate >= 95 ? 'border-green-200 dark:border-green-700/50' : passRate >= 80 ? 'border-yellow-200 dark:border-yellow-700/50' : 'border-red-200 dark:border-red-700/50'}`}>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Zgodność</p>
            <p className={`text-3xl font-bold ${passRate >= 95 ? 'text-green-600 dark:text-green-400' : passRate >= 80 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
              {passRate}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setTab('measure')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === 'measure' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          Wprowadź pomiary
        </button>
        <button
          onClick={() => setTab('create-plan')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${tab === 'create-plan' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
        >
          + Nowy plan kontroli
        </button>
      </div>

      {/* ─── Tab: Measure ─────────────────────────────── */}
      {tab === 'measure' && (
        <div>
          {plans.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Brak planów kontroli</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                Najpierw utwórz plan kontroli z wymiarami do sprawdzenia
              </p>
              <Button variant="primary" onClick={() => setTab('create-plan')}>
                + Utwórz plan kontroli
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitMeasurement}>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                {/* Plan selector + batch/sample */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Plan kontroli</label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => handlePlanChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">-- Wybierz plan --</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}{plan.part_name ? ` (${plan.part_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Nr partii</label>
                    <Input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="np. LOT-001"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Nr próbki</label>
                    <Input
                      type="number"
                      min="1"
                      value={sampleNumber}
                      onChange={(e) => setSampleNumber(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                {loadingItems && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm py-6 text-center">Ładowanie wymiarów...</p>
                )}

                {/* Measurement inputs */}
                {planItems.length > 0 && (
                  <div className="space-y-3">
                    {planItems.map((item) => {
                      const status = getStatus(item, values[item.id] || '')
                      const borderColor = status === 'ok' ? 'border-green-500' : status === 'nok' ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
                      const bgColor = status === 'ok' ? 'bg-green-50 dark:bg-green-900/20' : status === 'nok' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-900'

                      return (
                        <div key={item.id} className={`p-4 rounded-lg border ${borderColor} ${bgColor} transition-colors`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900 dark:text-white font-medium">{item.name}</span>
                              {item.is_critical && (
                                <span className="px-1.5 py-0.5 bg-red-600/30 text-red-600 dark:text-red-400 text-[10px] rounded font-semibold">KRYTYCZNY</span>
                              )}
                            </div>
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-mono">
                              {item.nominal_value} ±{Math.max(item.tolerance_plus, item.tolerance_minus)} {item.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              step="0.001"
                              value={values[item.id] || ''}
                              onChange={(e) => setValues(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder={String(item.nominal_value)}
                              className="flex-1 text-center font-mono text-lg"
                            />
                            <div className="w-20 text-center">
                              {status === 'ok' && <span className="text-green-600 dark:text-green-400 font-bold text-lg">✓ OK</span>}
                              {status === 'nok' && <span className="text-red-600 dark:text-red-400 font-bold text-lg">✕ NOK</span>}
                              {status === 'empty' && <span className="text-slate-400 text-sm">—</span>}
                            </div>
                          </div>

                          {/* Tolerance bar */}
                          {values[item.id] && status !== 'empty' && (
                            <div className="mt-2">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>{(item.nominal_value - item.tolerance_minus).toFixed(3)}</span>
                                <span>{item.nominal_value}</span>
                                <span>{(item.nominal_value + item.tolerance_plus).toFixed(3)}</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full relative">
                                <div className="absolute h-full bg-green-500/30 rounded-full" style={{ left: '0%', right: '0%' }} />
                                {(() => {
                                  const min = item.nominal_value - item.tolerance_minus * 2
                                  const max = item.nominal_value + item.tolerance_plus * 2
                                  const range = max - min
                                  const value = parseFloat(values[item.id])
                                  const position = ((value - min) / range) * 100
                                  const clamped = Math.max(0, Math.min(100, position))
                                  return (
                                    <div
                                      className={`absolute w-2 h-4 -top-1 rounded ${status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}
                                      style={{ left: `${clamped}%`, transform: 'translateX(-50%)' }}
                                    />
                                  )
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    <Button type="submit" disabled={isSubmitting} variant="primary" className="w-full mt-4">
                      {isSubmitting ? 'Zapisywanie...' : 'Zapisz pomiary'}
                    </Button>
                  </div>
                )}

                {selectedPlanId && !loadingItems && planItems.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6">Ten plan nie ma zdefiniowanych wymiarów</p>
                )}

                {!selectedPlanId && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6">Wybierz plan kontroli aby rozpocząć pomiary</p>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {/* ─── Tab: Create Plan ─────────────────────────── */}
      {tab === 'create-plan' && (
        <form onSubmit={handleCreatePlan}>
          {/* Basic info */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informacje o planie</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Nazwa planu *</label>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="np. Kontrola tulei 50mm"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Nazwa części</label>
                <Input
                  value={planPartName}
                  onChange={(e) => setPlanPartName(e.target.value)}
                  placeholder="np. Tuleja 50x30"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-700 dark:text-slate-300 text-sm mb-1">Opis</label>
                <textarea
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  placeholder="Dodatkowe informacje o planie kontroli..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none text-sm"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Dimensions */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Wymiary do kontroli</h3>
              <Button type="button" onClick={addNewItem} variant="ghost" size="sm">
                + Dodaj wymiar
              </Button>
            </div>

            <div className="space-y-4">
              {newItems.map((item, index) => (
                <div key={item.tempId} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Wymiar #{index + 1}</span>
                    {newItems.length > 1 && (
                      <button type="button" onClick={() => removeNewItem(item.tempId)} className="text-red-500 dark:text-red-400 hover:text-red-700 text-sm">
                        Usuń
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="col-span-2">
                      <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Nazwa wymiaru *</label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateNewItem(item.tempId, 'name', e.target.value)}
                        placeholder="np. Średnica zewnętrzna"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Wartość nom. *</label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.nominal_value}
                        onChange={(e) => updateNewItem(item.tempId, 'nominal_value', e.target.value)}
                        placeholder="50.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Tol. +</label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.tolerance_plus}
                        onChange={(e) => updateNewItem(item.tempId, 'tolerance_plus', e.target.value)}
                        placeholder="0.05"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Tol. -</label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.tolerance_minus}
                        onChange={(e) => updateNewItem(item.tempId, 'tolerance_minus', e.target.value)}
                        placeholder="0.05"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Jednostka</label>
                      <select
                        value={item.unit}
                        onChange={(e) => updateNewItem(item.tempId, 'unit', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="mm">mm</option>
                        <option value="um">µm</option>
                        <option value="deg">°</option>
                        <option value="Ra">Ra</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`critical-${item.tempId}`}
                      checked={item.is_critical}
                      onChange={(e) => updateNewItem(item.tempId, 'is_critical', e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500"
                    />
                    <label htmlFor={`critical-${item.tempId}`} className="text-slate-500 dark:text-slate-400 text-sm">
                      Wymiar krytyczny (100% kontroli)
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={isCreatingPlan} variant="primary" className="w-full">
            {isCreatingPlan ? 'Tworzenie...' : 'Utwórz plan kontroli'}
          </Button>
        </form>
      )}

      {/* ─── Measurements history ─────────────────────── */}
      {totalMeasurements > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Historia pomiarów</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Wymiar</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Nominał</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Pomiar</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Wynik</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Plan</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Operator</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {measurements.slice(0, 20).map((m) => {
                  const item = m.quality_control_items
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-900 dark:text-white text-sm">{item?.name || '-'}</span>
                          {item?.is_critical && (
                            <span className="px-1.5 py-0.5 bg-red-600/30 text-red-600 dark:text-red-400 text-[10px] rounded">KRYT</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm font-mono">
                        {item?.nominal_value} ±{Math.max(item?.tolerance_plus || 0, item?.tolerance_minus || 0)} {item?.unit}
                      </td>
                      <td className="px-4 py-2 text-slate-900 dark:text-white text-sm font-mono font-semibold">
                        {m.measured_value} {item?.unit}
                      </td>
                      <td className="px-4 py-2">
                        {m.is_pass ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full">✓ OK</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-full">✕ NOK</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs">
                        {m.quality_control_plans?.name || '-'}
                      </td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm">
                        {m.users?.full_name || '-'}
                      </td>
                      <td className="px-4 py-2 text-slate-400 dark:text-slate-500 text-xs">
                        {new Date(m.measured_at).toLocaleString('pl-PL', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {measurements.length > 20 && (
            <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-3">
              Wyświetlono 20 z {measurements.length} pomiarów
            </p>
          )}
        </div>
      )}
    </div>
  )
}
