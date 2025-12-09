'use client'

import { useState, useMemo } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { EventClickArg, DateSelectArg } from '@fullcalendar/core'
import Link from 'next/link'
import { useTheme } from '@/components/theme/ThemeProvider'

interface Order {
  id: string
  order_number: string
  customer_name: string
  part_name?: string
  quantity?: number
  deadline?: string
  status: string
  assigned_operator?: { name: string }
}

interface ProductionCalendarProps {
  orders: Order[]
}

// Status colors - Light theme
const lightStatusColors: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  in_progress: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  completed: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
  delayed: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  cancelled: { bg: '#e2e8f0', border: '#64748b', text: '#475569' },
}

// Status colors - Dark theme
const darkStatusColors: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: 'rgba(251, 191, 36, 0.2)', border: '#fbbf24', text: '#fef3c7' },
  in_progress: { bg: 'rgba(59, 130, 246, 0.2)', border: '#60a5fa', text: '#dbeafe' },
  completed: { bg: 'rgba(16, 185, 129, 0.2)', border: '#34d399', text: '#d1fae5' },
  delayed: { bg: 'rgba(239, 68, 68, 0.2)', border: '#f87171', text: '#fecaca' },
  cancelled: { bg: 'rgba(100, 116, 139, 0.2)', border: '#94a3b8', text: '#e2e8f0' },
}

