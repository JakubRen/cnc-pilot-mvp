'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

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
    'Hartowanie',
    'Anodowanie',
    'Cynkowanie',
    'Malowanie proszkowe',
    'Szlifowanie',
    'Chromowanie',
    'Niklowanie',
    'Trawienie',
    'Piaskowanie',
    'Inne'
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
      toast.error('To zamówienie jest już dodane')
      return
    }
    setSelectedItems([
      ...selectedItems,
      {
        id: crypto.randomUUID(),
        order_id: order.id,
        order_number: order.order_number,
        part_name: order.part_name || `Zamówienie ${order.order_number}`,
        quantity: order.quantity
      }
    ])
  }

  const addCustomItem = () => {
    if (!customPartName.trim()) {
      toast.error('Podaj nazwę części')
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
      toast.error('Wybierz typ operacji')
      return
    }

    if (selectedItems.length === 0) {
      toast.error('Dodaj przynajmniej jedną pozycję')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Tworzenie wysyłki...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nie zalogowany')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) throw new Error('Brak firmy')

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
      toast.success('Wysyłka utworzona!')
      router.push('/cooperation')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Error creating operation:', error)
      toast.error('Nie udało się utworzyć wysyłki')
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
            <Link href="/cooperation" className="text-slate-400 hover:text-white">
              ← Wróć
            </Link>
            <h1 className="text-3xl font-bold text-white">Nowa wysyłka do kooperacji</h1>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Cooperant & Type */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Dane wysyłki</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-2">Kooperant</label>
                  <select
                    value={selectedCooperant}
                    onChange={(e) => setSelectedCooperant(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Wybierz kooperanta --</option>
                    {cooperants.map(coop => (
                      <option key={coop.id} value={coop.id}>
                        {coop.name} ({coop.service_type})
                      </option>
                    ))}
                  </select>
                  {cooperants.length === 0 && (
                    <p className="text-slate-500 text-sm mt-1">
                      <Link href="/cooperation/cooperants/add" className="text-blue-400 hover:underline">
                        Dodaj pierwszego kooperanta
                      </Link>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-slate-300 mb-2">Typ operacji *</label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Wybierz typ --</option>
                    {operationTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-2">Planowany powrót</label>
                  <Input
                    type="date"
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-2">Nr przesyłki / Kurier</label>
                  <Input
                    value={transportInfo}
                    onChange={(e) => setTransportInfo(e.target.value)}
                    placeholder="np. DHL 123456789"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-300 mb-2">Notatki</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dodatkowe informacje..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Pozycje do wysyłki</h2>

              {/* Add from orders */}
              <div className="mb-4">
                <label className="block text-slate-300 mb-2">Dodaj z zamówienia</label>
                <select
                  onChange={(e) => {
                    const order = orders.find(o => o.id === e.target.value)
                    if (order) addOrderToItems(order)
                    e.target.value = ''
                  }}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Wybierz zamówienie --</option>
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.customer_name} ({order.part_name || 'brak nazwy'})
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
                    placeholder="Nazwa części (ręcznie)"
                  />
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    value={customQuantity}
                    onChange={(e) => setCustomQuantity(e.target.value)}
                    placeholder="Ilość"
                  />
                </div>
                <Button type="button" variant="ghost" onClick={addCustomItem}>
                  + Dodaj
                </Button>
              </div>

              {/* Selected items list */}
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>Brak pozycji. Wybierz zamówienie lub dodaj ręcznie.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-slate-900 rounded-lg"
                    >
                      <div>
                        <span className="text-white font-medium">{item.part_name}</span>
                        <span className="text-slate-400 ml-2">({item.quantity} szt)</span>
                        {item.order_number && (
                          <span className="text-blue-400 ml-2 text-sm">• {item.order_number}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Usuń
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
                {isSubmitting ? 'Tworzenie...' : 'Utwórz wysyłkę'}
              </Button>
              <Link href="/cooperation">
                <Button type="button" variant="ghost">
                  Anuluj
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
