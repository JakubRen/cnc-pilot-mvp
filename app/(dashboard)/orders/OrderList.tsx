'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/hooks/useTranslation'
import { usePermissions } from '@/hooks/usePermissions'
import { PriceDisplay } from '@/components/permissions'
import { duplicateOrder } from '@/app/(dashboard)/orders/actions'
import { useConfirmation } from '@/components/ui/ConfirmationDialog'
import CompletionLikelihoodBadge from '@/components/orders/CompletionLikelihoodBadge'
import QualityRiskBadge from '@/components/orders/QualityRiskBadge'

interface Order {
  id: string
  order_number: string
  customer_name: string
  quantity: number
  deadline: string
  status: string
  total_cost?: number | null
  assigned_operator_name?: string | null
  part_name?: string | null
  tags?: Array<{ id: string; name: string; color: string }>
  /** AI-predicted on-time completion likelihood (0-100), populated by smart-deadline CRON */
  completion_likelihood?: number | null
  completion_recommendation?: string | null
  /** AI-predicted quality defect risk (0-100) */
  quality_risk?: number | null
  quality_risk_level?: 'low' | 'medium' | 'high' | null
  quality_risk_factors?: Array<{ factor: string; weight: number }>
}

interface OrderListProps {
  orders: Order[]
  currentUserRole: string
  selectedOrders: Set<string>
  onToggleSelect: (orderId: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  isPending?: (orderId: string) => boolean
}

export default function OrderList({
  orders,
  currentUserRole,
  selectedOrders,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  isPending = () => false,
}: OrderListProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const { canViewPrices } = usePermissions()
  const { confirm, ConfirmDialog } = useConfirmation()
  const showPrices = canViewPrices('orders')
  const allSelected = orders.length > 0 && orders.every(order => selectedOrders.has(order.id))
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if order is overdue
  const isOrderOverdue = (deadline: string, status: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return deadlineDate <= today && status !== 'completed' && status !== 'cancelled'
  }

    const handleDelete = async (orderId: string, orderNumber: string) => {
      const confirmed = await confirm({
        title: t('orders', 'deleteConfirm'),
        description: `${t('orders', 'order')} #${orderNumber} - ${t('common', 'undoOperation')}`,
        confirmText: t('common', 'delete'),
        cancelText: t('common', 'cancel'),
        variant: 'danger',
      })

      if (!confirmed) return

      const loadingToast = toast.loading(t('orders', 'deleting'))

      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      toast.dismiss(loadingToast)

      if (error) {
        toast.error(`${t('orders', 'deleteFailed')}: ${error.message}`)
        return
      }

      toast.success(`${t('orders', 'order')} #${orderNumber} ${t('orders', 'deleted')}`)
      router.refresh()
    }

    const handleDuplicate = async (orderId: string, orderNumber: string) => {
      const confirmed = await confirm({
        title: t('orders', 'duplicateConfirm'),
        description: `${t('orders', 'order')} #${orderNumber}`,
        confirmText: t('common', 'duplicate'),
        cancelText: t('common', 'cancel'),
        variant: 'info',
      })
      if (!confirmed) return

      const loadingToast = toast.loading(t('orders', 'duplicating'))

      const { success, error, newOrderId } = await duplicateOrder(orderId)

      toast.dismiss(loadingToast)

      if (!success) {
        toast.error(`${t('orders', 'duplicateFailed')}: ${error}`)
        return
      }

      toast.success(`${t('orders', 'order')} #${orderNumber} ${t('orders', 'duplicated')}`)
      router.push(`/orders/${newOrderId}/edit`)
      router.refresh()
    }

    if (!orders || orders.length === 0) {
      return (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-lg">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">{t('orders', 'noOrders')}</h3>
          <p className="text-muted-foreground mb-6">{t('orders', 'startCreating')}</p>
          <Link href="/orders/add">
            <Button variant="primary">
              {t('orders', 'createFirst')}
            </Button>
          </Link>
        </div>
      )
    }

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'completed': return <Badge variant="success">{t('orderStatus', 'completed')}</Badge>
        case 'in_progress': return <Badge variant="default">{t('orderStatus', 'in_progress')}</Badge>
        case 'delayed': return <Badge variant="warning">{t('orderStatus', 'delayed')}</Badge>
        case 'cancelled': return <Badge variant="secondary">{t('orderStatus', 'cancelled')}</Badge>
        default: return <Badge variant="outline">{t('orderStatus', 'pending')}</Badge>
      }
    }

    return (
      <>
        <ConfirmDialog />
        {/* Desktop View - Table (hidden on mobile) */}
        <div
          className="hidden md:block bg-card border border-border rounded-lg overflow-hidden"
          role="region"
          aria-label="Lista zamówień"
        >
          <table className="w-full" role="table" aria-label="Tabela zamówień">
            <thead className="bg-muted">
              <tr role="row">
                <th className="px-4 py-3 text-left" role="columnheader" scope="col">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => allSelected ? onDeselectAll() : onSelectAll()}
                    className="w-4 h-4 rounded border-border bg-white dark:bg-muted text-violet-600 focus:ring-violet-500 focus:ring-offset-white dark:focus:ring-offset-slate-800 cursor-pointer"
                    title={allSelected ? t('orders', 'deselectAll') : t('orders', 'selectAll')}
                    aria-label={allSelected ? 'Odznacz wszystkie zamówienia' : 'Zaznacz wszystkie zamówienia'}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                  {t('orders', 'orderNumber')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                  {t('orders', 'customer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                  {t('common', 'quantity')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                  {t('orders', 'deadline')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col" title="Prawdopodobienstwo terminowej realizacji (AI)">
                  AI %
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col" title="Ryzyko wad jakościowych (AI)">
                  Jakość
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                  {t('common', 'status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                  Operator
                </th>
                {showPrices && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                    {t('common', 'cost')}
                  </th>
                )}
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="columnheader" scope="col">
                  {t('common', 'actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {orders.map((order) => {
                const pending = isPending(order.id)
                return (
                <tr
                  key={order.id}
                  role="row"
                  aria-selected={selectedOrders.has(order.id)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition relative ${
                    selectedOrders.has(order.id) ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                  } ${pending ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {/* Pending indicator overlay */}
                  {pending && (
                    <td
                      colSpan={showPrices ? 9 : 8}
                      className="absolute inset-0 flex items-center justify-center bg-slate-900/10 dark:bg-background/30 z-10"
                    >
                      <div className="animate-spin h-6 w-6 border-3 border-violet-500 border-t-transparent rounded-full" />
                    </td>
                  )}
                  <td className="px-4 py-4" role="gridcell">
                    <input
                      type="checkbox"
                      checked={selectedOrders.has(order.id)}
                      onChange={() => onToggleSelect(order.id)}
                      className="w-4 h-4 rounded border-border bg-white dark:bg-muted text-violet-600 focus:ring-violet-500 focus:ring-offset-white dark:focus:ring-offset-slate-800 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                      disabled={pending}
                      aria-label={`Zaznacz zamówienie ${order.order_number}`}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-violet-400 hover:text-violet-300 font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={isOrderOverdue(order.deadline, order.status) ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-foreground'}>
                        {new Date(order.deadline).toLocaleDateString('pl-PL')}
                      </span>
                      {isOrderOverdue(order.deadline, order.status) && (
                        <Badge variant="danger" size="sm" className="w-fit">{t('orderStatus', 'overdue')}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <CompletionLikelihoodBadge
                      likelihood={order.completion_likelihood}
                      recommendation={order.completion_recommendation || undefined}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <QualityRiskBadge
                      risk={order.quality_risk}
                      riskLevel={order.quality_risk_level}
                      riskFactors={order.quality_risk_factors}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.assigned_operator_name ? (
                      <span className="text-foreground">{order.assigned_operator_name}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  {showPrices && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.total_cost && order.total_cost > 0 ? (
                        <PriceDisplay
                          value={order.total_cost}
                          module="orders"
                          className={`font-semibold ${
                            order.total_cost > 5000 ? 'text-red-400' :
                            order.total_cost > 2000 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right" role="gridcell">
                    <div className="relative inline-block" ref={openMenuId === order.id ? menuRef : null}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                        className="p-2 hover:bg-muted rounded-lg transition"
                        aria-label={`Akcje dla zamówienia ${order.order_number}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === order.id}
                      >
                        <span className="text-muted-foreground">⋮</span>
                      </button>
                      {openMenuId === order.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-muted border border-border rounded-lg shadow-xl z-10 py-1"
                          role="menu"
                          aria-orientation="vertical"
                        >
                          <Link
                            href={`/orders/${order.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-600"
                            onClick={() => setOpenMenuId(null)}
                            role="menuitem"
                          >
                            <span>👁</span> {t('common', 'view')}
                          </Link>
                          <Link
                            href={`/orders/${order.id}/edit`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-slate-50 dark:hover:bg-slate-600"
                            onClick={() => setOpenMenuId(null)}
                            role="menuitem"
                          >
                            <span>✏️</span> {t('common', 'edit')}
                          </Link>
                          <button
                            onClick={() => { handleDuplicate(order.id, order.order_number); setOpenMenuId(null); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-600"
                            role="menuitem"
                          >
                            <span>📋</span> {t('common', 'duplicate')}
                          </button>
                          {currentUserRole === 'owner' && (
                            <button
                              onClick={() => { handleDelete(order.id, order.order_number); setOpenMenuId(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-600"
                              role="menuitem"
                            >
                              <span>🗑</span> {t('common', 'delete')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View - Cards (visible only on mobile) */}
        <div className="md:hidden space-y-4" role="region" aria-label="Lista zamówień">
          {/* Select All Checkbox */}
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => allSelected ? onDeselectAll() : onSelectAll()}
              className="w-5 h-5 rounded border-border bg-white dark:bg-muted text-violet-600 focus:ring-violet-500 cursor-pointer"
              aria-label={allSelected ? 'Odznacz wszystkie zamówienia' : 'Zaznacz wszystkie zamówienia'}
            />
            <span className="text-sm text-muted-foreground font-medium">
              {allSelected ? t('orders', 'deselectAll') : t('orders', 'selectAll')} ({orders.length})
            </span>
          </div>

          {/* Order Cards */}
          {orders.map((order) => {
            const pending = isPending(order.id)
            return (
            <div
              key={order.id}
              className={`bg-card border rounded-lg overflow-hidden transition relative ${
                selectedOrders.has(order.id)
                  ? 'border-violet-500 dark:border-violet-400 shadow-lg'
                  : 'border-border'
              } ${pending ? 'opacity-60 pointer-events-none' : ''}`}
              role="article"
              aria-label={`Zamówienie ${order.order_number}`}
            >
              {/* Pending indicator overlay */}
              {pending && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-900/20 dark:bg-background/40 rounded-lg">
                  <div className="animate-spin h-8 w-8 border-3 border-violet-500 border-t-transparent rounded-full" />
                </div>
              )}
              {/* Card Header */}
              <div className="flex items-center justify-between p-4 bg-muted border-b border-border">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.has(order.id)}
                    onChange={() => onToggleSelect(order.id)}
                    className="w-5 h-5 rounded border-border bg-white dark:bg-muted text-violet-600 focus:ring-violet-500 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                    disabled={pending}
                    aria-label={`Zaznacz zamówienie ${order.order_number}`}
                  />
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-lg font-bold text-violet-400 hover:text-violet-300"
                  >
                    {order.order_number}
                  </Link>
                </div>
                {/* Actions Menu */}
                <div className="relative" ref={openMenuId === order.id ? menuRef : null}>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)}
                    className="p-2 hover:bg-accent rounded-lg transition"
                    aria-label={`Akcje dla zamówienia ${order.order_number}`}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === order.id}
                  >
                    <span className="text-muted-foreground text-xl">⋮</span>
                  </button>
                  {openMenuId === order.id && (
                    <div
                      className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-muted border border-border rounded-lg shadow-xl z-10 py-1"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <Link
                        href={`/orders/${order.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-slate-50 dark:hover:bg-slate-600"
                        onClick={() => setOpenMenuId(null)}
                        role="menuitem"
                      >
                        <span>👁</span> {t('common', 'view')}
                      </Link>
                      <Link
                        href={`/orders/${order.id}/edit`}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-slate-50 dark:hover:bg-slate-600"
                        onClick={() => setOpenMenuId(null)}
                        role="menuitem"
                      >
                        <span>✏️</span> {t('common', 'edit')}
                      </Link>
                      <button
                        onClick={() => { handleDuplicate(order.id, order.order_number); setOpenMenuId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-slate-50 dark:hover:bg-slate-600"
                        role="menuitem"
                      >
                        <span>📋</span> {t('common', 'duplicate')}
                      </button>
                      {currentUserRole === 'owner' && (
                        <button
                          onClick={() => { handleDelete(order.id, order.order_number); setOpenMenuId(null); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-600"
                          role="menuitem"
                        >
                          <span>🗑</span> {t('common', 'delete')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Customer */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                    {t('orders', 'customer')}
                  </p>
                  <p className="text-base text-foreground font-medium">
                    {order.customer_name}
                  </p>
                </div>

                {/* Quantity & Part */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                      {t('common', 'quantity')}
                    </p>
                    <p className="text-base text-foreground">
                      {order.quantity} {order.part_name && `× ${order.part_name}`}
                    </p>
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                    {t('orders', 'deadline')}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className={`text-base font-medium ${
                      isOrderOverdue(order.deadline, order.status)
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-foreground'
                    }`}>
                      {new Date(order.deadline).toLocaleDateString('pl-PL')}
                    </p>
                    {isOrderOverdue(order.deadline, order.status) && (
                      <Badge variant="danger" size="sm">{t('orderStatus', 'overdue')}</Badge>
                    )}
                  </div>
                </div>

                {/* Status & Operator */}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                      {t('common', 'status')}
                    </p>
                    {getStatusBadge(order.status)}
                  </div>
                  {order.assigned_operator_name && (
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                        Operator
                      </p>
                      <p className="text-base text-foreground">
                        {order.assigned_operator_name}
                      </p>
                    </div>
                  )}
                </div>

                {/* Price (if permissions) */}
                {showPrices && order.total_cost && order.total_cost > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                      {t('common', 'cost')}
                    </p>
                    <PriceDisplay
                      value={order.total_cost}
                      module="orders"
                      className={`text-lg font-bold ${
                        order.total_cost > 5000 ? 'text-red-400' :
                        order.total_cost > 2000 ? 'text-yellow-400' :
                        'text-green-400'
                      }`}
                    />
                  </div>
                )}

                {/* Tags (if any) */}
                {order.tags && order.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                      Tagi
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {order.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 text-xs rounded"
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            border: `1px solid ${tag.color}40`
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )
          })}
        </div>
      </>
    )
  }
