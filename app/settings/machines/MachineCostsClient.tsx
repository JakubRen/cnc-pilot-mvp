'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type { MachineCosts } from '@/types/abc-pricing'
import { ABC_DEFAULTS } from '@/types/abc-pricing'

const machineCostsSchema = z.object({
  replacement_value: z.number().min(0, 'Wartość musi być >= 0').nullable(),
  economic_life_years: z.number().min(1).max(30),
  floor_space_m2: z.number().min(0).nullable(),
  cost_per_m2_yearly: z.number().min(0).nullable(),
  software_subscriptions_yearly: z.number().min(0),
  financing_costs_yearly: z.number().min(0),
  shift_hours_per_day: z.number().min(1).max(24),
  working_days_per_year: z.number().min(1).max(365),
  oee_percentage: z.number().min(1).max(100),
  power_kw: z.number().min(0).nullable(),
  average_load_factor: z.number().min(0).max(1),
  consumables_rate_hour: z.number().min(0),
  maintenance_reserve_hour: z.number().min(0),
  operator_hourly_rate: z.number().min(0),
  machines_per_operator: z.number().min(0.5).max(10),
  setup_specialist_rate: z.number().min(0),
})

type FormData = z.infer<typeof machineCostsSchema>

interface Machine {
  id: string
  name: string
  code: string | null
  manufacturer: string | null
  model: string | null
  status: string
}

interface Props {
  machines: Machine[]
  costsMap: Record<string, MachineCosts>
  companyId: string
}

