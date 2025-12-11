// Status configuration utilities
// Centralized status definitions to eliminate duplication

export const ORDER_STATUS_CONFIG = {
  pending: {
    label: 'Oczekujące',
    labelEn: 'Pending',
    color: 'bg-yellow-600',
    textColor: 'text-yellow-100',
    icon: '⏳',
  },
  in_progress: {
    label: 'W realizacji',
    labelEn: 'In Progress',
    color: 'bg-blue-600',
    textColor: 'text-blue-100',
    icon: '🔄',
  },
  completed: {
    label: 'Zakończone',
    labelEn: 'Completed',
    color: 'bg-green-600',
    textColor: 'text-green-100',
    icon: '✅',
  },
  delayed: {
    label: 'Opóźnione',
    labelEn: 'Delayed',
    color: 'bg-red-600',
    textColor: 'text-red-100',
    icon: '⚠️',
  },
  cancelled: {
    label: 'Anulowane',
    labelEn: 'Cancelled',
    color: 'bg-gray-600',
    textColor: 'text-gray-100',
    icon: '❌',
  },
} as const

export type OrderStatus = keyof typeof ORDER_STATUS_CONFIG

export const QC_STATUS_CONFIG = {
  pending: {
    label: 'Oczekujące',
    labelEn: 'Pending',
    color: 'bg-yellow-600',
    textColor: 'text-yellow-100',
    icon: '⏳',
  },
  in_progress: {
    label: 'W trakcie',
    labelEn: 'In Progress',
    color: 'bg-blue-600',
    textColor: 'text-blue-100',
    icon: '🔍',
  },
  passed: {
    label: 'Zaliczone',
    labelEn: 'Passed',
    color: 'bg-green-600',
    textColor: 'text-green-100',
    icon: '✅',
  },
  failed: {
    label: 'Niezaliczone',
    labelEn: 'Failed',
    color: 'bg-red-600',
    textColor: 'text-red-100',
    icon: '❌',
  },
} as const

export type QCStatus = keyof typeof QC_STATUS_CONFIG

export const COOPERATION_STATUS_CONFIG = {
  draft: {
    label: 'Szkic',
    labelEn: 'Draft',
    color: 'bg-gray-600',
    textColor: 'text-gray-100',
    icon: '📝',
  },
  sent: {
    label: 'Wysłane',
    labelEn: 'Sent',
    color: 'bg-blue-600',
    textColor: 'text-blue-100',
    icon: '📤',
  },
  accepted: {
    label: 'Zaakceptowane',
    labelEn: 'Accepted',
    color: 'bg-green-600',
    textColor: 'text-green-100',
    icon: '✅',
  },
  rejected: {
    label: 'Odrzucone',
    labelEn: 'Rejected',
    color: 'bg-red-600',
    textColor: 'text-red-100',
    icon: '❌',
  },
  in_production: {
    label: 'W produkcji',
    labelEn: 'In Production',
    color: 'bg-purple-600',
    textColor: 'text-purple-100',
    icon: '⚙️',
  },
  completed: {
    label: 'Zakończone',
    labelEn: 'Completed',
    color: 'bg-green-700',
    textColor: 'text-green-100',
    icon: '🎉',
  },
} as const

export type CooperationStatus = keyof typeof COOPERATION_STATUS_CONFIG

export const TIME_LOG_STATUS_CONFIG = {
  running: {
    label: 'Aktywny',
    labelEn: 'Running',
    color: 'bg-green-600',
    textColor: 'text-green-100',
    icon: '▶️',
  },
  paused: {
    label: 'Wstrzymany',
    labelEn: 'Paused',
    color: 'bg-yellow-600',
    textColor: 'text-yellow-100',
    icon: '⏸️',
  },
  completed: {
    label: 'Zakończony',
    labelEn: 'Completed',
    color: 'bg-gray-600',
    textColor: 'text-gray-100',
    icon: '⏹️',
  },
} as const

export type TimeLogStatus = keyof typeof TIME_LOG_STATUS_CONFIG

// Generic status badge props getter
export function getStatusBadgeProps<T extends Record<string, { label: string; labelEn: string; color: string; textColor: string; icon: string }>>(
  status: string,
  config: T,
  locale: 'pl' | 'en' = 'pl'
) {
  const statusConfig = config[status as keyof T]

  if (!statusConfig) {
    return {
      label: status,
      className: 'bg-gray-600 text-gray-100',
      icon: '❓',
    }
  }

  return {
    label: locale === 'pl' ? statusConfig.label : statusConfig.labelEn,
    className: `${statusConfig.color} ${statusConfig.textColor}`,
    icon: statusConfig.icon,
  }
}

// Convenience functions for specific status types
export function getOrderStatusProps(status: OrderStatus, locale: 'pl' | 'en' = 'pl') {
  return getStatusBadgeProps(status, ORDER_STATUS_CONFIG, locale)
}

export function getQCStatusProps(status: QCStatus, locale: 'pl' | 'en' = 'pl') {
  return getStatusBadgeProps(status, QC_STATUS_CONFIG, locale)
}

export function getCooperationStatusProps(status: CooperationStatus, locale: 'pl' | 'en' = 'pl') {
  return getStatusBadgeProps(status, COOPERATION_STATUS_CONFIG, locale)
}

export function getTimeLogStatusProps(status: TimeLogStatus, locale: 'pl' | 'en' = 'pl') {
  return getStatusBadgeProps(status, TIME_LOG_STATUS_CONFIG, locale)
}

// Get all status options for dropdowns
export function getOrderStatusOptions(locale: 'pl' | 'en' = 'pl') {
  return Object.entries(ORDER_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: locale === 'pl' ? config.label : config.labelEn,
  }))
}

export function getQCStatusOptions(locale: 'pl' | 'en' = 'pl') {
  return Object.entries(QC_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: locale === 'pl' ? config.label : config.labelEn,
  }))
}

export function getCooperationStatusOptions(locale: 'pl' | 'en' = 'pl') {
  return Object.entries(COOPERATION_STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: locale === 'pl' ? config.label : config.labelEn,
  }))
}
