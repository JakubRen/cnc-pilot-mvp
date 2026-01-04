'use client'

import { useEffect } from 'react'

interface ClientDebuggerProps {
  plan: any
  order: any
}

export function ClientDebugger({ plan, order }: ClientDebuggerProps) {
  useEffect(() => {
    console.log('[CLIENT DEBUG] ========================================')
    console.log('[CLIENT DEBUG] Production Plan Data (from server):')
    console.log('[CLIENT DEBUG] ========================================')
    console.log('[CLIENT DEBUG] plan.id:', plan.id)
    console.log('[CLIENT DEBUG] plan.plan_number:', plan.plan_number)
    console.log('[CLIENT DEBUG] plan.order_id:', plan.order_id)
    console.log('[CLIENT DEBUG] plan.order_id type:', typeof plan.order_id)
    console.log('[CLIENT DEBUG] plan.order_id truthy?:', !!plan.order_id)
    console.log('[CLIENT DEBUG] ========================================')
    console.log('[CLIENT DEBUG] Order Data (from JOIN):')
    console.log('[CLIENT DEBUG] ========================================')
    console.log('[CLIENT DEBUG] order:', order)
    console.log('[CLIENT DEBUG] order?.id:', order?.id)
    console.log('[CLIENT DEBUG] order type:', typeof order)
    console.log('[CLIENT DEBUG] order truthy?:', !!order)
    console.log('[CLIENT DEBUG] ========================================')
    console.log('[CLIENT DEBUG] Conditional Evaluation:')
    console.log('[CLIENT DEBUG] ========================================')
    console.log('[CLIENT DEBUG] (plan.order_id || order?.id):', (plan.order_id || order?.id))
    console.log('[CLIENT DEBUG] Will render link?:', !!(plan.order_id || order?.id))
    console.log('[CLIENT DEBUG] ========================================')
  }, [plan, order])

  return null // Invisible component
}
