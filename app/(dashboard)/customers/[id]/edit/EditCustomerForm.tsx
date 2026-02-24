'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Customer } from '@/types/customers'
import CountryAutocomplete from '@/components/form/CountryAutocomplete'
import CityAutocomplete from '@/components/form/CityAutocomplete'
import { customerSchema, type CustomerFormData } from '@/lib/validation-schemas'

interface EditCustomerFormProps {
  customer: Customer
}

export default function EditCustomerForm({ customer }: EditCustomerFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      type: customer.type,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      nip: customer.nip || '',
      street: customer.street || '',
      city: customer.city || '',
      postal_code: customer.postal_code || '',
      country: customer.country || 'Polska',
      notes: customer.notes || '',
    },
  })

  const selectedCountry = watch('country') || 'Polska'

  const onSubmit = async (data: CustomerFormData) => {
    const loadingToast = toast.loading('Aktualizowanie kontrahenta...')

    try {
      // Clean empty strings to null for optional fields
      const cleanedData = {
        ...data,
        type: data.type,
        email: data.email || null,
        phone: data.phone || null,
        nip: data.nip || null,
        street: data.street || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || 'Polska',
        notes: data.notes || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('customers')
        .update(cleanedData)
        .eq('id', customer.id)

      toast.dismiss(loadingToast)

      if (error) {
        toast.error(`Nie udało się zaktualizować kontrahenta: ${error.message}`)
        return
      }

      toast.success('Kontrahent zaktualizowany pomyślnie!')
      router.push(`/customers/${customer.id}`)
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Wystąpił błąd podczas aktualizacji kontrahenta')
      logger.error('Error updating customer', { error })
    }
  }

  return (
    <Card>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
              Podstawowe informacje
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Typ kontrahenta <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="relative flex items-center justify-center px-4 py-3 rounded-lg bg-muted border-2 border-border cursor-pointer hover:border-violet-500 dark:hover:border-violet-400 transition has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 dark:has-[:checked]:bg-violet-900/20">
                  <input
                    {...register('type')}
                    type="radio"
                    value="client"
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-foreground">
                    👤 Klient
                  </span>
                </label>
                <label className="relative flex items-center justify-center px-4 py-3 rounded-lg bg-muted border-2 border-border cursor-pointer hover:border-violet-500 dark:hover:border-violet-400 transition has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 dark:has-[:checked]:bg-violet-900/20">
                  <input
                    {...register('type')}
                    type="radio"
                    value="supplier"
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-foreground">
                    📦 Sprzedawca
                  </span>
                </label>
                <label className="relative flex items-center justify-center px-4 py-3 rounded-lg bg-muted border-2 border-border cursor-pointer hover:border-violet-500 dark:hover:border-violet-400 transition has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50 dark:has-[:checked]:bg-violet-900/20">
                  <input
                    {...register('type')}
                    type="radio"
                    value="cooperator"
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-foreground">
                    🤝 Kooperant
                  </span>
                </label>
              </div>
              {errors.type && (
                <p className="mt-1 text-sm text-red-500">{errors.type.message}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Klient - odbiorcy produktów | Sprzedawca - dostawcy materiałów | Kooperant - partnerzy współpracy
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nazwa kontrahenta <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="np. Firma XYZ Sp. z o.o."
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
              Dane kontaktowe
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="kontakt@firma.pl"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Telefon
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="123456789"
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                NIP
              </label>
              <input
                {...register('nip')}
                type="text"
                placeholder="1234567890"
                maxLength={10}
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              />
              {errors.nip && (
                <p className="mt-1 text-sm text-red-500">{errors.nip.message}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                10 cyfr bez myślników
              </p>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
              Adres
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Ulica
              </label>
              <input
                {...register('street')}
                type="text"
                placeholder="ul. Przykładowa 123"
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
              />
              {errors.street && (
                <p className="mt-1 text-sm text-red-500">{errors.street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Miasto
                </label>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <CityAutocomplete
                      value={field.value || ''}
                      onChange={field.onChange}
                      country={selectedCountry}
                      error={errors.city?.message}
                      placeholder="Wpisz nazwę miasta..."
                    />
                  )}
                />
                {errors.city && (
                  <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Kod pocztowy
                </label>
                <input
                  {...register('postal_code')}
                  type="text"
                  placeholder="00-000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none"
                />
                {errors.postal_code && (
                  <p className="mt-1 text-sm text-red-500">{errors.postal_code.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Kraj
              </label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <CountryAutocomplete
                    value={field.value || ''}
                    onChange={field.onChange}
                    error={errors.country?.message}
                    placeholder="Wybierz lub wpisz kraj..."
                  />
                )}
              />
              {errors.country && (
                <p className="mt-1 text-sm text-red-500">{errors.country.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground border-b border-border pb-2">
              Dodatkowe informacje
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Notatki
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                placeholder="Dodatkowe informacje o kliencie..."
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:border-violet-500 focus:outline-none resize-none"
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-border">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-violet-600 hover:bg-violet-700"
            >
              {isSubmitting ? 'Zapisywanie...' : '✓ Zapisz zmiany'}
            </Button>
            <Link href={`/customers/${customer.id}`} className="flex-1">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
              >
                Anuluj
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
