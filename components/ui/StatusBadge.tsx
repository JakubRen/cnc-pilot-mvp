'use client'

import {
  ORDER_STATUS_CONFIG,
  QC_STATUS_CONFIG,
  COOPERATION_STATUS_CONFIG,
  TIME_LOG_STATUS_CONFIG,
  getOrderStatusProps,
  getQCStatusProps,
  getCooperationStatusProps,
  getTimeLogStatusProps,
  type OrderStatus,
  type QCStatus,
  type CooperationStatus,
  type TimeLogStatus,
} from '@/lib/status-utils'

type StatusType = 'order' | 'qc' | 'cooperation' | 'timelog'

interface StatusBadgeProps {
  status: string
  type?: StatusType
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  locale?: 'pl' | 'en'
}

export default function StatusBadge({
  status,
  type = 'order',
  size = 'md',
  showIcon = true,
  locale = 'pl',
}: StatusBadgeProps) {
  // Get status props based on type
  const getProps = () => {
    switch (type) {
      case 'order':
        return getOrderStatusProps(status as OrderStatus, locale)
      case 'qc':
        return getQCStatusProps(status as QCStatus, locale)
      case 'cooperation':
        return getCooperationStatusProps(status as CooperationStatus, locale)
      case 'timelog':
        return getTimeLogStatusProps(status as TimeLogStatus, locale)
      default:
        return {
          label: status,
          className: 'bg-gray-600 text-gray-100',
          icon: '❓',
        }
    }
  }

  const { label, className, icon } = getProps()

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${className} ${sizeClasses[size]}`}
    >
      {showIcon && <span>{icon}</span>}
      {label}
    </span>
  )
}

// Specialized variants for convenience
export function OrderStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}) {
  return <StatusBadge status={status} type="order" size={size} showIcon={showIcon} />
}

export function QCStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: {
  status: QCStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}) {
  return <StatusBadge status={status} type="qc" size={size} showIcon={showIcon} />
}

export function CooperationStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: {
  status: CooperationStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}) {
  return <StatusBadge status={status} type="cooperation" size={size} showIcon={showIcon} />
}

export function TimeLogStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: {
  status: TimeLogStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}) {
  return <StatusBadge status={status} type="timelog" size={size} showIcon={showIcon} />
}
