'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { useTranslation } from '@/hooks/useTranslation'

interface Cooperant {
  id: string
  name: string
  service_type: string
  avg_lead_days: number
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  part_name: string
  quantity: number
}

interface SelectedItem {
  id: string
  order_id?: string
  order_number?: string
  part_name: string
  quantity: number
}

export default function SendToCooperationPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooperants, setCooperants] = useState<Cooperant[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  // Form state
  const [selectedCooperant, setSelectedCooperant] = useState('')
  const [operationType, setOperationType] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [notes, setNotes] = useState('')
  const [transportInfo, setTransportInfo] = useState('')
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  // Custom item input
  const [customPartName, setCustomPartName] = useState('')
  const [customQuantity, setCustomQuantity] = useState('1')

  const operationTypes = [
    { key: 'opHartowanie', value: 'Hartowanie' },
    { key: 'opAnodowanie', value: 'Anodowanie' },
    { key: 'opCynkowanie', value: 'Cynkowanie' },
    { key: 'opMalowanie', value: 'Malowanie proszkowe' },
    { key: 'opSzlifowanie', value: 'Szlifowanie' },
    { key: 'opChromowanie', value: 'Chromowanie' },
    { key: 'opNiklowanie', value: 'Niklowanie' },
    { key: 'opTrawienie', value: 'Trawienie' },
    { key: 'opPiaskowanie', value: 'Piaskowanie' },
    { key: 'opInne', value: 'Inne' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_id', user.id)
      .single()

    if (!userProfile?.company_id) return

    // Load cooperants
    const { data: coops } = await supabase
      .from('cooperants')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .eq('is_active', true)
      .order('name')

    if (coops) setCooperants(coops)

    // Load active orders
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, part_name, quantity')
      .eq('company_id', userProfile.company_id)
      .in('status', ['pending', 'in_progress'])
      .order('deadline')

    if (activeOrders) setOrders(activeOrders)
  }

  // When cooperant is selected, update operation type and expected date
  useEffect(() => {
    if (selectedCooperant) {
      const coop = cooperants.find(c => c.id === selectedCooperant)
      if (coop) {
        if (!operationType) setOperationType(coop.service_type)
        if (!expectedReturnDate && coop.avg_lead_days) {
          const returnDate = new Date()
          returnDate.setDate(returnDate.getDate() + coop.avg_lead_days)
          setExpectedReturnDate(returnDate.toISOString().split('T')[0])
        }
      }
    }
  }, [selectedCooperant, cooperants, operationType, expectedReturnDate])

  const addOrderToItems = (order: Order) => {
    if (selectedItems.some(item => item.order_id === order.id)) {
      toast.error(t('cooperation', 'orderAlreadyAdded' as any))
      return
    }
    setSelectedItems([
      ...selectedItems,
      {
        id: crypto.randomUUID(),
        order_id: order.id,
        order_number: order.order_number,
        part_name: order.part_name || `${t('orders', 'order')} ${order.order_number}`,
        quantity: order.quantity
      }
    ])
  }

  const addCustomItem = () => {
    if (!customPartName.trim()) {
      toast.error(t('cooperation', 'enterPartName' as any))
      return
    }
    setSelectedItems([
      ...selectedItems,
      {
        id: crypto.randomUUID(),
        part_name: customPartName,
        quantity: parseInt(customQuantity) || 1
      }
    ])
    setCustomPartName('')
    setCustomQuantity('1')
  }

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!operationType) {
      toast.error(t('cooperation', 'selectOperationType' as any))
      return
    }

    if (selectedItems.length === 0) {
      toast.error(t('cooperation', 'addAtLeastOneItem' as any))
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading(t('cooperation', 'creatingShipment' as any))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('cooperation', 'notLoggedIn' as any))

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) throw new Error(t('cooperation', 'noCompany' as any))

      // Generate operation number
      const { data: opNumber } = await supabase
        .rpc('generate_operation_number', { p_company_id: userProfile.company_id })

      // Create external operation
      const { data: operation, error: opError } = await supabase
        .from('external_operations')
        .insert({
          company_id: userProfile.company_id,
          cooperant_id: selectedCooperant || null,
          operation_number: opNumber || `EXT-${Date.now()}`,
          operation_type: operationType,
          status: 'pending',
          expected_return_date: expectedReturnDate || null,
          notes: notes || null,
          transport_info: transportInfo || null,
          sent_by: userProfile.id
        })
        .select()
        .single()

      if (opError) throw opError

      // Create operation items
      const itemsToInsert = selectedItems.map(item => ({
        external_operation_id: operation.id,
        order_id: item.order_id || null,
        part_name: item.part_name,
        quantity: item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('external_operation_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Update orders status to external_processing if linked
      const orderIds = selectedItems
        .filter(item => item.order_id)
        .map(item => item.order_id)

      if (orderIds.length > 0) {
        await supabase
          .from('orders')
          .update({ status: 'external_processing' })
          .in('id', orderIds)
      }

      toast.dismiss(loadingToast)
      toast.success(t('cooperation', 'shipmentCreated' as any))
      router.push('/cooperation')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error creating operation', { error })
      toast.error(t('cooperation', 'shipmentCreateError' as any))
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
            <Link href="/cooperation" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              ← {t('common', 'back')}
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('cooperation', 'newShipment' as any)}</h1>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Cooperant & Type */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'shipmentData' as any)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'cooperant' as any)}</label>
                  <select
                    value={selectedCooperant}
                    onChange={(e) => setSelectedCooperant(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">{t('cooperation', 'selectCooperant' as any)}</option>
                    {cooperants.map(coop => (
                      <option key={coop.id} value={coop.id}>
                        {coop.name} ({coop.service_type})
                      </option>
                    ))}
                  </select>
                  {cooperants.length === 0 && (
                    <p className="text-slate-500 text-sm mt-1">
                      <Link href="/cooperation/cooperants/add" className="text-blue-400 hover:underline">
                        {t('cooperation', 'addFirstCooperant' as any)}
                      </Link>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'operationType' as any)} *</label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">{t('cooperation', 'selectType' as any)}</option>
                    {operationTypes.map(type => (
                      <option key={type.key} value={type.value}>{t('cooperation', type.key as any)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'expectedReturn' as any)}</label>
                  <Input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'trackingNumber' as any)}</label>
                  <Input
                    value={transportInfo}
                    onChange={(e) => setTransportInfo(e.target.value)}
                    placeholder={t('cooperation', 'trackingPlaceholder' as any)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('common', 'notes')}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('cooperation', 'notesPlaceholder' as any)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'shipmentItems' as any)}</h2>

              {/* Add from orders */}
              <div className="mb-4">
                <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'addFromOrder' as any)}</label>
                <select
                  onChange={(e) => {
                    const order = orders.find(o => o.id === e.target.value)
                    if (order) addOrderToItems(order)
                    e.target.value = ''
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">{t('cooperation', 'selectOrder' as any)}</option>
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.customer_name} ({order.part_name || t('cooperation', 'noName' as any)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Add custom item */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <Input
                    value={customPartName}
                    onChange={(e) => setCustomPartName(e.target.value)}
                    placeholder={t('cooperation', 'partNameManual' as any)}
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(e.target.value)}
                    placeholder={t('common', 'quantity')}
                  />
                </div>
                <Button type="button" variant="ghost" onClick={addCustomItem}>
                  + {t('cooperation', 'addButton' as any)}
                </Button>
              </div>

              {/* Selected items list */}
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>{t('cooperation', 'noItems')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                    >
                      <div>
                        <span className="text-slate-900 dark:text-white font-medium">{item.part_name}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-2">({item.quantity} {t('common', 'pcs')})</span>
                        {item.order_number && (
                          <span className="text-blue-400 ml-2 text-sm">• {item.order_number}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        {t('common', 'remove' as any)}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="flex-1"
              >
                {isSubmitting ? t('cooperation', 'creating' as any) : t('cooperation', 'createShipment' as any)}
              </Button>
              <Link href="/cooperation">
                <Button type="button" variant="ghost">
                  {t('common', 'cancel')}
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
