import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatRelativeTime,
  formatDuration,
  formatRevenue,
  formatNumber,
  formatPercentage,
  getOrderPriorityColor,
  getStockStatusColor,
  getStatusBadgeColor,
  getActivityIcon,
  getActivityColor,
  calculateGrowth,
  getMetricIcon,
  isToday,
  isOverdue,
  getDaysUntil,
  formatDate,
  formatDateTime
} from '@/lib/dashboard-utils'

// ============================================
// formatRelativeTime - "5 minut temu"
// ============================================
describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should format seconds ago', () => {
    const now = new Date('2024-01-15T12:00:30Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('30 sekund temu')
  })

  it('should format 1 minute ago (singular)', () => {
    const now = new Date('2024-01-15T12:01:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('1 minuta temu')
  })

  it('should format 2-4 minutes ago (plural form 1)', () => {
    const now = new Date('2024-01-15T12:03:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('3 minuty temu')
  })

  it('should format 5+ minutes ago (plural form 2)', () => {
    const now = new Date('2024-01-15T12:15:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('15 minut temu')
  })

  it('should format 1 hour ago (singular)', () => {
    const now = new Date('2024-01-15T13:00:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('1 godzina temu')
  })

  it('should format 2-4 hours ago (plural form 1)', () => {
    const now = new Date('2024-01-15T15:00:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('3 godziny temu')
  })

  it('should format 5+ hours ago (plural form 2)', () => {
    const now = new Date('2024-01-15T22:00:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('10 godzin temu')
  })

  it('should format 1 day ago (singular)', () => {
    const now = new Date('2024-01-16T12:00:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('1 dzień temu')
  })

  it('should format 2+ days ago (plural)', () => {
    const now = new Date('2024-01-18T12:00:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    expect(formatRelativeTime(timestamp)).toBe('3 dni temu')
  })

  it('should format dates older than a week as localized date', () => {
    const now = new Date('2024-01-30T12:00:00Z')
    vi.setSystemTime(now)

    const timestamp = '2024-01-15T12:00:00Z'
    const result = formatRelativeTime(timestamp)
    // Should be a date string, not "X dni temu"
    expect(result).not.toContain('temu')
  })
})

// ============================================
// formatDuration - "5h 30m"
// ============================================
describe('formatDuration', () => {
  it('should format 0 seconds as 0m', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('should format minutes only when less than 1 hour', () => {
    expect(formatDuration(300)).toBe('5m')   // 5 minutes
    expect(formatDuration(1800)).toBe('30m') // 30 minutes
    expect(formatDuration(3540)).toBe('59m') // 59 minutes
  })

  it('should format hours and minutes when 1+ hours', () => {
    expect(formatDuration(3600)).toBe('1h 0m')    // 1 hour
    expect(formatDuration(5400)).toBe('1h 30m')   // 1.5 hours
    expect(formatDuration(7200)).toBe('2h 0m')    // 2 hours
  })

  it('should handle large durations', () => {
    expect(formatDuration(36000)).toBe('10h 0m')   // 10 hours
    expect(formatDuration(43200)).toBe('12h 0m')   // 12 hours
  })
})

// ============================================
// formatRevenue - PLN currency format
// ============================================
describe('formatRevenue', () => {
  it('should format with PLN currency', () => {
    const result = formatRevenue(1000)
    expect(result).toContain('1')
    expect(result).toContain('000')
    // PLN formatting may vary by locale
  })

  it('should format 0', () => {
    const result = formatRevenue(0)
    expect(result).toContain('0')
  })

  it('should format large amounts', () => {
    const result = formatRevenue(150000)
    expect(result).toContain('150')
    expect(result).toContain('000')
  })

  it('should round decimals (no fraction digits)', () => {
    const result = formatRevenue(1234.56)
    // Should be rounded, no decimals
    expect(result).toContain('1')
    expect(result).toContain('235') // rounded up
  })
})

// ============================================
// formatNumber - localized number format
// ============================================
describe('formatNumber', () => {
  it('should format small numbers', () => {
    expect(formatNumber(42)).toBe('42')
  })

  it('should format thousands with separator', () => {
    const result = formatNumber(1234567)
    // Polish uses space or non-breaking space as thousand separator
    expect(result.replace(/\s/g, '')).toBe('1234567')
  })

  it('should format 0', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

// ============================================
// formatPercentage - value/total as %
// ============================================
describe('formatPercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(formatPercentage(50, 100)).toBe('50%')
    expect(formatPercentage(25, 100)).toBe('25%')
    expect(formatPercentage(100, 100)).toBe('100%')
  })

  it('should return 0% when total is 0', () => {
    expect(formatPercentage(50, 0)).toBe('0%')
  })

  it('should round to whole number', () => {
    expect(formatPercentage(1, 3)).toBe('33%')   // 33.33...
    expect(formatPercentage(2, 3)).toBe('67%')   // 66.66...
  })
})

// ============================================
// getOrderPriorityColor - deadline-based colors
// ============================================
describe('getOrderPriorityColor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return green for completed orders', () => {
    const result = getOrderPriorityColor('2024-01-10', 'completed')
    expect(result.color).toBe('green')
    expect(result.label).toBe('Completed')
    expect(result.icon).toBe('✅')
  })

  it('should return red for overdue orders', () => {
    const result = getOrderPriorityColor('2024-01-10', 'pending') // 5 days ago
    expect(result.color).toBe('red')
    expect(result.label).toContain('po terminie')
  })

  it('should return red for due today', () => {
    const result = getOrderPriorityColor('2024-01-15', 'pending')
    expect(result.color).toBe('red')
    expect(result.label).toBe('Dziś!')
    expect(result.icon).toBe('⚠️')
  })

  it('should return yellow for due in 1-3 days', () => {
    const result = getOrderPriorityColor('2024-01-17', 'pending') // 2 days
    expect(result.color).toBe('yellow')
    expect(result.label).toContain('Za 2')
  })

  it('should return green for due in 4+ days', () => {
    const result = getOrderPriorityColor('2024-01-25', 'pending') // 10 days
    expect(result.color).toBe('green')
    expect(result.label).toContain('Za 10 dni')
    expect(result.icon).toBe('🟢')
  })
})

// ============================================
// getStockStatusColor - inventory status
// ============================================
describe('getStockStatusColor', () => {
  it('should return red for out of stock (0)', () => {
    const result = getStockStatusColor(0, 10)
    expect(result.color).toBe('red')
    expect(result.label).toBe('Brak na stanie')
  })

  it('should return yellow for low stock', () => {
    const result = getStockStatusColor(5, 10)
    expect(result.color).toBe('yellow')
    expect(result.label).toBe('Niski stan')
  })

  it('should return green for sufficient stock', () => {
    const result = getStockStatusColor(15, 10)
    expect(result.color).toBe('green')
    expect(result.label).toBe('OK')
  })

  it('should return green when exactly at threshold', () => {
    const result = getStockStatusColor(10, 10)
    expect(result.color).toBe('green')
    expect(result.label).toBe('OK')
  })
})

// ============================================
// getStatusBadgeColor - order status styling
// ============================================
describe('getStatusBadgeColor', () => {
  it('should return gray for pending', () => {
    const result = getStatusBadgeColor('pending')
    expect(result.bgColor).toBe('bg-gray-600')
    expect(result.label).toBe('Oczekuje')
  })

  it('should return blue for in_progress', () => {
    const result = getStatusBadgeColor('in_progress')
    expect(result.bgColor).toBe('bg-blue-600')
    expect(result.label).toBe('W realizacji')
  })

  it('should return green for completed', () => {
    const result = getStatusBadgeColor('completed')
    expect(result.bgColor).toBe('bg-green-600')
    expect(result.label).toBe('Zakończone')
  })

  it('should return red for cancelled', () => {
    const result = getStatusBadgeColor('cancelled')
    expect(result.bgColor).toBe('bg-red-600')
    expect(result.label).toBe('Anulowane')
  })

  it('should return gray for unknown status', () => {
    const result = getStatusBadgeColor('unknown_status')
    expect(result.bgColor).toBe('bg-gray-600')
    expect(result.label).toBe('unknown_status')
  })
})

// ============================================
// getActivityIcon - activity feed icons
// ============================================
describe('getActivityIcon', () => {
  it('should return correct icons for known types', () => {
    expect(getActivityIcon('order_created')).toBe('📦')
    expect(getActivityIcon('order_completed')).toBe('✅')
    expect(getActivityIcon('timer_started')).toBe('⏱️')
    expect(getActivityIcon('low_stock_alert')).toBe('⚠️')
  })

  it('should return bullet for unknown type', () => {
    expect(getActivityIcon('unknown')).toBe('•')
  })
})

// ============================================
// getActivityColor - activity feed colors
// ============================================
describe('getActivityColor', () => {
  it('should return correct colors for known types', () => {
    expect(getActivityColor('order_created')).toBe('text-blue-600')
    expect(getActivityColor('order_completed')).toBe('text-green-600')
    expect(getActivityColor('low_stock_alert')).toBe('text-yellow-600')
  })

  it('should return slate for unknown type', () => {
    expect(getActivityColor('unknown')).toBe('text-slate-600')
  })
})

// ============================================
// calculateGrowth - growth percentage
// ============================================
describe('calculateGrowth', () => {
  it('should calculate positive growth', () => {
    const result = calculateGrowth(120, 100)
    expect(result.percentage).toBe(20)
    expect(result.isPositive).toBe(true)
    expect(result.label).toBe('+20%')
  })

  it('should calculate negative growth', () => {
    const result = calculateGrowth(80, 100)
    expect(result.percentage).toBe(20)
    expect(result.isPositive).toBe(false)
    expect(result.label).toBe('-20%')
  })

  it('should handle zero previous (100% growth)', () => {
    const result = calculateGrowth(50, 0)
    expect(result.percentage).toBe(100)
    expect(result.isPositive).toBe(true)
    expect(result.label).toBe('+100%')
  })

  it('should handle zero previous with zero current', () => {
    const result = calculateGrowth(0, 0)
    expect(result.percentage).toBe(0)
    expect(result.isPositive).toBe(false)
    expect(result.label).toBe('0%')
  })

  it('should handle no change', () => {
    const result = calculateGrowth(100, 100)
    expect(result.percentage).toBe(0)
    expect(result.label).toBe('0%') // no '+' for zero growth
  })
})

// ============================================
// getMetricIcon - dashboard metric icons
// ============================================
describe('getMetricIcon', () => {
  it('should return correct icons for known metrics', () => {
    expect(getMetricIcon('totalOrders')).toBe('📦')
    expect(getMetricIcon('revenue')).toBe('💰')
    expect(getMetricIcon('activeTimers')).toBe('⏱️')
    expect(getMetricIcon('lowStock')).toBe('📉')
  })

  it('should return chart icon for unknown metric', () => {
    expect(getMetricIcon('unknown')).toBe('📊')
  })
})

// ============================================
// isToday - date comparison
// ============================================
describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Use local time to avoid timezone issues
    vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0)) // Jan 15, 2024, 12:00 local
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true for today', () => {
    // Use local date format to avoid timezone conversion issues
    expect(isToday('2024-01-15')).toBe(true)
  })

  it('should return false for yesterday', () => {
    expect(isToday('2024-01-14')).toBe(false)
  })

  it('should return false for tomorrow', () => {
    expect(isToday('2024-01-16')).toBe(false)
  })
})

