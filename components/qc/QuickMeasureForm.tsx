'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'

interface OrderItem {
  id: string
  part_name: string
  length: number | null
  width: number | null
  height: number | null
  tolerance_length: number | null
  tolerance_width: number | null
  tolerance_height: number | null
}

interface QuickMeasureFormProps {
  orderItem: OrderItem
  orderId: string
  companyId: string
  userId: number
  onSuccess?: () => void
  onCancel?: () => void
}

interface Measurement {
  length: string
  width: string
  height: string
}

interface PassStatus {
  length: boolean | null
  width: boolean | null
  height: boolean | null
}

/**
 * Sprawdza czy pomiar mieści się w tolerancji
 * @param measured - zmierzona wartość
 * @param nominal - wartość nominalna
 * @param tolerance - tolerancja symetryczna (+/-)
 */
function checkPass(measured: number, nominal: number, tolerance: number): boolean {
  return measured >= (nominal - tolerance) && measured <= (nominal + tolerance)
}

export default function QuickMeasureForm({
  orderItem,
  orderId,
  companyId,
  userId,
  onSuccess,
  onCancel,
}: QuickMeasureFormProps) {
  const [measurements, setMeasurements] = useState<Measurement>({
    length: '',
    width: '',
    height: '',
  })
  const [notes, setNotes] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [sampleNumber, setSampleNumber] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Domyślne tolerancje jeśli nie podano
  const toleranceLength = orderItem.tolerance_length ?? 0.1
  const toleranceWidth = orderItem.tolerance_width ?? 0.1
  const toleranceHeight = orderItem.tolerance_height ?? 0.1

  // Real-time pass/fail status
  const getPassStatus = (): PassStatus => {
    const result: PassStatus = { length: null, width: null, height: null }

    if (orderItem.length && measurements.length) {
      result.length = checkPass(Number(measurements.length), orderItem.length, toleranceLength)
    }
    if (orderItem.width && measurements.width) {
      result.width = checkPass(Number(measurements.width), orderItem.width, toleranceWidth)
    }
    if (orderItem.height && measurements.height) {
      result.height = checkPass(Number(measurements.height), orderItem.height, toleranceHeight)
    }

    return result
  }

  const passStatus = getPassStatus()
  const allPass = Object.values(passStatus).every(v => v === true || v === null)
  const hasAnyMeasurement = measurements.length || measurements.width || measurements.height

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasAnyMeasurement) {
      toast.error('Wprowadz przynajmniej jeden pomiar')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Zapisywanie pomiarow...')

    try {
      // Przygotuj pomiary do zapisania (tylko te które mają wartość nominalną i pomiar)
      const measurementsToInsert = []

      if (orderItem.length && measurements.length) {
        const measuredValue = Number(measurements.length)
        measurementsToInsert.push({
          company_id: companyId,
          order_id: orderId,
          order_item_id: orderItem.id,
          plan_id: null, // Quick measure - bez planu!
          item_id: null, // Bez quality_control_items
          dimension_type: 'length',
          nominal_value: orderItem.length,
          tolerance_value: toleranceLength,
          measured_value: measuredValue,
          is_pass: checkPass(measuredValue, orderItem.length, toleranceLength),
          measured_by: userId,
          notes: notes || null,
          batch_number: batchNumber || null,
          sample_number: sampleNumber,
        })
      }

      if (orderItem.width && measurements.width) {
        const measuredValue = Number(measurements.width)
        measurementsToInsert.push({
          company_id: companyId,
          order_id: orderId,
          order_item_id: orderItem.id,
          plan_id: null,
          item_id: null,
          dimension_type: 'width',
          nominal_value: orderItem.width,
          tolerance_value: toleranceWidth,
          measured_value: measuredValue,
          is_pass: checkPass(measuredValue, orderItem.width, toleranceWidth),
          measured_by: userId,
          notes: notes || null,
          batch_number: batchNumber || null,
          sample_number: sampleNumber,
        })
      }

      if (orderItem.height && measurements.height) {
        const measuredValue = Number(measurements.height)
        measurementsToInsert.push({
          company_id: companyId,
          order_id: orderId,
          order_item_id: orderItem.id,
          plan_id: null,
          item_id: null,
          dimension_type: 'height',
          nominal_value: orderItem.height,
          tolerance_value: toleranceHeight,
          measured_value: measuredValue,
          is_pass: checkPass(measuredValue, orderItem.height, toleranceHeight),
          measured_by: userId,
          notes: notes || null,
          batch_number: batchNumber || null,
          sample_number: sampleNumber,
        })
      }

      if (measurementsToInsert.length === 0) {
        toast.dismiss(loadingToast)
        toast.error('Brak wymiarow nominalnych do porownania')
        return
      }

      const { error } = await supabase
        .from('quality_measurements')
        .insert(measurementsToInsert)

      toast.dismiss(loadingToast)

      if (error) {
        logger.error('Failed to insert quick measurements', { error })
        toast.error('Blad zapisu: ' + error.message)
        return
      }

      const allMeasurementsPass = measurementsToInsert.every(m => m.is_pass)
      if (allMeasurementsPass) {
        toast.success('Pomiary zapisane - wszystko OK!')
      } else {
        toast.success('Pomiary zapisane - wykryto odchylenia!')
      }

      onSuccess?.()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Wystapil blad podczas zapisu')
      logger.error('Quick measure error', { error })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: boolean | null) => {
    if (status === null) return null
    return status ? (
      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">
        OK
      </span>
    ) : (
      <span className="ml-2 px-2 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold">
        NOK
      </span>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-lg border border-violet-200 dark:border-violet-700/50">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Szybki pomiar: {orderItem.part_name}
        </h3>
        <p className="text-sm text-muted-foreground">
          Wprowadz zmierzone wartosci. System automatycznie sprawdzi zgodnosc z tolerancjami.
        </p>
      </div>

      {/* Measurements Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Length */}
        {orderItem.length && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Dlugosc (L)</label>
              {getStatusBadge(passStatus.length)}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Nominal: <span className="font-semibold text-foreground">{orderItem.length} mm</span>
              <span className="text-violet-500 ml-1">±{toleranceLength}</span>
            </div>
            <Input
              type="number"
              step="0.001"
              placeholder="Zmierzona wartosc"
              value={measurements.length}
              onChange={(e) => setMeasurements(prev => ({ ...prev, length: e.target.value }))}
              className={passStatus.length === false ? 'border-red-500 focus:border-red-500' : passStatus.length === true ? 'border-green-500 focus:border-green-500' : ''}
            />
            {passStatus.length !== null && (
              <div className="mt-1 text-xs">
                {passStatus.length ? (
                  <span className="text-green-600 dark:text-green-400">
                    W zakresie {orderItem.length - toleranceLength} - {orderItem.length + toleranceLength}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    Poza zakresem! ({orderItem.length - toleranceLength} - {orderItem.length + toleranceLength})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Width */}
        {orderItem.width && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Szerokosc (W)</label>
              {getStatusBadge(passStatus.width)}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Nominal: <span className="font-semibold text-foreground">{orderItem.width} mm</span>
              <span className="text-violet-500 ml-1">±{toleranceWidth}</span>
            </div>
            <Input
              type="number"
              step="0.001"
              placeholder="Zmierzona wartosc"
              value={measurements.width}
              onChange={(e) => setMeasurements(prev => ({ ...prev, width: e.target.value }))}
              className={passStatus.width === false ? 'border-red-500 focus:border-red-500' : passStatus.width === true ? 'border-green-500 focus:border-green-500' : ''}
            />
            {passStatus.width !== null && (
              <div className="mt-1 text-xs">
                {passStatus.width ? (
                  <span className="text-green-600 dark:text-green-400">
                    W zakresie {orderItem.width - toleranceWidth} - {orderItem.width + toleranceWidth}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    Poza zakresem! ({orderItem.width - toleranceWidth} - {orderItem.width + toleranceWidth})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Height */}
        {orderItem.height && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Wysokosc (H)</label>
              {getStatusBadge(passStatus.height)}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Nominal: <span className="font-semibold text-foreground">{orderItem.height} mm</span>
              <span className="text-violet-500 ml-1">±{toleranceHeight}</span>
            </div>
            <Input
              type="number"
              step="0.001"
              placeholder="Zmierzona wartosc"
              value={measurements.height}
              onChange={(e) => setMeasurements(prev => ({ ...prev, height: e.target.value }))}
              className={passStatus.height === false ? 'border-red-500 focus:border-red-500' : passStatus.height === true ? 'border-green-500 focus:border-green-500' : ''}
            />
            {passStatus.height !== null && (
              <div className="mt-1 text-xs">
                {passStatus.height ? (
                  <span className="text-green-600 dark:text-green-400">
                    W zakresie {orderItem.height - toleranceHeight} - {orderItem.height + toleranceHeight}
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400">
                    Poza zakresem! ({orderItem.height - toleranceHeight} - {orderItem.height + toleranceHeight})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* No dimensions warning */}
      {!orderItem.length && !orderItem.width && !orderItem.height && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700/50 text-center">
          <p className="text-yellow-700 dark:text-yellow-400">
            Ta pozycja nie ma zdefiniowanych wymiarow. Dodaj wymiary w edycji zamowienia.
          </p>
        </div>
      )}

      {/* Additional info */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Numer partii</label>
          <Input
            placeholder="np. LOT-2026-001"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Numer probki</label>
          <Input
            type="number"
            min={1}
            value={sampleNumber}
            onChange={(e) => setSampleNumber(Number(e.target.value) || 1)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Notatki</label>
          <Input
            placeholder="Uwagi do pomiaru..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      {hasAnyMeasurement && (
        <div className={`p-4 rounded-lg border ${allPass ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50'}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{allPass ? '✅' : '❌'}</span>
            <span className={`font-semibold ${allPass ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              {allPass ? 'Wszystkie pomiary w tolerancji' : 'Wykryto odchylenia od tolerancji'}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting || !hasAnyMeasurement}
          isLoading={isSubmitting}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          Zapisz pomiary
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Anuluj
          </Button>
        )}
      </div>
    </form>
  )
}
