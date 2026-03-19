'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { sanitizeText } from '@/lib/sanitization'
import toast from 'react-hot-toast'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import DatePicker from '@/components/ui/DatePicker'
import CustomerSelect from '@/components/customers/CustomerSelect'
import QuickAddCustomerModal from '@/components/customers/QuickAddCustomerModal'
import { BoltIcon } from '@heroicons/react/24/outline'

interface QuickOrderModalProps {
  companyId: string
  userId: number
}

export default function QuickOrderModal({ companyId, userId }: QuickOrderModalProps) {
  const router = useRouter()

  // Modal state
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [partName, setPartName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [material, setMaterial] = useState('')
  const [deadline, setDeadline] = useState('')

  // Quick add customer
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [pendingCustomerName, setPendingCustomerName] = useState('')

  // Validation
  const [customerError, setCustomerError] = useState('')

  const resetForm = () => {
    setCustomerId(null)
    setCustomerName('')
    setPartName('')
    setQuantity(1)
    setMaterial('')
    setDeadline('')
    setCustomerError('')
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false)
      resetForm()
    }
  }

  const handleCustomerChange = (id: string | null, name: string) => {
    setCustomerId(id)
    setCustomerName(name)
    setCustomerError('')
  }

  const handleCreateNewCustomer = (name: string) => {
    setPendingCustomerName(name)
    setIsQuickAddOpen(true)
  }

  const handleCustomerCreated = (customer: { id: string; name: string }) => {
    setCustomerId(customer.id)
    setCustomerName(customer.name)
    setCustomerError('')
    setIsQuickAddOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!customerId) {
      setCustomerError('Wybierz klienta z listy lub dodaj nowego')
      return
    }
    if (!partName.trim()) {
      toast.error('Nazwa detalu jest wymagana')
      return
    }
    if (quantity < 1) {
      toast.error('Ilość musi być minimum 1')
      return
    }
    if (!deadline) {
      toast.error('Termin jest wymagany')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Tworzenie zamówienia...')

    try {
      // Generate order number
      const { data: orderNumber, error: rpcError } = await supabase
        .rpc('generate_order_number', { p_company_id: companyId })

      if (rpcError || !orderNumber) {
        toast.dismiss(loadingToast)
        toast.error('Nie udało się wygenerować numeru zamówienia')
        return
      }

      const cleanPartName = sanitizeText(partName)
      const cleanMaterial = material.trim() ? sanitizeText(material) : null

      // Insert order
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          customer_name: sanitizeText(customerName),
          part_name: cleanPartName || null,
          material: cleanMaterial,
          quantity,
          deadline,
          status: 'pending',
          notes: null,
          material_cost: 0,
          labor_cost: 0,
          overhead_cost: 0,
          total_cost: 0,
          assigned_operator_id: null,
          created_by: userId,
          company_id: companyId,
        })
        .select('id')
        .single()

      if (orderError || !insertedOrder) {
        toast.dismiss(loadingToast)
        toast.error(`Błąd tworzenia zamówienia: ${orderError?.message}`)
        return
      }

      // Insert single order item
      const { error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: insertedOrder.id,
          part_name: cleanPartName || 'Bez nazwy',
          material: cleanMaterial,
          quantity,
        })

      if (itemError) {
        toast.error('Zamówienie utworzone, ale nie udało się zapisać pozycji: ' + itemError.message)
      }

      toast.dismiss(loadingToast)
      toast.success(`Zamówienie ${orderNumber} utworzone`)
      handleClose()
      router.refresh()
    } catch {
      toast.dismiss(loadingToast)
      toast.error('Wystąpił błąd podczas tworzenia zamówienia')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <BoltIcon className="h-4 w-4" />
        Szybkie Zamówienie
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Szybkie Zamówienie"
        panelClassName="max-w-lg overflow-visible"
      >
        <p className="mt-1 text-sm text-muted-foreground">
          Klient zadzwonił? Wpisz dane i gotowe.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Klient */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Klient <span className="text-red-500">*</span>
            </label>
            <CustomerSelect
              value={customerId}
              onChange={handleCustomerChange}
              onCreateNew={handleCreateNewCustomer}
              error={customerError}
            />
          </div>

          {/* Nazwa detalu */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nazwa detalu <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="np. Tuleja 50mm, Wałek Ø30"
              required
            />
          </div>

          {/* Ilość + Materiał */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Ilość <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Materiał
              </label>
              <Input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="np. Stal 45, Aluminium"
              />
            </div>
          </div>

          {/* Termin */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Termin <span className="text-red-500">*</span>
            </label>
            <DatePicker
              value={deadline}
              onChange={setDeadline}
              placeholder="Wybierz termin"
              minDate={new Date()}
              required
            />
          </div>

          {/* Przyciski */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText="Tworzenie..."
              className="flex-1 bg-green-600 hover:bg-green-700 border-0 text-white"
            >
              Utwórz zamówienie
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Quick Add Customer Modal — renders above Dialog (z-[100] > z-50) */}
      <QuickAddCustomerModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleCustomerCreated}
        initialName={pendingCustomerName}
        companyId={companyId}
        userId={userId}
      />
    </>
  )
}