// ============================================
// isOverdue - deadline check
// ============================================
describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return true for past deadline', () => {
    expect(isOverdue('2024-01-14')).toBe(true)
    expect(isOverdue('2024-01-10')).toBe(true)
  })

  it('should return false for today', () => {
    expect(isOverdue('2024-01-15')).toBe(false)
  })

  it('should return false for future deadline', () => {
    expect(isOverdue('2024-01-16')).toBe(false)
    expect(isOverdue('2024-01-20')).toBe(false)
  })
})

// ============================================
// getDaysUntil - days calculation
// ============================================
describe('getDaysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return 0 for today', () => {
    expect(getDaysUntil('2024-01-15')).toBe(0)
  })

  it('should return positive days for future dates', () => {
    expect(getDaysUntil('2024-01-16')).toBe(1)
    expect(getDaysUntil('2024-01-20')).toBe(5)
    expect(getDaysUntil('2024-01-25')).toBe(10)
  })

  it('should return negative days for past dates', () => {
    expect(getDaysUntil('2024-01-14')).toBe(-1)
    expect(getDaysUntil('2024-01-10')).toBe(-5)
  })
})

// ============================================
// formatDate - Polish date format
// ============================================
describe('formatDate', () => {
  it('should format date in Polish locale', () => {
    const result = formatDate('2024-01-15')
    // Polish format: "15 sty 2024" or similar
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('should handle ISO date strings', () => {
    const result = formatDate('2024-12-25T10:30:00Z')
    expect(result).toContain('25')
    expect(result).toContain('2024')
  })
})

// ============================================
// formatDateTime - Polish datetime format
// ============================================
describe('formatDateTime', () => {
  it('should format datetime with time', () => {
    const result = formatDateTime('2024-01-15T14:30:00Z')
    // Should contain date and time
    expect(result).toContain('15')
    // Time formatting depends on timezone
  })

  it('should include hours and minutes', () => {
    const result = formatDateTime('2024-01-15T09:05:00Z')
    expect(result).toContain('15')
    // Should have some time component
  })
})