export default function MachineCostsClient({ machines, costsMap, companyId }: Props) {
  const router = useRouter()
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(machines[0]?.id || null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const existingCosts = selectedMachineId ? costsMap[selectedMachineId] : null

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(machineCostsSchema),
    defaultValues: getDefaultValues(existingCosts),
  })

  function getDefaultValues(costs: MachineCosts | null): FormData {
    return {
      replacement_value: costs?.replacement_value ?? null,
      economic_life_years: costs?.economic_life_years ?? ABC_DEFAULTS.economic_life_years,
      floor_space_m2: costs?.floor_space_m2 ?? null,
      cost_per_m2_yearly: costs?.cost_per_m2_yearly ?? null,
      software_subscriptions_yearly: costs?.software_subscriptions_yearly ?? 0,
      financing_costs_yearly: costs?.financing_costs_yearly ?? 0,
      shift_hours_per_day: costs?.shift_hours_per_day ?? ABC_DEFAULTS.shift_hours_per_day,
      working_days_per_year: costs?.working_days_per_year ?? ABC_DEFAULTS.working_days_per_year,
      oee_percentage: costs?.oee_percentage ?? ABC_DEFAULTS.oee_percentage,
      power_kw: costs?.power_kw ?? null,
      average_load_factor: costs?.average_load_factor ?? ABC_DEFAULTS.average_load_factor,
      consumables_rate_hour: costs?.consumables_rate_hour ?? ABC_DEFAULTS.consumables_rate_hour,
      maintenance_reserve_hour: costs?.maintenance_reserve_hour ?? ABC_DEFAULTS.maintenance_reserve_hour,
      operator_hourly_rate: costs?.operator_hourly_rate ?? ABC_DEFAULTS.operator_hourly_rate,
      machines_per_operator: costs?.machines_per_operator ?? ABC_DEFAULTS.machines_per_operator,
      setup_specialist_rate: costs?.setup_specialist_rate ?? ABC_DEFAULTS.setup_specialist_rate,
    }
  }

  // When machine selection changes, reset form
  const handleMachineChange = (machineId: string) => {
    setSelectedMachineId(machineId)
    const costs = costsMap[machineId] || null
    reset(getDefaultValues(costs))
  }

  // Calculate preview values
  const watchedValues = watch()
  const calculatePreview = () => {
    const effectiveHours =
      (watchedValues.shift_hours_per_day || 8) *
      (watchedValues.working_days_per_year || 250) *
      ((watchedValues.oee_percentage || 65) / 100)

    const annualFixed =
      ((watchedValues.replacement_value || 0) / (watchedValues.economic_life_years || 10)) +
      ((watchedValues.floor_space_m2 || 0) * (watchedValues.cost_per_m2_yearly || 0)) +
      (watchedValues.software_subscriptions_yearly || 0) +
      (watchedValues.financing_costs_yearly || 0)

    const fixedPerHour = effectiveHours > 0 ? annualFixed / effectiveHours : 0

    const variablePerHour =
      ((watchedValues.power_kw || 0) * (watchedValues.average_load_factor || 0.7) * 0.85) + // Energy (0.85 PLN/kWh)
      (watchedValues.consumables_rate_hour || 0) +
      (watchedValues.maintenance_reserve_hour || 0)

    const operatorPerMachine = (watchedValues.operator_hourly_rate || 0) / (watchedValues.machines_per_operator || 1)

    return {
      effectiveHours: Math.round(effectiveHours),
      fixedPerHour: fixedPerHour.toFixed(2),
      variablePerHour: variablePerHour.toFixed(2),
      operatorPerMachine: operatorPerMachine.toFixed(2),
      totalRate: (fixedPerHour + variablePerHour + operatorPerMachine).toFixed(2),
    }
  }

  const preview = calculatePreview()

  const onSubmit = async (data: FormData) => {
    if (!selectedMachineId) return

    setIsSubmitting(true)
    const loadingToast = toast.loading('Zapisywanie kosztów maszyny...')

    try {
      const payload = {
        machine_id: selectedMachineId,
        company_id: companyId,
        ...data,
        updated_at: new Date().toISOString(),
      }

      if (existingCosts) {
        // Update existing
        const { error } = await supabase
          .from('machine_costs')
          .update(payload)
          .eq('id', existingCosts.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('machine_costs')
          .insert(payload)

        if (error) throw error
      }

      toast.dismiss(loadingToast)
      toast.success('Koszty maszyny zapisane!')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Nie udało się zapisać kosztów')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedMachine = machines.find(m => m.id === selectedMachineId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Machine List */}
      <div className="lg:col-span-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Wybierz maszynę</h2>
        <div className="space-y-2">
          {machines.map(machine => {
            const hasCosts = !!costsMap[machine.id]
            return (
              <button
                key={machine.id}
                onClick={() => handleMachineChange(machine.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selectedMachineId === machine.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-900 dark:text-white font-medium">{machine.name}</span>
                    {machine.code && (
                      <span className="text-slate-500 dark:text-slate-400 text-sm ml-2">({machine.code})</span>
                    )}
                  </div>
                  {hasCosts ? (
                    <span className="text-green-500 text-xs">Skonfigurowana</span>
                  ) : (
                    <span className="text-slate-400 text-xs">Brak danych</span>
                  )}
                </div>
                {(machine.manufacturer || machine.model) && (
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                    {machine.manufacturer} {machine.model}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Form */}
      <div className="lg:col-span-2">
        {selectedMachine && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {selectedMachine.name}
              </h2>
              {existingCosts && (
                <span className="text-green-500 text-sm">
                  Ostatnia aktualizacja: {new Date(existingCosts.updated_at).toLocaleDateString('pl-PL')}
                </span>
              )}
            </div>

            {/* Preview Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Podgląd stawki godzinowej</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-blue-200 text-xs">Efektywne h/rok</p>
                  <p className="text-2xl font-bold">{preview.effectiveHours}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Koszty stałe/h</p>
                  <p className="text-2xl font-bold">{preview.fixedPerHour} <span className="text-sm">PLN</span></p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Koszty zmienne/h</p>
                  <p className="text-2xl font-bold">{preview.variablePerHour} <span className="text-sm">PLN</span></p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs">Operator/h</p>
                  <p className="text-2xl font-bold">{preview.operatorPerMachine} <span className="text-sm">PLN</span></p>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <p className="text-blue-100 text-xs">RAZEM</p>
                  <p className="text-3xl font-bold">{preview.totalRate} <span className="text-sm">PLN/h</span></p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Fixed Costs Section */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Koszty stałe (roczne)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Wartość odtworzeniowa (PLN)
                    </label>
                    <input
                      type="number"
                      {...register('replacement_value', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="np. 250000"
                    />
                    <p className="text-slate-500 text-xs mt-1">Nie cena zakupu, a koszt zastąpienia</p>
                    {errors.replacement_value && (
                      <p className="text-red-500 text-xs mt-1">{errors.replacement_value.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Żywotność ekonomiczna (lata)
                    </label>
                    <input
                      type="number"
                      {...register('economic_life_years', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    {errors.economic_life_years && (
                      <p className="text-red-500 text-xs mt-1">{errors.economic_life_years.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Powierzchnia (m²)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('floor_space_m2', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="np. 12"
                    />
                    {errors.floor_space_m2 && (
                      <p className="text-red-500 text-xs mt-1">{errors.floor_space_m2.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Koszt hali (PLN/m²/rok)
                    </label>
                    <input
                      type="number"
                      {...register('cost_per_m2_yearly', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="np. 200"
                    />
                    <p className="text-slate-500 text-xs mt-1">Czynsz, podatki, media wspólne</p>
                    {errors.cost_per_m2_yearly && (
                      <p className="text-red-500 text-xs mt-1">{errors.cost_per_m2_yearly.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Software/licencje (PLN/rok)
                    </label>
                    <input
                      type="number"
                      {...register('software_subscriptions_yearly', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="np. 5000"
                    />
                    <p className="text-slate-500 text-xs mt-1">CAD/CAM, monitoring, itp.</p>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Koszty finansowania (PLN/rok)
                    </label>
                    <input
                      type="number"
                      {...register('financing_costs_yearly', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="np. 0"
                    />
                    <p className="text-slate-500 text-xs mt-1">Leasing, kredyt</p>
                  </div>
                </div>
              </div>

              {/* OEE & Working Time Section */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Czas pracy i OEE</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Godziny/dzień
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('shift_hours_per_day', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    {errors.shift_hours_per_day && (
                      <p className="text-red-500 text-xs mt-1">{errors.shift_hours_per_day.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Dni robocze/rok
                    </label>
                    <input
                      type="number"
                      {...register('working_days_per_year', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    {errors.working_days_per_year && (
                      <p className="text-red-500 text-xs mt-1">{errors.working_days_per_year.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      OEE (%)
                    </label>
                    <input
                      type="number"
                      {...register('oee_percentage', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Typowe: 65-85%</p>
                    {errors.oee_percentage && (
                      <p className="text-red-500 text-xs mt-1">{errors.oee_percentage.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Variable Costs Section */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Koszty zmienne (na godzinę)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Moc maszyny (kW)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('power_kw', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                      placeholder="np. 15"
                    />
                    {errors.power_kw && (
                      <p className="text-red-500 text-xs mt-1">{errors.power_kw.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Współczynnik obciążenia (0-1)
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      {...register('average_load_factor', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Typowo 0.6-0.8</p>
                    {errors.average_load_factor && (
                      <p className="text-red-500 text-xs mt-1">{errors.average_load_factor.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Zużywalne (PLN/h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('consumables_rate_hour', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Chłodziwo, oleje, filtry</p>
                    {errors.consumables_rate_hour && (
                      <p className="text-red-500 text-xs mt-1">{errors.consumables_rate_hour.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Rezerwa serwisowa (PLN/h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('maintenance_reserve_hour', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Na przeglądy i naprawy</p>
                    {errors.maintenance_reserve_hour && (
                      <p className="text-red-500 text-xs mt-1">{errors.maintenance_reserve_hour.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Operator Costs Section */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Koszty operatora</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Stawka operatora (PLN/h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('operator_hourly_rate', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Z narzutami pracodawcy</p>
                    {errors.operator_hourly_rate && (
                      <p className="text-red-500 text-xs mt-1">{errors.operator_hourly_rate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Maszyn na operatora
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('machines_per_operator', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">1 = dedykowany operator</p>
                    {errors.machines_per_operator && (
                      <p className="text-red-500 text-xs mt-1">{errors.machines_per_operator.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                      Stawka setupowca (PLN/h)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register('setup_specialist_rate', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">Do przezbrojenia</p>
                    {errors.setup_specialist_rate && (
                      <p className="text-red-500 text-xs mt-1">{errors.setup_specialist_rate.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => reset(getDefaultValues(existingCosts))}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition font-semibold"
                >
                  Resetuj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Zapisywanie...' : existingCosts ? 'Aktualizuj koszty' : 'Zapisz koszty'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
