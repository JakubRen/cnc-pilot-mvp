'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { ProductFormData, productCategoryLabels, productUnitLabels } from '@/types/products'

const productSchema = z.object({
  sku: z.string().min(1, 'SKU wymagane'),
  name: z.string().min(2, 'Nazwa musi mieć min. 2 znaki'),
  category: z.enum(['raw_material', 'finished_good', 'semi_finished', 'tool', 'consumable']),
  unit: z.enum(['kg', 'm', 'szt', 'l']),
  description: z.string().optional(),
  default_unit_cost: z.number().min(0).optional(),
  manufacturer: z.string().optional(),
  manufacturer_sku: z.string().optional(),
})

export default function AddProductPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  })

  const onSubmit = async (data: ProductFormData) => {
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

            {/* Submit */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg text-lg"
              >
                {isSubmitting ? 'Zapisuję...' : '✓ Dodaj Towar'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold transition"
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
