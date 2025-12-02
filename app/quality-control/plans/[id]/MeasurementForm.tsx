'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface QCItem {
  id: string
  name: string
  nominal_value: number
  tolerance_plus: number
  tolerance_minus: number
  unit: string
  is_critical: boolean
}

interface Order {
  id: string
  order_number: string
  customer_name: string
}

interface MeasurementFormProps {
  planId: string
  items: QCItem[]
  orders: Order[]
  userId: number
  companyId: string
}

export default function MeasurementForm({ planId, items, orders, userId, companyId }: MeasurementFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [sampleNumber, setSampleNumber] = useState('1')
  const [measurements, setMeasurements] = useState<Record<string, string>>({})

  const updateMeasurement = (itemId: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [itemId]: value }))
  }

  const checkPass = (item: QCItem, value: number): boolean => {
    const min = item.nominal_value - item.tolerance_minus
    const max = item.nominal_value + item.tolerance_plus
    return value >= min && value <= max
  }

  const getStatus = (item: QCItem, value: string): 'ok' | 'nok' | 'empty' => {
    if (!value || value.trim() === '') return 'empty'
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return 'empty'
    return checkPass(item, numValue) ? 'ok' : 'nok'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const filledMeasurements = Object.entries(measurements).filter(
      ([, value]) => value && value.trim() !== ''
    )

    if (filledMeasurements.length === 0) {
      toast.error('Wprowadź przynajmniej jeden pomiar')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Zapisywanie pomiarów...')

    try {
      const measurementsToInsert = filledMeasurements.map(([itemId, value]) => {
        const item = items.find(i => i.id === itemId)!
        const numValue = parseFloat(value)
        const isPass = checkPass(item, numValue)

        return {
          company_id: companyId,
          order_id: selectedOrder || null,
          plan_id: planId,
          item_id: itemId,
          measured_value: numValue,
          is_pass: isPass,
          measured_by: userId,
          batch_number: batchNumber || null,
          sample_number: parseInt(sampleNumber) || 1
        }
      })

      const { error } = await supabase
        .from('quality_measurements')
        .insert(measurementsToInsert)

      if (error) throw error

      const passedCount = measurementsToInsert.filter(m => m.is_pass).length
      const totalCount = measurementsToInsert.length

      toast.dismiss(loadingToast)

      if (passedCount === totalCount) {
        toast.success(`Zapisano ${totalCount} pomiarów - wszystkie OK!`)
      } else {
        toast.error(`Zapisano ${totalCount} pomiarów - ${totalCount - passedCount} NOK!`)
      }

      // Reset form
      setMeasurements({})
      setSampleNumber(String(parseInt(sampleNumber) + 1))
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Error saving measurements:', error)
      toast.error('Nie udało się zapisać pomiarów')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      {/* Order & Sample Info */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-slate-400 text-xs mb-1">Zamówienie</label>
          <select
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">-- Wybierz --</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>
                {order.order_number} - {order.customer_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Nr partii</label>
          <Input
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="np. LOT-001"
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1">Nr próbki</label>
          <Input
            type="number"
            min="1"
            value={sampleNumber}
            onChange={(e) => setSampleNumber(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      {/* Measurement Inputs */}
      <div className="space-y-3">
        {items.map((item) => {
          const status = getStatus(item, measurements[item.id] || '')
          const borderColor = status === 'ok' ? 'border-green-500' : status === 'nok' ? 'border-red-500' : 'border-slate-600'
          const bgColor = status === 'ok' ? 'bg-green-900/20' : status === 'nok' ? 'bg-red-900/20' : 'bg-slate-900'

          return (
            <div
              key={item.id}
              className={`p-3 rounded-lg border ${borderColor} ${bgColor} transition-colors`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm">{item.name}</span>
                  {item.is_critical && (
                    <span className="px-1.5 py-0.5 bg-red-600/30 text-red-400 text-[10px] rounded">
                      KRYT
                    </span>
                  )}
                </div>
                <span className="text-slate-400 text-xs font-mono">
                  {item.nominal_value} ±{Math.max(item.tolerance_plus, item.tolerance_minus)} {item.unit}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.001"
                  value={measurements[item.id] || ''}
                  onChange={(e) => updateMeasurement(item.id, e.target.value)}
                  placeholder={String(item.nominal_value)}
                  className="flex-1 text-center font-mono text-lg"
                />
                <div className="w-16 text-center">
                  {status === 'ok' && (
                    <span className="text-green-400 font-bold text-lg">✓ OK</span>
                  )}
                  {status === 'nok' && (
                    <span className="text-red-400 font-bold text-lg">✕ NOK</span>
                  )}
                  {status === 'empty' && (
                    <span className="text-slate-600 text-sm">-</span>
                  )}
                </div>
              </div>

              {/* Tolerance visualization */}
              {measurements[item.id] && status !== 'empty' && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>{(item.nominal_value - item.tolerance_minus).toFixed(3)}</span>
                    <span>{item.nominal_value}</span>
                    <span>{(item.nominal_value + item.tolerance_plus).toFixed(3)}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full relative">
                    <div
                      className="absolute h-full bg-green-600/50 rounded-full"
                      style={{
                        left: '0%',
                        right: '0%'
                      }}
                    />
                    {/* Marker for measured value */}
                    {(() => {
                      const min = item.nominal_value - item.tolerance_minus * 2
                      const max = item.nominal_value + item.tolerance_plus * 2
                      const range = max - min
                      const value = parseFloat(measurements[item.id])
                      const position = ((value - min) / range) * 100
                      const clampedPosition = Math.max(0, Math.min(100, position))

                      return (
                        <div
                          className={`absolute w-2 h-4 -top-1 rounded ${status === 'ok' ? 'bg-green-400' : 'bg-red-400'}`}
                          style={{ left: `${clampedPosition}%`, transform: 'translateX(-50%)' }}
                        />
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        variant="primary"
        className="w-full mt-4"
      >
        {isSubmitting ? 'Zapisywanie...' : 'Zapisz pomiary'}
      </Button>
    </form>
  )
}
