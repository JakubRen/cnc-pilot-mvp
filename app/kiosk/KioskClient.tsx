'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { startTimer, stopTimer } from '@/app/time-tracking/actions'

interface Order {
  id: string
  order_number: string
  part_name: string | null
  material: string | null
  customer_name: string
  quantity: number
}

interface KioskClientProps {
  currentOrder: Order | null
  activeTimeLogId: string | null
  currentOrderStatus: 'idle' | 'running' | 'paused'
}

export default function KioskClient({ currentOrder, activeTimeLogId, currentOrderStatus }: KioskClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStartWork = async () => {
    if (!currentOrder || isLoading) return
    setIsLoading(true)
    const loadingToast = toast.loading('Rozpoczynanie pracy...')

    const { success, message } = await startTimer(currentOrder.id)

    toast.dismiss(loadingToast)
    setIsLoading(false)

    if (success) {
      toast.success(message || 'Praca rozpoczęta pomyślnie!')
      router.refresh()
    } else {
      toast.error(message || 'Nie udało się rozpocząć pracy.')
    }
  }

  const handleStopWork = async () => {
    if (!activeTimeLogId || isLoading) return
    setIsLoading(true)
    const loadingToast = toast.loading('Zatrzymywanie pracy...')

    const { success, message } = await stopTimer(activeTimeLogId, 'completed') // Hardcoded completed for MVP

    toast.dismiss(loadingToast)
    setIsLoading(false)

    if (success) {
      toast.success(message || 'Praca zakończona pomyślnie!')
      router.refresh()
    } else {
      toast.error(message || 'Nie udało się zatrzymać pracy.')
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl shadow-2xl p-10 w-full max-w-2xl text-center border-4 border-blue-500">
      {currentOrder ? (
        <>
          <Badge
            variant={
              currentOrderStatus === 'running' ? 'default' :
              currentOrderStatus === 'paused' ? 'warning' :
              'outline'
            }
            className={`text-lg px-4 py-2 mb-4 ${currentOrderStatus === 'running' ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {currentOrderStatus === 'running' ? 'W TOKU' : currentOrderStatus === 'paused' ? 'ZATRZYMANO' : 'OCZEKUJĄCE'}
          </Badge>
          <h2 className="text-4xl font-bold mb-4">{currentOrder.order_number}</h2>
          <p className="text-2xl text-slate-300 mb-6">{currentOrder.part_name} - {currentOrder.material}</p>
          <p className="text-lg text-slate-400 mb-8">Klient: {currentOrder.customer_name} | Ilość: {currentOrder.quantity}</p>

          <div className="flex flex-col gap-4">
            {currentOrderStatus === 'running' ? (
              <Button
                onClick={handleStopWork}
                variant="danger"
                size="lg"
                className="w-full text-3xl py-8"
                disabled={isLoading}
              >
                AWARIA / ZATRZYMAJ
              </Button>
            ) : (
              <Button
                onClick={handleStartWork}
                variant="primary"
                size="lg"
                className="w-full text-3xl py-8 bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                START PRACY
              </Button>
            )}
            {/* Optional secondary action, e.g., view details */}
            {currentOrder.id && (
              <Link href={`/orders/${currentOrder.id}`} className="text-blue-400 hover:underline text-lg">
                Zobacz szczegóły zlecenia
              </Link>
            )}
          </div>
        </>
      ) : (
        <div className="py-10">
          <p className="text-3xl font-bold text-slate-400 mb-4">Brak aktywnych lub przypisanych zadań</p>
          <p className="text-lg text-slate-500">Sprawdź swój harmonogram lub skontaktuj się z przełożonym.</p>
        </div>
      )}
    </div>
  )
}