export default function ProductionCalendar({ orders }: ProductionCalendarProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'dayGridWeek'>('dayGridMonth')
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Select theme-appropriate colors
  const statusColors = isDark ? darkStatusColors : lightStatusColors

  // Convert orders to calendar events
  const events = useMemo(() => {
    return orders
      .filter(order => order.deadline)
      .map(order => {
        const colors = statusColors[order.status] || statusColors.pending
        return {
          id: order.id,
          title: `${order.order_number} - ${order.customer_name}`,
          start: order.deadline,
          allDay: true,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: {
            order,
          },
        }
      })
  }, [orders, statusColors])

  const handleEventClick = (info: EventClickArg) => {
    const order = info.event.extendedProps.order as Order
    setSelectedOrder(order)
  }

  const handleDateSelect = (info: DateSelectArg) => {
    // Could open a modal to create new order with this deadline
    console.log('Selected dates:', info.startStr, info.endStr)
  }

  const statusLabels: Record<string, string> = {
    pending: 'Oczekujące',
    in_progress: 'W realizacji',
    completed: 'Zakończone',
    delayed: 'Opóźnione',
    cancelled: 'Anulowane',
  }

  return (
    <div className="flex gap-6">
      {/* Calendar */}
      <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
        {/* View switcher */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('dayGridMonth')}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              view === 'dayGridMonth'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Miesiąc
          </button>
          <button
            onClick={() => setView('dayGridWeek')}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              view === 'dayGridWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Tydzień
          </button>
          <button
            onClick={() => setView('timeGridWeek')}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              view === 'timeGridWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            Oś czasu
          </button>
        </div>

        {/* Calendar component */}
        <div className={isDark ? 'fc-dark-theme' : 'fc-light-theme'}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            key={view}
            events={events}
            eventClick={handleEventClick}
            selectable={true}
            select={handleDateSelect}
            locale="pl"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            buttonText={{
              today: 'Dziś',
              month: 'Miesiąc',
              week: 'Tydzień',
              day: 'Dzień',
            }}
            height="auto"
            dayMaxEvents={4}
            eventDisplay="block"
            firstDay={1} // Monday
          />
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">Legenda:</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(statusColors).map(([status, colors]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }}
                />
                <span className="text-slate-500 dark:text-slate-400 text-xs">{statusLabels[status]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected order details */}
      {selectedOrder && (
        <div className="w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Szczegóły zamówienia</h3>
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Numer zamówienia</p>
              <p className="text-slate-900 dark:text-white font-semibold">{selectedOrder.order_number}</p>
            </div>

            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Klient</p>
              <p className="text-slate-900 dark:text-white">{selectedOrder.customer_name}</p>
            </div>

            {selectedOrder.part_name && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Część</p>
                <p className="text-slate-900 dark:text-white">{selectedOrder.part_name}</p>
              </div>
            )}

            {selectedOrder.quantity && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Ilość</p>
                <p className="text-slate-900 dark:text-white">{selectedOrder.quantity} szt.</p>
              </div>
            )}

            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Termin</p>
              <p className="text-slate-900 dark:text-white">
                {selectedOrder.deadline
                  ? new Date(selectedOrder.deadline).toLocaleDateString('pl-PL')
                  : '-'}
              </p>
            </div>

            <div>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Status</p>
              <span
                className="inline-block px-2 py-1 rounded text-xs font-medium mt-1"
                style={{
                  backgroundColor: statusColors[selectedOrder.status]?.bg,
                  color: statusColors[selectedOrder.status]?.text,
                }}
              >
                {statusLabels[selectedOrder.status]}
              </span>
            </div>

            {selectedOrder.assigned_operator && (
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Operator</p>
                <p className="text-slate-900 dark:text-white">{selectedOrder.assigned_operator.name}</p>
              </div>
            )}

            <Link
              href={`/orders/${selectedOrder.id}`}
              className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition mt-4"
            >
              Zobacz zamówienie →
            </Link>
          </div>
        </div>
      )}

      {/* Styles for both themes */}
      <style jsx global>{`
        /* Light theme */
        .fc-light-theme .fc {
          --fc-border-color: #e2e8f0;
          --fc-page-bg-color: #ffffff;
          --fc-neutral-bg-color: #f1f5f9;
          --fc-list-event-hover-bg-color: #f1f5f9;
          --fc-today-bg-color: rgba(59, 130, 246, 0.1);
        }

        .fc-light-theme .fc-theme-standard td,
        .fc-light-theme .fc-theme-standard th {
          border-color: #e2e8f0;
        }

        .fc-light-theme .fc-col-header-cell-cushion,
        .fc-light-theme .fc-daygrid-day-number {
          color: #334155;
        }

        .fc-light-theme .fc-button-primary {
          background-color: #e2e8f0;
          border-color: #e2e8f0;
          color: #334155;
        }

        .fc-light-theme .fc-button-primary:hover {
          background-color: #cbd5e1;
          border-color: #cbd5e1;
          color: #1e293b;
        }

        .fc-light-theme .fc-button-primary:disabled {
          background-color: #f1f5f9;
          border-color: #f1f5f9;
        }

        .fc-light-theme .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #3b82f6;
          border-color: #3b82f6;
          color: #ffffff;
        }

        .fc-light-theme .fc-toolbar-title {
          color: #0f172a;
        }

        .fc-light-theme .fc-daygrid-day.fc-day-today {
          background-color: rgba(59, 130, 246, 0.1);
        }

        .fc-light-theme .fc-daygrid-event {
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 11px;
          cursor: pointer;
        }

        .fc-light-theme .fc-more-link {
          color: #64748b;
        }

        /* Dark theme */
        .fc-dark-theme .fc {
          --fc-border-color: #334155;
          --fc-page-bg-color: #1e293b;
          --fc-neutral-bg-color: #334155;
          --fc-list-event-hover-bg-color: #475569;
          --fc-today-bg-color: rgba(59, 130, 246, 0.1);
        }

        .fc-dark-theme .fc-theme-standard td,
        .fc-dark-theme .fc-theme-standard th {
          border-color: #334155;
        }

        .fc-dark-theme .fc-col-header-cell-cushion,
        .fc-dark-theme .fc-daygrid-day-number {
          color: #e2e8f0;
        }

        .fc-dark-theme .fc-button-primary {
          background-color: #475569;
          border-color: #475569;
        }

        .fc-dark-theme .fc-button-primary:hover {
          background-color: #64748b;
          border-color: #64748b;
        }

        .fc-dark-theme .fc-button-primary:disabled {
          background-color: #334155;
          border-color: #334155;
        }

        .fc-dark-theme .fc-button-primary:not(:disabled).fc-button-active {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }

        .fc-dark-theme .fc-toolbar-title {
          color: #f1f5f9;
        }

        .fc-dark-theme .fc-daygrid-day.fc-day-today {
          background-color: rgba(59, 130, 246, 0.15);
        }

        .fc-dark-theme .fc-daygrid-event {
          border-radius: 4px;
          padding: 2px 4px;
          font-size: 11px;
          cursor: pointer;
        }

        .fc-dark-theme .fc-more-link {
          color: #94a3b8;
        }
      `}</style>
    </div>
  )
}
