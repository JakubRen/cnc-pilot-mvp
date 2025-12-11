'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { sanitizeText } from '@/lib/sanitization'

export default function AddMachinePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [model, setModel] = useState('')
  const [location, setLocation] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [warrantyUntil, setWarrantyUntil] = useState('')
  const [maintenanceInterval, setMaintenanceInterval] = useState('90')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Nazwa maszyny jest wymagana')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Dodawanie maszyny...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nie zalogowany')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id, company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) throw new Error('Brak firmy')

      // Sanitize user inputs to prevent XSS attacks
      const sanitizedName = sanitizeText(name.trim())
      const sanitizedCode = code ? sanitizeText(code) : null
      const sanitizedSerialNumber = serialNumber ? sanitizeText(serialNumber) : null
      const sanitizedManufacturer = manufacturer ? sanitizeText(manufacturer) : null
      const sanitizedModel = model ? sanitizeText(model) : null
      const sanitizedLocation = location ? sanitizeText(location) : null
      const sanitizedNotes = notes ? sanitizeText(notes) : null

      // Calculate next maintenance date
      const intervalDays = parseInt(maintenanceInterval) || 90
      const nextMaintenanceDate = new Date()
      nextMaintenanceDate.setDate(nextMaintenanceDate.getDate() + intervalDays)

      const { error } = await supabase
        .from('machines')
        .insert({
          company_id: userProfile.company_id,
          name: sanitizedName,
          code: sanitizedCode,
          serial_number: sanitizedSerialNumber,
          manufacturer: sanitizedManufacturer,
          model: sanitizedModel,
          location: sanitizedLocation,
          purchase_date: purchaseDate || null,
          warranty_until: warrantyUntil || null,
          maintenance_interval_days: intervalDays,
          next_maintenance_date: nextMaintenanceDate.toISOString().split('T')[0],
          notes: sanitizedNotes,
          created_by: userProfile.id
        })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success('Maszyna dodana!')
      router.push('/machines')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error adding machine', { error })
      toast.error('Nie udało się dodać maszyny')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/machines" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              ← Wróć
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Nowa maszyna</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Identyfikacja</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Nazwa maszyny *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Tokarka CNC Mazak QTN-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Kod wewnętrzny</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="np. CNC-01"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Numer seryjny</label>
                  <Input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="np. SN123456789"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Producent</label>
                  <Input
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="np. Mazak, DMG MORI, Haas"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Model</label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="np. QTN-200MY"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Lokalizacja i daty</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Lokalizacja</label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="np. Hala A, Stanowisko 3"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Data zakupu</label>
                  <Input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Gwarancja do</label>
                  <Input
                    type="date"
                    value={warrantyUntil}
                    onChange={(e) => setWarrantyUntil(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Konserwacja</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Interwał przeglądów (dni)</label>
                  <Input
                    type="number"
                    min="1"
                    value={maintenanceInterval}
                    onChange={(e) => setMaintenanceInterval(e.target.value)}
                    placeholder="90"
                  />
                  <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                    Co ile dni przypominać o przeglądzie (domyślnie 90 dni / kwartalnie)
                  </p>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">Notatki</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Dodatkowe informacje o maszynie..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="flex-1"
              >
                {isSubmitting ? 'Dodawanie...' : 'Dodaj maszynę'}
              </Button>
              <Link href="/machines">
                <Button type="button" variant="ghost">Anuluj</Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
