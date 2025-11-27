'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

const inventorySchema = z.object({
  sku: z.string().min(1, 'SKU wymagane'),
  name: z.string().min(2, 'Nazwa wymagana'),
  description: z.string().optional(),
  category: z.enum(['raw_material', 'part', 'tool', 'consumable', 'finished_good']),
  quantity: z.number().min(0, 'Ilość musi być dodatnia'),
  unit: z.string().min(1, 'Jednostka wymagana'),
  low_stock_threshold: z.number().min(0, 'Próg musi być dodatni'),
  location: z.string().optional(),
  supplier: z.string().optional(),
  unit_cost: z.number().min(0).optional(),
  batch_number: z.string().optional(),
  expiry_date: z.string().optional(),
  notes: z.string().optional(),
})

type InventoryFormData = z.infer<typeof inventorySchema>

interface EditInventoryFormProps {
  item: any
}

export default function EditInventoryForm({ item }: EditInventoryFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
  })

  // Pre-fill form
  useEffect(() => {
    setValue('sku', item.sku)
    setValue('name', item.name)
    setValue('description', item.description || '')
    setValue('category', item.category)
    setValue('quantity', Number(item.quantity))
    setValue('unit', item.unit)
    setValue('low_stock_threshold', Number(item.low_stock_threshold))
    setValue('location', item.location || '')
    setValue('supplier', item.supplier || '')
    setValue('unit_cost', item.unit_cost ? Number(item.unit_cost) : 0)
    setValue('batch_number', item.batch_number || '')
    setValue('expiry_date', item.expiry_date?.split('T')[0] || '')
    setValue('notes', item.notes || '')
  }, [item, setValue])

  const onSubmit = async (data: InventoryFormData) => {
    const loadingToast = toast.loading('Aktualizowanie pozycji...')

    const { error } = await supabase
      .from('inventory')
      .update({
        ...data,
        quantity: Number(data.quantity),
        low_stock_threshold: Number(data.low_stock_threshold),
        unit_cost: data.unit_cost ? Number(data.unit_cost) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    toast.dismiss(loadingToast)

    if (error) {
      if (error.code === '23505') {
        toast.error('SKU już istnieje')
      } else {
        toast.error('Nie udało się zaktualizować: ' + error.message)
      }
      return
    }

    toast.success('Pozycja zaktualizowana!')
    router.push('/inventory')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* SKU */}
        <div>
          <label htmlFor="edit_sku" className="block text-slate-300 mb-2">SKU *</label>
          <input
            id="edit_sku"
            {...register('sku')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none font-mono"
          />
          {errors.sku && <p className="text-red-400 text-sm mt-1">{errors.sku.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="edit_category" className="block text-slate-300 mb-2">Kategoria *</label>
          <select
            id="edit_category"
            {...register('category')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="raw_material">Materiał surowy</option>
            <option value="part">Część</option>
            <option value="tool">Narzędzie</option>
            <option value="consumable">Materiał zużywalny</option>
            <option value="finished_good">Gotowy produkt</option>
          </select>
        </div>

        {/* Name */}
        <div className="col-span-2">
          <label htmlFor="edit_name" className="block text-slate-300 mb-2">Nazwa *</label>
          <input
            id="edit_name"
            {...register('name')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="edit_quantity" className="block text-slate-300 mb-2">Ilość *</label>
          <input
            id="edit_quantity"
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>}
        </div>

        {/* Unit */}
        <div>
          <label htmlFor="edit_unit" className="block text-slate-300 mb-2">Jednostka *</label>
          <input
            id="edit_unit"
            {...register('unit')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.unit && <p className="text-red-400 text-sm mt-1">{errors.unit.message}</p>}
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label htmlFor="edit_low_stock_threshold" className="block text-slate-300 mb-2">Próg niskiego stanu *</label>
          <input
            id="edit_low_stock_threshold"
            {...register('low_stock_threshold', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.low_stock_threshold && <p className="text-red-400 text-sm mt-1">{errors.low_stock_threshold.message}</p>}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="edit_location" className="block text-slate-300 mb-2">Lokalizacja</label>
          <input
            id="edit_location"
            {...register('location')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Supplier */}
        <div>
          <label htmlFor="edit_supplier" className="block text-slate-300 mb-2">Dostawca</label>
          <input
            id="edit_supplier"
            {...register('supplier')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Unit Cost */}
        <div>
          <label htmlFor="edit_unit_cost" className="block text-slate-300 mb-2">Koszt jednostkowy (PLN)</label>
          <input
            id="edit_unit_cost"
            {...register('unit_cost', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Batch Number */}
        <div>
          <label htmlFor="edit_batch_number" className="block text-slate-300 mb-2">Numer partii/serii</label>
          <input
            id="edit_batch_number"
            {...register('batch_number')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>

        {/* Expiry Date */}
        <div>
          <label htmlFor="edit_expiry_date" className="block text-slate-300 mb-2">Data ważności</label>
          <input
            id="edit_expiry_date"
            {...register('expiry_date')}
            type="date"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label htmlFor="edit_description" className="block text-slate-300 mb-2">Opis</label>
          <textarea
            id="edit_description"
            {...register('description')}
            rows={2}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label htmlFor="edit_notes" className="block text-slate-300 mb-2">Notatki</label>
          <textarea
            id="edit_notes"
            {...register('notes')}
            rows={2}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
        >
          {isSubmitting ? 'Aktualizowanie...' : 'Zapisz zmiany'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/inventory')}
          className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          Anuluj
        </button>
      </div>
    </form>
  )
}
