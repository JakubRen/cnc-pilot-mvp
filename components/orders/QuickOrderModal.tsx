'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Dialog } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import DatePicker from '@/components/ui/DatePicker'
import CustomerSelect from '@/components/customers/CustomerSelect'
import QuickAddCustomerModal from '@/components/customers/QuickAddCustomerModal'
import { supabase } from '@/lib/supabase'
import { sanitizeText } from '@/lib/sanitization'
import { logger } from '@/lib/logger'
import type { Customer } from '@/types/customers'

const quickOrderSchema = z.object({
  customer_name: z.string().min(2, 'Nazwa klienta jest wymagana'),
  part_name: z.string().min(1, 'Nazwa części jest wymagana'),
  quantity: z.number().int().min(1, 'Ilość musi być min. 1'),
  deadline: z.string().min(1, 'Termin jest wymagany'),
  material: z.string().optional(),
})

interface QuickOrderModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  userId: number
}

export default function QuickOrderModal({ isOpen, onClose, companyId, userId }: QuickOrderModalProps) {
  const router = useRouter()

  // Form state
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerError, setCustomerError] = useState('')
  const [partName, setPartName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [material, setMaterial] = useState('')
  const [deadline, setDeadline] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)
  const [pendingCustomerName, setPendingCustomerName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Generate order number when modal opens
  useEffect(() => {
    if (isOpen && companyId) {
      setIsGenerating(true)
      supabase.rpc('generate_order_number', { p_company_id: companyId })
        .then(({ data, error }: { data: string | null; error: { message: string } | null }) => {
          if (error) {
            logger.error('Failed to generate order number', { error })
            setOrderNumber('ORD-TEMP-0001')
          } else {
            setOrderNumber(data || 'ORD-TEMP-0001')
          }
          setIsGenerating(false)
        })
    }
  }, [isOpen, companyId])

  const resetForm = () => {
    setCustomerId('')
    setCustomerName('')
    setCustomerError('')
    setPartName('')
    setQuantity(1)
    setMaterial('')
    setDeadline('')
    setOrderNumber('')
    setErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCustomerChange = (cId: string | null, name: string) => {
    setCustomerId(cId || '')
    setCustomerName(name || '')
    setCustomerError('')
    setErrors(prev => ({ ...prev, customer_name: '' }))
  }

  const handleCreateNewCustomer = (name: string) => {
    setPendingCustomerName(name)
    setIsQuickAddOpen(true)
  }

  const handleCustomerCreated = (customer: Customer) => {
    setCustomerId(customer.id)
    setCustomerName(customer.name)
    setIsQuickAddOpen(false)
    toast.success(`Klient "${customer.name}" dodany!`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate with Zod
    const result = quickOrderSchema.safeParse({
      customer_name: customerName,
      part_name: partName,
      quantity,
      deadline,
      material: material || undefined,
    })

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) fieldErrors[issue.path[0] as string] = issue.message
      })
      setErrors(fieldErrors)
      if (!customerId) setCustomerError('Wybierz klienta z listy lub dodaj nowego')
      return
    }

    if (!customerId) {
      setCustomerError('Wybierz klienta z listy lub dodaj nowego')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Tworzę zamówienie...')

    try {
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          customer_name: sanitizeText(customerName),
          part_name: sanitizeText(partName),
          quantity,
          material: material ? sanitizeText(material) : null,
          deadline,
          status: 'pending',
          created_by: userId,
          company_id: companyId,
        })
        .select('id')
        .single()

      if (orderError || !insertedOrder) {
        toast.dismiss(loadingToast)
        toast.error(`Błąd: ${orderError?.message || 'Nieznany błąd'}`)
        return
      }

      // Also create a single order_item
      await supabase.from('order_items').insert({
        order_id: insertedOrder.id,
        part_name: sanitizeText(partName),
        material: material ? sanitizeText(material) : null,
        quantity,
      })

      toast.dismiss(loadingToast)
      toast.success(`Zamówienie ${orderNumber} utworzone!`)
      handleClose()
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Błąd podczas tworzenia zamówienia')
      logger.error('Quick order error', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Szybkie Zamówienie"
        panelClassName="w-full max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Order number preview */}
          <div className="text-sm text-muted-foreground">
            Nr: <span className="font-mono font-semibold text-foreground">
              {isGenerating ? 'Generowanie...' : orderNumber}
            </span>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Klient *
            </label>
            <CustomerSelect
              value={customerId}
              onChange={handleCustomerChange}
              onCreateNew={handleCreateNewCustomer}
              error={customerError || errors.customer_name}
            />
          </div>

          {/* Part name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Nazwa części *
            </label>
            <Input
              value={partName}
              onChange={(e) => {
                setPartName(e.target.value)
                setErrors(prev => ({ ...prev, part_name: '' }))
              }}
              placeholder="np. Flansza Ø100"
              className={errors.part_name ? 'border-red-500' : ''}
            />
            {errors.part_name && (
              <p className="text-red-500 text-xs mt-1">{errors.part_name}</p>
            )}
          </div>

          {/* Quantity + Material row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Ilość *
              </label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  setErrors(prev => ({ ...prev, quantity: '' }))
                }}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Materiał
              </label>
              <Input
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="np. Stal 1.4301"
              />
            </div>
          </div>

          {/* Deadline */}
          <div>
            <DatePicker
              label="Termin *"
              value={deadline}
              onChange={(val) => {
                setDeadline(val)
                setErrors(prev => ({ ...prev, deadline: '' }))
              }}
              required
              minDate={new Date()}
              placeholder="Wybierz termin..."
              error={errors.deadline}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              isLoading={isSubmitting}
              loadingText="Tworzę..."
              className="flex-1 bg-green-600 hover:bg-green-700 border-0"
            >
              Utwórz zamówienie
            </Button>
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
            >
              Anuluj
            </Button>
          </div>
        </form>
      </Dialog>

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
