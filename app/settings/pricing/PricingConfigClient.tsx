'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PricingConfig } from '@/types/abc-pricing'
import { ABC_DEFAULTS } from '@/types/abc-pricing'

const pricingConfigSchema = z.object({
  electricity_price_kwh: z.number().min(0).max(10),
  default_margin_percent: z.number().min(0).max(100),
  min_margin_percent: z.number().min(0).max(100),
  margin_qty_1: z.number().min(0).max(100),
  margin_qty_10: z.number().min(0).max(100),
  margin_qty_50: z.number().min(0).max(100),
  margin_qty_100_plus: z.number().min(0).max(100),
  bar_end_waste_kg: z.number().min(0).max(10),
  include_tool_costs: z.boolean(),
  default_tool_cost_percent: z.number().min(0).max(50),
})

type FormData = z.infer<typeof pricingConfigSchema>

interface Props {
  pricingConfig: PricingConfig | null
  companyId: string
}

export default function PricingConfigClient({ pricingConfig, companyId }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(pricingConfigSchema),
    defaultValues: {
      electricity_price_kwh: pricingConfig?.electricity_price_kwh ?? ABC_DEFAULTS.electricity_price_kwh,
      default_margin_percent: pricingConfig?.default_margin_percent ?? ABC_DEFAULTS.default_margin_percent,
      min_margin_percent: pricingConfig?.min_margin_percent ?? ABC_DEFAULTS.min_margin_percent,
      margin_qty_1: pricingConfig?.margin_qty_1 ?? 45,
      margin_qty_10: pricingConfig?.margin_qty_10 ?? 35,
      margin_qty_50: pricingConfig?.margin_qty_50 ?? 25,
      margin_qty_100_plus: pricingConfig?.margin_qty_100_plus ?? 20,
      bar_end_waste_kg: pricingConfig?.bar_end_waste_kg ?? ABC_DEFAULTS.bar_end_waste_kg,
      include_tool_costs: pricingConfig?.include_tool_costs ?? false,
      default_tool_cost_percent: pricingConfig?.default_tool_cost_percent ?? 5,
    },
  })

  const includeToolCosts = watch('include_tool_costs')

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    const loadingToast = toast.loading('Zapisywanie konfiguracji...')

    try {
      const payload = {
        company_id: companyId,
        ...data,
        updated_at: new Date().toISOString(),
      }

      if (pricingConfig) {
        // Update existing
        const { error } = await supabase
          .from('pricing_config')
          .update(payload)
          .eq('id', pricingConfig.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('pricing_config')
          .insert(payload)

        if (error) throw error
      }

      toast.dismiss(loadingToast)
      toast.success('Konfiguracja zapisana!')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Nie udało się zapisać konfiguracji')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Energy Price */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Cena energii</h2>
        <div className="max-w-md">
          <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
            Cena prądu (PLN/kWh)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('electricity_price_kwh', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
          <p className="text-slate-500 text-xs mt-1">
            Średnia cena energii elektrycznej w 2026 to ok. 0.85 PLN/kWh
          </p>
          {errors.electricity_price_kwh && (
            <p className="text-red-500 text-xs mt-1">{errors.electricity_price_kwh.message}</p>
          )}
        </div>
      </div>

      {/* Margin Settings */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Ustawienia marży</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
              Domyślna marża (%)
            </label>
            <input
              type="number"
              {...register('default_margin_percent', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="text-slate-500 text-xs mt-1">Stosowana gdy brak innych ustawień</p>
            {errors.default_margin_percent && (
              <p className="text-red-500 text-xs mt-1">{errors.default_margin_percent.message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
              Minimalna marża (%)
            </label>
            <input
              type="number"
              {...register('min_margin_percent', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="text-slate-500 text-xs mt-1">System ostrzeże poniżej tej wartości</p>
            {errors.min_margin_percent && (
              <p className="text-red-500 text-xs mt-1">{errors.min_margin_percent.message}</p>
            )}
          </div>
        </div>

        {/* Volume Discounts */}
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-3">Rabaty ilościowe (volume discount)</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Marża zmniejsza się wraz ze wzrostem ilości zamówienia
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
              1 szt (%)
            </label>
            <input
              type="number"
              {...register('margin_qty_1', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            {errors.margin_qty_1 && (
              <p className="text-red-500 text-xs mt-1">{errors.margin_qty_1.message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
              2-10 szt (%)
            </label>
            <input
              type="number"
              {...register('margin_qty_10', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            {errors.margin_qty_10 && (
              <p className="text-red-500 text-xs mt-1">{errors.margin_qty_10.message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
              11-50 szt (%)
            </label>
            <input
              type="number"
              {...register('margin_qty_50', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            {errors.margin_qty_50 && (
              <p className="text-red-500 text-xs mt-1">{errors.margin_qty_50.message}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
              50+ szt (%)
            </label>
            <input
              type="number"
              {...register('margin_qty_100_plus', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            {errors.margin_qty_100_plus && (
              <p className="text-red-500 text-xs mt-1">{errors.margin_qty_100_plus.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Material Settings */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Ustawienia materiałowe</h2>

        <div className="max-w-md">
          <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
            Końcówka pręta - bar end waste (kg)
          </label>
          <input
            type="number"
            step="0.1"
            {...register('bar_end_waste_kg', { valueAsNumber: true })}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
          <p className="text-slate-500 text-xs mt-1">
            Średnia waga końcówki pręta (bar remnant). Koszt jest amortyzowany na wszystkie części z pręta.
          </p>
          {errors.bar_end_waste_kg && (
            <p className="text-red-500 text-xs mt-1">{errors.bar_end_waste_kg.message}</p>
          )}
        </div>
      </div>

      {/* Tool Costs */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Koszty narzędzi</h2>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="include_tool_costs"
            {...register('include_tool_costs')}
            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="include_tool_costs" className="text-slate-700 dark:text-slate-300 font-medium">
            Doliczaj koszty narzędzi do wyceny
          </label>
        </div>

        {includeToolCosts && (
          <div className="max-w-md">
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
              Narzut za narzędzia (% od kosztu obróbki)
            </label>
            <input
              type="number"
              {...register('default_tool_cost_percent', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            <p className="text-slate-500 text-xs mt-1">
              Typowo 3-8% kosztu obróbki
            </p>
            {errors.default_tool_cost_percent && (
              <p className="text-red-500 text-xs mt-1">{errors.default_tool_cost_percent.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
        >
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz konfigurację'}
        </button>
      </div>

      {/* Last Updated */}
      {pricingConfig && (
        <p className="text-slate-500 text-sm text-center">
          Ostatnia aktualizacja: {new Date(pricingConfig.updated_at).toLocaleString('pl-PL')}
        </p>
      )}
    </form>
  )
}
