'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { startTimer, stopTimer } from '@/lib/time-tracking-actions'

interface Order {
  id: string
  order_number: string
  part_name: string | null
  material: string | null
  customer_name: string
  quantity: number
}

interface DrawingFile {
  id: string
  url: string
  name: string
}

interface OrderItemData {
  part_name: string
  quantity: number
  drawing_file: DrawingFile[] | DrawingFile | null
}

interface PlanData {
  id: string
  plan_number: string
  order_items: OrderItemData[] | OrderItemData | null
}

interface AssignedOperation {
  id: string
  operation_number: number
  operation_type: string
  operation_name: string
  status: string
  production_plans: PlanData[] | PlanData | null
}

interface KioskClientProps {
  currentOrder: Order | null
  activeTimeLogId: string | null
  currentOrderStatus: 'idle' | 'running' | 'paused'
  assignedOperations: AssignedOperation[]
}

const operationTypeIcons: Record<string, string> = {
  milling: '🔧',
  turning: '⚙️',
  drilling: '🔩',
  grinding: '💎',
  cutting: '✂️',
  deburring: '🪛',
  quality_control: '✅',
  other: '🛠️',
}

const operationTypeLabels: Record<string, string> = {
  milling: 'Frezowanie',
  turning: 'Toczenie',
  drilling: 'Wiercenie',
  grinding: 'Szlifowanie',
  cutting: 'Cięcie',
  deburring: 'Gratowanie',
  quality_control: 'Kontrola jakości',
  other: 'Inne',
}

export default function KioskClient({ currentOrder, activeTimeLogId, currentOrderStatus, assignedOperations }: KioskClientProps) {
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
    <div className="w-full max-w-2xl space-y-6">
      {/* Current Order Card */}
      <div className="bg-card rounded-2xl shadow-2xl p-10 text-center border-4 border-violet-500 dark:border-violet-500">
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
            <h2 className="text-4xl font-bold mb-4 text-foreground">{currentOrder.order_number}</h2>
            <p className="text-2xl text-foreground mb-6">{currentOrder.part_name} - {currentOrder.material}</p>
            <p className="text-lg text-muted-foreground mb-8">Klient: {currentOrder.customer_name} | Ilość: {currentOrder.quantity}</p>

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
              {currentOrder.id && (
                <Link href={`/orders/${currentOrder.id}`} className="text-violet-400 hover:underline text-lg">
                  Zobacz szczegóły zlecenia
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="py-10">
            <p className="text-3xl font-bold text-muted-foreground mb-4">Brak aktywnych lub przypisanych zadań</p>
            <p className="text-lg text-slate-500 dark:text-muted-foreground">Sprawdź swój harmonogram lub skontaktuj się z przełożonym.</p>
          </div>
        )}
      </div>

      {/* Work Queue - Assigned Operations */}
      {assignedOperations.length > 0 && (
        <div className="bg-card rounded-2xl shadow-lg p-6 border border-border">
          <h3 className="text-2xl font-bold text-foreground mb-4 text-left">
            Twoje Operacje ({assignedOperations.length})
          </h3>
          <div className="space-y-3">
            {assignedOperations.map((op) => {
              const plan = Array.isArray(op.production_plans) ? op.production_plans[0] : op.production_plans
              const orderItem = plan?.order_items
                ? (Array.isArray(plan.order_items) ? plan.order_items[0] : plan.order_items)
                : null
              const drawingFile = orderItem?.drawing_file
                ? (Array.isArray(orderItem.drawing_file) ? orderItem.drawing_file[0] : orderItem.drawing_file)
                : null

              return (
                <div
                  key={op.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    op.status === 'in_progress'
                      ? 'border-violet-500 bg-violet-500/5'
                      : 'border-border hover:border-violet-300'
                  }`}
                >
                  {/* Drawing thumbnail */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                    {drawingFile?.url ? (
                      <img
                        src={drawingFile.url}
                        alt={drawingFile.name || 'Rysunek'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-3xl">
                        {operationTypeIcons[op.operation_type] || '🛠️'}
                      </span>
                    )}
                  </div>

                  {/* Operation info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        op.status === 'in_progress'
                          ? 'bg-violet-600 text-white'
                          : 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {op.status === 'in_progress' ? 'W toku' : 'Oczekuje'}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        #{op.operation_number}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground text-lg truncate">
                      {op.operation_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {operationTypeLabels[op.operation_type] || op.operation_type}
                      {orderItem?.part_name ? ` — ${orderItem.part_name}` : ''}
                      {plan?.plan_number ? ` (${plan.plan_number})` : ''}
                    </p>
                  </div>

                  {/* Quantity */}
                  {orderItem?.quantity && (
                    <div className="flex-shrink-0 text-right">
                      <span className="text-2xl font-bold text-foreground">
                        {orderItem.quantity}
                      </span>
                      <p className="text-xs text-muted-foreground">szt</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
