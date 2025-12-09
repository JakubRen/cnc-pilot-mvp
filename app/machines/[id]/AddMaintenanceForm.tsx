'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface AddMaintenanceFormProps {
  machineId: string
  companyId: string
  userId: number
}

export default function AddMaintenanceForm({ machineId, companyId, userId }: AddMaintenanceFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('scheduled')
  const [description, setDescription] = useState('')
  const [laborHours, setLaborHours] = useState('')
  const [partsCost, setPartsCost] = useState('')
  const [laborCost, setLaborCost] = useState('')
  const [externalTechnician, setExternalTechnician] = useState('')
  const [markCompleted, setMarkCompleted] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Tytuł jest wymagany')
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading('Dodawanie wpisu...')

    try {
      const parts = parseFloat(partsCost) || 0
      const labor = parseFloat(laborCost) || 0
      const total = parts + labor

      const { error } = await supabase
        .from('maintenance_logs')
        .insert({
          company_id: companyId,
          machine_id: machineId,
          type,
          status: markCompleted ? 'completed' : 'planned',
          title: title.trim(),
          description: description || null,
          labor_hours: parseFloat(laborHours) || null,
          parts_cost: parts || null,
          labor_cost: labor || null,
          total_cost: total || null,
          external_technician: externalTechnician || null,
          performed_by: markCompleted ? userId : null,
          completed_at: markCompleted ? new Date().toISOString() : null,
          scheduled_date: !markCompleted ? new Date().toISOString().split('T')[0] : null,
          created_by: userId
        })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success(markCompleted ? 'Konserwacja zarejestrowana!' : 'Przegląd zaplanowany!')

      // Reset form
      setTitle('')
      setDescription('')
      setLaborHours('')
      setPartsCost('')
      setLaborCost('')
      setExternalTechnician('')
      setIsExpanded(false)

      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Error adding maintenance:', error)
      toast.error('Nie udało się dodać wpisu')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isExpanded) {
    return (
      <Button onClick={() => setIsExpanded(true)} variant="ghost" className="w-full">
        + Dodaj wpis konserwacji
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Tytuł *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="np. Wymiana oleju, Kalibracja osi X"
            required
          />
        </div>
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Typ</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="scheduled">Planowy przegląd</option>
            <option value="unscheduled">Nieplanowa konserwacja</option>
            <option value="repair">Naprawa</option>
            <option value="inspection">Inspekcja</option>
          </select>
        </div>
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Serwisant zewnętrzny</label>
          <Input
            value={externalTechnician}
            onChange={(e) => setExternalTechnician(e.target.value)}
            placeholder="np. Firma Serwisowa Sp. z o.o."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Opis</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Szczegóły wykonanych prac..."
            className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Godziny pracy</label>
          <Input
            type="number"
            step="0.5"
            min="0"
            value={laborHours}
            onChange={(e) => setLaborHours(e.target.value)}
            placeholder="np. 2.5"
          />
        </div>
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Koszt części (PLN)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={partsCost}
            onChange={(e) => setPartsCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-slate-700 dark:text-slate-300 mb-2 text-sm">Koszt robocizny (PLN)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={laborCost}
            onChange={(e) => setLaborCost(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={markCompleted}
              onChange={(e) => setMarkCompleted(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700 dark:text-slate-300 text-sm">Oznacz jako ukończone</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} variant="primary">
          {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setIsExpanded(false)}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}
