'use client'

import { SimilarOrder } from '@/lib/pricing-engine'
import Link from 'next/link'

interface SimilarOrdersWidgetProps {
  orders: SimilarOrder[]
  loading: boolean
}

export default function SimilarOrdersWidget({ orders, loading }: SimilarOrdersWidgetProps) {
  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse"></div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
        Ostatnie podobne zlecenia
      </h3>
      <div className="space-y-2">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            target="_blank"
            className="block bg-card border border-border rounded-lg p-3 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-750 transition group"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-violet-400 group-hover:text-violet-300 text-sm">
                #{order.order_number}
              </span>
              <span className="text-slate-500 text-xs">
                {new Date(order.created_at).toLocaleDateString('pl-PL')}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <div className="text-foreground text-sm font-medium truncate max-w-[140px]">
                  {order.part_name}
                </div>
                <div className="text-slate-500 text-xs">
                  {order.quantity} szt • {order.material}
                </div>
              </div>
              <div className="text-right">
                <div className="text-foreground font-bold text-sm">
                  {order.total_cost} zł
                </div>
                <div className="text-slate-500 text-[10px]">
                  {order.actual_hours || 0}h
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
