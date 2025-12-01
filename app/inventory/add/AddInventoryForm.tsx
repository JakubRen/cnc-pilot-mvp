'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useTranslation } from '@/hooks/useTranslation'
import { usePermissions } from '@/hooks/usePermissions'

type InventoryFormData = {
  sku: string
  name: string
  description?: string
  category: 'raw_material' | 'part' | 'tool' | 'consumable' | 'finished_good'
  quantity: number
  unit: string
  low_stock_threshold: number
  location?: string
  supplier?: string
  unit_cost?: number
  batch_number?: string
  expiry_date?: string
  notes?: string
}

export default function AddInventoryForm() {
  const router = useRouter()
  const { t } = useTranslation()
  const { canViewPrices } = usePermissions()
  const showPrices = canViewPrices('inventory')

  const inventorySchema = z.object({
    sku: z.string().min(1, t('inventory', 'skuRequired')),
    name: z.string().min(2, t('inventory', 'nameRequired')),
    description: z.string().optional(),
    category: z.enum(['raw_material', 'part', 'tool', 'consumable', 'finished_good']),
    quantity: z.number().min(0, t('inventory', 'quantityPositive')),
    unit: z.string().min(1, t('inventory', 'unitRequired')),
    low_stock_threshold: z.number().min(0, t('inventory', 'thresholdPositive')),
    location: z.string().optional(),
    supplier: z.string().optional(),
    unit_cost: z.number().min(0).optional(),
    batch_number: z.string().optional(),
    expiry_date: z.string().optional(),
    notes: z.string().optional(),
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      unit: 'pcs',
      low_stock_threshold: 10,
      quantity: 0,
      category: 'raw_material',
    }
  })

  const onSubmit = async (data: InventoryFormData) => {
    const loadingToast = toast.loading(t('inventory', 'creatingItem'))

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.dismiss(loadingToast)
      toast.error(t('inventory', 'notAuthenticated'))
      return
    }

    // Get user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      toast.dismiss(loadingToast)
      toast.error(t('auth', 'companyNotFound'))
      return
    }

    // Create inventory item
    const { data: newItem, error: itemError } = await supabase
      .from('inventory')
      .insert({
        ...data,
        quantity: Number(data.quantity),
        low_stock_threshold: Number(data.low_stock_threshold),
        unit_cost: data.unit_cost ? Number(data.unit_cost) : null,
        company_id: userData.company_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (itemError) {
      toast.dismiss(loadingToast)
      if (itemError.code === '23505') {
        toast.error(t('inventory', 'skuExists'))
      } else {
        toast.error(t('inventory', 'itemCreateFailed') + ': ' + itemError.message)
      }
      return
    }

    // Create initial transaction
    if (newItem && Number(data.quantity) > 0) {
      await supabase
        .from('inventory_transactions')
        .insert({
          item_id: newItem.id,
          transaction_type: 'initial',
          quantity: Number(data.quantity),
          quantity_after: Number(data.quantity),
          reason: 'Initial stock',
          batch_number: data.batch_number,
          company_id: userData.company_id,
          created_by: user.id,
        })
    }

    toast.dismiss(loadingToast)
    toast.success(t('inventory', 'itemCreated'))
    router.push('/inventory')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-slate-800 p-8 rounded-lg border border-slate-700">
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-slate-300 mb-2">{t('inventory', 'sku')} *</label>
          <input
            id="sku"
            autoFocus
            {...register('sku')}
            placeholder="ALU-6061-100"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none font-mono"
          />
          {errors.sku && <p className="text-red-400 text-sm mt-1">{errors.sku.message}</p>}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-slate-300 mb-2">{t('inventory', 'category')} *</label>
          <select
            id="category"
            {...register('category')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="raw_material">{t('inventory', 'rawMaterial')}</option>
            <option value="part">{t('inventory', 'part')}</option>
            <option value="tool">{t('inventory', 'tool')}</option>
            <option value="consumable">{t('inventory', 'consumable')}</option>
            <option value="finished_good">{t('inventory', 'finishedGood')}</option>
          </select>
        </div>

        {/* Name - Full Width */}
        <div className="col-span-2">
          <label htmlFor="name" className="block text-slate-300 mb-2">{t('common', 'name')} *</label>
          <input
            id="name"
            {...register('name')}
            placeholder="Aluminum 6061 Bar 100mm"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-slate-300 mb-2">{t('common', 'quantity')} *</label>
          <input
            id="quantity"
            {...register('quantity', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="0"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.quantity && <p className="text-red-400 text-sm mt-1">{errors.quantity.message}</p>}
        </div>

        {/* Unit */}
        <div>
          <label htmlFor="unit" className="block text-slate-300 mb-2">{t('inventory', 'unit')} *</label>
          <input
            id="unit"
            {...register('unit')}
            placeholder="pcs, kg, m, L"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.unit && <p className="text-red-400 text-sm mt-1">{errors.unit.message}</p>}
        </div>

        {/* Low Stock Threshold */}
        <div>
          <label htmlFor="low_stock_threshold" className="block text-slate-300 mb-2">{t('inventory', 'lowStockThreshold')} *</label>
          <input
            id="low_stock_threshold"
            {...register('low_stock_threshold', { valueAsNumber: true })}
            type="number"
            step="0.01"
            placeholder="10"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
          {errors.low_stock_threshold && <p className="text-red-400 text-sm mt-1">{errors.low_stock_threshold.message}</p>}
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-slate-300 mb-2">{t('inventory', 'location')}</label>
          <input
            id="location"
            {...register('location')}
            placeholder="A1, Shelf-3"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Supplier */}
        <div>
          <label htmlFor="supplier" className="block text-slate-300 mb-2">{t('inventory', 'supplier')}</label>
          <input
            id="supplier"
            {...register('supplier')}
            placeholder={t('inventory', 'supplier')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Unit Cost - TYLKO DLA UPRAWNIONYCH */}
        {showPrices && (
          <div>
            <label htmlFor="unit_cost" className="block text-slate-300 mb-2">{t('inventory', 'unitCost')}</label>
            <input
              id="unit_cost"
              {...register('unit_cost', { valueAsNumber: true })}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {/* Batch Number */}
        <div>
          <label htmlFor="batch_number" className="block text-slate-300 mb-2">{t('inventory', 'batchNumber')}</label>
          <input
            id="batch_number"
            {...register('batch_number')}
            placeholder={t('inventory', 'forTraceability')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none font-mono"
          />
        </div>

        {/* Expiry Date */}
        <div>
          <label htmlFor="expiry_date" className="block text-slate-300 mb-2">{t('inventory', 'expiryDate')}</label>
          <input
            id="expiry_date"
            {...register('expiry_date')}
            type="date"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="col-span-2">
          <label htmlFor="description" className="block text-slate-300 mb-2">{t('common', 'description')}</label>
          <textarea
            id="description"
            {...register('description')}
            rows={2}
            placeholder={t('inventory', 'additionalDetails')}
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label htmlFor="notes" className="block text-slate-300 mb-2">{t('common', 'notes')}</label>
          <textarea
            id="notes"
            {...register('notes')}
            rows={2}
            placeholder={t('inventory', 'internalNotes')}
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
          {isSubmitting ? t('inventory', 'creatingItem') : t('inventory', 'createItem')}
        </button>
        <button
          type="button"
          onClick={() => router.push('/inventory')}
          className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
        >
          {t('common', 'cancel')}
        </button>
      </div>
    </form>
  )
}
