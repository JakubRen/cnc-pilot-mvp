'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitization'

interface QCItem {
  id: string
  name: string
  nominal_value: string
  tolerance_plus: string
  tolerance_minus: string
  unit: string
  is_critical: boolean
}

export default function AddQCPlanPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [planName, setPlanName] = useState('')
  const [partName, setPartName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<QCItem[]>([
    {
      id: crypto.randomUUID(),
      name: '',
      nominal_value: '',
      tolerance_plus: '0.05',
      tolerance_minus: '0.05',
      unit: 'mm',
      is_critical: false
    }
  ])

  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        name: '',
        nominal_value: '',
        tolerance_plus: '0.05',
        tolerance_minus: '0.05',
        unit: 'mm',
        is_critical: false
      }
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof QCItem, value: string | boolean) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!planName.trim()) {
      toast.error('Nazwa planu jest wymagana')
      return
    }

    const validItems = items.filter(item => item.name.trim() && item.nominal_value)
    if (validItems.length === 0) {
      toast.error('Dodaj przynajmniej jeden wymiar')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Tworzenie planu kontroli...')

    try {
      // Get user info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nie zalogowany')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) throw new Error('Brak firmy')

      // Sanitize user inputs to prevent XSS attacks
      const sanitizedPlanName = sanitizeText(planName)
      const sanitizedPartName = partName ? sanitizeText(partName) : null
      const sanitizedDescription = description ? sanitizeText(description) : null

      // Create plan
      const { data: plan, error: planError } = await supabase
        .from('quality_control_plans')
        .insert({
          company_id: userProfile.company_id,
          name: sanitizedPlanName,
          part_name: sanitizedPartName,
          description: sanitizedDescription,
          created_by: userProfile.id
        })
        .select()
        .single()

      if (planError) throw planError

      // Create items
      const itemsToInsert = validItems.map((item, index) => ({
        plan_id: plan.id,
        name: sanitizeText(item.name),
        nominal_value: parseFloat(item.nominal_value),
        tolerance_plus: parseFloat(item.tolerance_plus) || 0,
        tolerance_minus: parseFloat(item.tolerance_minus) || 0,
        unit: item.unit,
        is_critical: item.is_critical,
        sort_order: index
      }))

      const { error: itemsError } = await supabase
        .from('quality_control_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      toast.dismiss(loadingToast)
      toast.success('Plan kontroli utworzony!')
      router.push('/quality-control')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error creating QC plan', { error })
      toast.error('Nie udało się utworzyć planu')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/quality-control" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              ← Wróć
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Nowy Plan Kontroli</h1>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informacje podstawowe</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Nazwa planu *</label>
                  <Input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="np. Kontrola tulei 50mm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Nazwa części</label>
                  <Input
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="np. Tuleja 50x30"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Opis</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Dodatkowe informacje o planie kontroli..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* QC Items */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Wymiary do kontroli</h2>
                <Button type="button" onClick={addItem} variant="ghost" size="sm">
                  + Dodaj wymiar
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-slate-500 dark:text-slate-400 text-sm">Wymiar #{index + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Usuń
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      <div className="col-span-2">
                        <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Nazwa wymiaru *</label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
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
                          onChange={(e) => updateItem(item.id, 'nominal_value', e.target.value)}
                          placeholder="50.00"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Tol. + </label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.tolerance_plus}
                          onChange={(e) => updateItem(item.id, 'tolerance_plus', e.target.value)}
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
                          onChange={(e) => updateItem(item.id, 'tolerance_minus', e.target.value)}
                          placeholder="0.05"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Jednostka</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
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
                        id={`critical-${item.id}`}
                        checked={item.is_critical}
                        onChange={(e) => updateItem(item.id, 'is_critical', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-red-600 focus:ring-red-500"
                      />
                      <label htmlFor={`critical-${item.id}`} className="text-slate-500 dark:text-slate-400 text-sm">
                        Wymiar krytyczny (100% kontroli)
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="flex-1"
              >
                {isSubmitting ? 'Tworzenie...' : 'Utwórz Plan Kontroli'}
              </Button>
              <Link href="/quality-control">
                <Button type="button" variant="ghost">
                  Anuluj
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
