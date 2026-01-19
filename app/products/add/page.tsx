'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { ProductFormData, productCategoryLabels, productUnitLabels } from '@/types/products'
import { Button } from '@/components/ui/Button'
import { ABC_DEFAULTS, MATERIAL_RISK_FACTORS } from '@/types/abc-pricing'

const productSchema = z.object({
  sku: z.string().min(1, 'SKU wymagane'),
  name: z.string().min(2, 'Nazwa musi mieć min. 2 znaki'),
  category: z.enum(['raw_material', 'finished_good', 'semi_finished', 'tool', 'consumable']),
  unit: z.enum(['kg', 'm', 'szt', 'l']),
  description: z.string().optional(),
  default_unit_cost: z.number().min(0).optional(),
  manufacturer: z.string().optional(),
  manufacturer_sku: z.string().optional(),
  // ABC Pricing fields
  cycle_time_minutes: z.number().min(0).optional().nullable(),
  setup_time_minutes: z.number().min(0).optional().nullable(),
  efficiency_factor: z.number().min(1).max(2).optional(),
  default_machine_id: z.string().uuid().optional().nullable(),
  scrap_risk_factor: z.number().min(1).max(2).optional(),
  material_markup_percent: z.number().min(0).max(100).optional(),
  material_weight_kg: z.number().min(0).optional().nullable(),
})

interface Machine {
  id: string
  name: string
  code: string | null
}

type ExtendedProductFormData = ProductFormData & {
  cycle_time_minutes?: number | null
  setup_time_minutes?: number | null
  efficiency_factor?: number
  default_machine_id?: string | null
  scrap_risk_factor?: number
  material_markup_percent?: number
  material_weight_kg?: number | null
}

export default function AddProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ExtendedProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      efficiency_factor: ABC_DEFAULTS.efficiency_factor,
      scrap_risk_factor: ABC_DEFAULTS.scrap_risk_factor,
      material_markup_percent: ABC_DEFAULTS.material_markup_percent,
    }
  })

  const category = watch('category')
  const isFinishedGood = category === 'finished_good'

  // Fetch machines for default_machine_id select
  useEffect(() => {
    async function fetchMachines() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile) return

      const { data } = await supabase
        .from('machines')
        .select('id, name, code')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'active')
        .order('name')

      if (data) setMachines(data)
    }

    fetchMachines()
  }, [])

  const onSubmit = async (data: ExtendedProductFormData) => {
    setIsSubmitting(true)
    const loadingToast = toast.loading('Tworzę towar...')

    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user!.id)
        .single()

      // Insert product
      const { error } = await supabase
        .from('products')
        .insert({
          ...data,
          company_id: userProfile!.company_id,
          created_by: userProfile!.id,
        })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Towar dodany do katalogu!')
      router.push('/products')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">
            📦 Dodaj Towar do Katalogu
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* SKU */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                SKU (Symbol) *
              </label>
              <input
                {...register('sku')}
                placeholder="np. ALU-6061-FLAT"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none font-mono"
              />
              {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku.message}</p>}
            </div>

            {/* Name */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Nazwa *
              </label>
              <input
                {...register('name')}
                placeholder="np. Aluminium 6061 Płaskownik"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            {/* Category & Unit */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Kategoria *
                </label>
                <select
                  {...register('category')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(productCategoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Jednostka *
                </label>
                <select
                  {...register('unit')}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(productUnitLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Opis
              </label>
              <textarea
                {...register('description')}
                rows={4}
                placeholder="Szczegółowy opis produktu, charakterystyka techniczna..."
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Manufacturer */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  Producent
                </label>
                <input
                  {...register('manufacturer')}
                  placeholder="np. Alupol"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                  SKU Producenta
                </label>
                <input
                  {...register('manufacturer_sku')}
                  placeholder="Kod producenta"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Default Unit Cost */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                Domyślna Cena Jednostkowa (PLN)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('default_unit_cost', { valueAsNumber: true })}
                placeholder="np. 25.50"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cena może różnić się per partia w magazynie
              </p>
            </div>

            {/* ABC Pricing Fields - Only for finished goods */}
            {isFinishedGood && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                  Parametry wyceny ABC
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                  Pola do automatycznej kalkulacji kosztów produkcji (Activity-Based Costing)
                </p>

                {/* Cycle Time & Setup Time */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      Czas cyklu (min)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('cycle_time_minutes', { valueAsNumber: true })}
                      placeholder="np. 15"
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Czas obróbki jednej sztuki z CAM
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      Czas przezbrojenia (min)
                    </label>
                    <input
                      type="number"
                      step="1"
                      {...register('setup_time_minutes', { valueAsNumber: true })}
                      placeholder="np. 60"
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Czas przygotowania maszyny
                    </p>
                  </div>
                </div>

                {/* Efficiency Factor & Scrap Risk */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      Współczynnik wydajności
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      {...register('efficiency_factor', { valueAsNumber: true })}
                      placeholder="np. 1.15"
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Narzut na czas CAM (1.15 = +15%)
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      Ryzyko złomu
                    </label>
                    <select
                      {...register('scrap_risk_factor', { valueAsNumber: true })}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value={MATERIAL_RISK_FACTORS.aluminum}>Aluminium (1.0)</option>
                      <option value={MATERIAL_RISK_FACTORS.brass}>Mosiądz (1.02)</option>
                      <option value={MATERIAL_RISK_FACTORS.copper}>Miedź (1.03)</option>
                      <option value={MATERIAL_RISK_FACTORS.steel}>Stal (1.05)</option>
                      <option value={MATERIAL_RISK_FACTORS.stainless_steel}>Stal nierdzewna (1.10)</option>
                      <option value={MATERIAL_RISK_FACTORS.titanium}>Tytan (1.15)</option>
                      <option value={MATERIAL_RISK_FACTORS.inconel}>Inconel (1.20)</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Narzut za trudność obróbki materiału
                    </p>
                  </div>
                </div>

                {/* Material Weight & Markup */}
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      Waga materiału (kg/szt)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      {...register('material_weight_kg', { valueAsNumber: true })}
                      placeholder="np. 0.250"
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Do kalkulacji bar end loss
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                      Narzut materiałowy (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      {...register('material_markup_percent', { valueAsNumber: true })}
                      placeholder="np. 15"
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Narzut na zakup materiału
                    </p>
                  </div>
                </div>

                {/* Default Machine */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
                    Domyślna maszyna
                  </label>
                  <select
                    {...register('default_machine_id')}
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Wybierz maszynę --</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name} {machine.code ? `(${machine.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Maszyna używana do wyceny tego produktu
                  </p>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                isLoading={isSubmitting}
                loadingText="Zapisuję..."
                className="flex-1 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow-lg text-lg"
              >
                Dodaj Towar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold transition"
              >
                Anuluj
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
