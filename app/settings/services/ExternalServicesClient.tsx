'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import type { ExternalService } from '@/types/abc-pricing'
import { ABC_DEFAULTS } from '@/types/abc-pricing'

const serviceSchema = z.object({
  name: z.string().min(2, 'Nazwa musi mieć co najmniej 2 znaki'),
  description: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_contact: z.string().optional(),
  base_price: z.number().min(0, 'Cena musi być >= 0'),
  price_unit: z.enum(['szt', 'kg', 'm2', 'mb']),
  min_order_value: z.number().min(0).nullable(),
  handling_fee_percent: z.number().min(0).max(100),
  lead_time_days: z.number().min(0).max(365),
  is_active: z.boolean(),
})

type FormData = z.infer<typeof serviceSchema>

interface Props {
  services: ExternalService[]
  companyId: string
}

export default function ExternalServicesClient({ services, companyId }: Props) {
  const router = useRouter()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingService, setEditingService] = useState<ExternalService | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: getDefaultValues(null),
  })

  function getDefaultValues(service: ExternalService | null): FormData {
    return {
      name: service?.name ?? '',
      description: service?.description ?? '',
      vendor_name: service?.vendor_name ?? '',
      vendor_contact: service?.vendor_contact ?? '',
      base_price: service?.base_price ?? 0,
      price_unit: service?.price_unit ?? 'szt',
      min_order_value: service?.min_order_value ?? null,
      handling_fee_percent: service?.handling_fee_percent ?? ABC_DEFAULTS.handling_fee_percent,
      lead_time_days: service?.lead_time_days ?? 7,
      is_active: service?.is_active ?? true,
    }
  }

  const openAddForm = () => {
    setEditingService(null)
    reset(getDefaultValues(null))
    setIsFormOpen(true)
  }

  const openEditForm = (service: ExternalService) => {
    setEditingService(service)
    reset(getDefaultValues(service))
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingService(null)
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    const loadingToast = toast.loading(editingService ? 'Aktualizowanie usługi...' : 'Dodawanie usługi...')

    try {
      const payload = {
        company_id: companyId,
        ...data,
        updated_at: new Date().toISOString(),
      }

      if (editingService) {
        // Update existing
        const { error } = await supabase
          .from('external_services')
          .update(payload)
          .eq('id', editingService.id)

        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('external_services')
          .insert(payload)

        if (error) throw error
      }

      toast.dismiss(loadingToast)
      toast.success(editingService ? 'Usługa zaktualizowana!' : 'Usługa dodana!')
      closeForm()
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Nie udało się zapisać usługi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteService = async (service: ExternalService) => {
    if (!confirm(`Czy na pewno chcesz usunąć usługę "${service.name}"?`)) {
      return
    }

    const loadingToast = toast.loading('Usuwanie usługi...')

    try {
      const { error } = await supabase
        .from('external_services')
        .delete()
        .eq('id', service.id)

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Usługa usunięta!')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Nie udało się usunąć usługi')
    }
  }

  const toggleActive = async (service: ExternalService) => {
    const loadingToast = toast.loading(service.is_active ? 'Dezaktywacja...' : 'Aktywacja...')

    try {
      const { error } = await supabase
        .from('external_services')
        .update({ is_active: !service.is_active, updated_at: new Date().toISOString() })
        .eq('id', service.id)

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success(service.is_active ? 'Usługa dezaktywowana' : 'Usługa aktywowana')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Nie udało się zmienić statusu')
    }
  }

  const priceUnitLabels: Record<string, string> = {
    szt: 'za sztukę',
    kg: 'za kg',
    m2: 'za m²',
    mb: 'za mb',
  }

  return (
    <div>
      {/* Add Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={openAddForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          + Dodaj usługę
        </button>
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Brak usług kooperacyjnych</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Dodaj usługi zewnętrzne takie jak anodowanie, hartowanie czy malowanie proszkowe.
          </p>
          <button
            onClick={openAddForm}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Dodaj pierwszą usługę
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(service => (
            <div
              key={service.id}
              className={`bg-white dark:bg-slate-800 border rounded-lg p-4 ${
                service.is_active
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-slate-300 dark:border-slate-600 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-slate-900 dark:text-white font-semibold text-lg">{service.name}</span>
                    {!service.is_active && (
                      <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded">
                        Nieaktywna
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{service.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span className="text-slate-700 dark:text-slate-300">
                      <strong>{service.base_price.toFixed(2)} PLN</strong> {priceUnitLabels[service.price_unit]}
                    </span>
                    <span className="text-slate-500 dark:text-slate-500">
                      +{service.handling_fee_percent}% handling
                    </span>
                    <span className="text-slate-500 dark:text-slate-500">
                      Lead time: {service.lead_time_days} dni
                    </span>
                    {service.vendor_name && (
                      <span className="text-slate-500 dark:text-slate-500">
                        Dostawca: {service.vendor_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(service)}
                    className={`p-2 rounded-lg transition ${
                      service.is_active
                        ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                    title={service.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                  >
                    {service.is_active ? '⏸️' : '▶️'}
                  </button>
                  <button
                    onClick={() => openEditForm(service)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                    title="Edytuj"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteService(service)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Usuń"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {editingService ? 'Edytuj usługę' : 'Dodaj usługę'}
                </h2>
                <button
                  onClick={closeForm}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                  Nazwa usługi *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="np. Anodowanie czarne"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                  Opis
                </label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="Krótki opis usługi..."
                />
              </div>

              {/* Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                    Cena bazowa (PLN) *
                  </label>
                  <input
                    {...register('base_price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  {errors.base_price && (
                    <p className="text-red-500 text-xs mt-1">{errors.base_price.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                    Jednostka
                  </label>
                  <select
                    {...register('price_unit')}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="szt">za sztukę</option>
                    <option value="kg">za kg</option>
                    <option value="m2">za m²</option>
                    <option value="mb">za mb</option>
                  </select>
                </div>
              </div>

              {/* Handling Fee & Lead Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                    Handling fee (%)
                  </label>
                  <input
                    {...register('handling_fee_percent', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-slate-500 text-xs mt-1">Narzut za transport i obsługę</p>
                  {errors.handling_fee_percent && (
                    <p className="text-red-500 text-xs mt-1">{errors.handling_fee_percent.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                    Lead time (dni)
                  </label>
                  <input
                    {...register('lead_time_days', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  />
                  {errors.lead_time_days && (
                    <p className="text-red-500 text-xs mt-1">{errors.lead_time_days.message}</p>
                  )}
                </div>
              </div>

              {/* Min Order Value */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                  Minimalna wartość zamówienia (PLN)
                </label>
                <input
                  {...register('min_order_value', { valueAsNumber: true })}
                  type="number"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  placeholder="np. 100"
                />
                <p className="text-slate-500 text-xs mt-1">Opcjonalne - pozostaw puste jeśli brak minimum</p>
              </div>

              {/* Vendor Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                    Nazwa dostawcy
                  </label>
                  <input
                    {...register('vendor_name')}
                    type="text"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="np. Galwanizernia ABC"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">
                    Kontakt
                  </label>
                  <input
                    {...register('vendor_contact')}
                    type="text"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    placeholder="np. jan@galwanizernia.pl"
                  />
                </div>
              </div>

              {/* Active Checkbox */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register('is_active')}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-slate-700 dark:text-slate-300 font-medium">
                  Usługa aktywna
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-6 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Zapisywanie...' : editingService ? 'Zapisz zmiany' : 'Dodaj usługę'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
