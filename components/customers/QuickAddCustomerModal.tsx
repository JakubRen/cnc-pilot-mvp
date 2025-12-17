'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import type { Customer } from '@/types/customers'
import { useEffect } from 'react'

const quickCustomerSchema = z.object({
  name: z.string()
    .min(2, 'Nazwa musi mieć przynajmniej 2 znaki')
    .max(100, 'Nazwa nie może przekraczać 100 znaków'),
  email: z.string()
    .email('Nieprawidłowy adres email')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .min(9, 'Numer telefonu musi mieć przynajmniej 9 cyfr')
    .max(15, 'Numer telefonu nie może przekraczać 15 cyfr')
    .optional()
    .or(z.literal('')),
  nip: z.string()
    .length(10, 'NIP musi składać się z 10 cyfr')
    .regex(/^\d+$/, 'NIP może zawierać tylko cyfry')
    .optional()
    .or(z.literal('')),
})

type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>

interface QuickAddCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (customer: Customer) => void
  initialName?: string
  companyId: string
  userId: number
}

export default function QuickAddCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  initialName = '',
  companyId,
  userId,
}: QuickAddCustomerModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<QuickCustomerFormData>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: {
      name: initialName,
    },
  })

  // Update name when initialName changes
  useEffect(() => {
    if (initialName) {
      setValue('name', initialName)
    }
  }, [initialName, setValue])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const onSubmit = async (data: QuickCustomerFormData) => {
    const loadingToast = toast.loading('Dodawanie klienta...')

    try {
      // Clean empty strings to null
      const cleanedData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        nip: data.nip || null,
        company_id: companyId,
        created_by: userId,
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert(cleanedData)
        .select()
        .single()

      toast.dismiss(loadingToast)

      if (error) {
        toast.error(`Nie udało się dodać klienta: ${error.message}`)
        return
      }

      toast.success('Klient dodany pomyślnie!')
      onSuccess(customer as Customer)
      reset()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Wystąpił błąd podczas dodawania klienta')
      logger.error('Error adding customer in quick modal', { error })
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Dodaj nowego klienta
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Uzupełnij podstawowe dane kontaktowe
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Nazwa klienta <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                type="text"
                autoFocus
                placeholder="np. Firma XYZ Sp. z o.o."
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="kontakt@firma.pl"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Phone and NIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Telefon
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="123456789"
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  NIP
                </label>
                <input
                  {...register('nip')}
                  type="text"
                  placeholder="1234567890"
                  maxLength={10}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
                {errors.nip && (
                  <p className="mt-1 text-sm text-red-500">{errors.nip.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  10 cyfr bez myślników
                </p>
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-500 dark:border-blue-400 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 Dodatkowe dane (adres, notatki) możesz uzupełnić później w zakładce Klienci
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Dodawanie...' : '✓ Dodaj klienta'}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
                className="px-8"
              >
                Anuluj
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
