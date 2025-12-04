import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatDuration,
  formatDurationHuman,
  calculateCost,
  isStaleTimer,
  getStatusBadgeColor,
  compareActualVsEstimated,
  getComparisonBadgeColor,
  validateTimeRange,
  parseDurationToSeconds
} from '@/lib/time-utils'

// ============================================
// formatDuration - HH:MM:SS format
// ============================================
describe('formatDuration', () => {
  it('should format 0 seconds correctly', () => {
    expect(formatDuration(0)).toBe('00:00:00')
  })

  it('should format seconds only', () => {
    expect(formatDuration(1)).toBe('00:00:01')
    expect(formatDuration(30)).toBe('00:00:30')
    expect(formatDuration(59)).toBe('00:00:59')
  })

  it('should format minutes correctly', () => {
    expect(formatDuration(60)).toBe('00:01:00')
    expect(formatDuration(90)).toBe('00:01:30')
    expect(formatDuration(3540)).toBe('00:59:00') // 59 minutes
  })

  it('should format hours correctly', () => {
    expect(formatDuration(3600)).toBe('01:00:00')
    expect(formatDuration(7200)).toBe('02:00:00')
    expect(formatDuration(36000)).toBe('10:00:00')
  })

  it('should format combined hours:minutes:seconds', () => {
    expect(formatDuration(3661)).toBe('01:01:01')
    expect(formatDuration(3723)).toBe('01:02:03')
    expect(formatDuration(45296)).toBe('12:34:56')
  })

  it('should pad single digits with zeros', () => {
    expect(formatDuration(1)).toBe('00:00:01')
    expect(formatDuration(61)).toBe('00:01:01')
    expect(formatDuration(3601)).toBe('01:00:01')
  })
})

// ============================================
// formatDurationHuman - "5h 42m" format
// ============================================
describe('formatDurationHuman', () => {
  it('should format 0 as "0m"', () => {
    expect(formatDurationHuman(0)).toBe('0m')
  })

  it('should format minutes only when less than 1 hour', () => {
    expect(formatDurationHuman(60)).toBe('1m')
    expect(formatDurationHuman(300)).toBe('5m')
    expect(formatDurationHuman(1800)).toBe('30m')
    expect(formatDurationHuman(3540)).toBe('59m')
  })

  it('should format hours and minutes when 1+ hours', () => {
    expect(formatDurationHuman(3600)).toBe('1h 0m')
    expect(formatDurationHuman(3660)).toBe('1h 1m')
    expect(formatDurationHuman(5400)).toBe('1h 30m')
    expect(formatDurationHuman(7200)).toBe('2h 0m')
  })

  it('should handle large durations', () => {
    expect(formatDurationHuman(20520)).toBe('5h 42m')
    expect(formatDurationHuman(36000)).toBe('10h 0m')
    expect(formatDurationHuman(86400)).toBe('24h 0m')
  })

  it('should ignore seconds (truncate)', () => {
    expect(formatDurationHuman(3661)).toBe('1h 1m') // ignores 1 second
    expect(formatDurationHuman(3599)).toBe('59m')   // 59:59 → 59m
  })
})

// ============================================
// calculateCost - duration × hourly rate
// ============================================
describe('calculateCost', () => {
  it('should calculate cost for full hours', () => {
    expect(calculateCost(3600, 100)).toBe(100)   // 1h × 100 PLN/h
    expect(calculateCost(7200, 100)).toBe(200)   // 2h × 100 PLN/h
    expect(calculateCost(3600, 150)).toBe(150)   // 1h × 150 PLN/h
  })

  it('should calculate cost for partial hours', () => {
    expect(calculateCost(1800, 100)).toBe(50)    // 0.5h × 100 PLN/h
    expect(calculateCost(900, 100)).toBe(25)     // 0.25h × 100 PLN/h
    expect(calculateCost(5400, 100)).toBe(150)   // 1.5h × 100 PLN/h
  })

  it('should handle different hourly rates', () => {
    expect(calculateCost(3600, 50)).toBe(50)
    expect(calculateCost(3600, 200)).toBe(200)
    expect(calculateCost(3600, 115)).toBe(115)   // CNC machining rate
  })

  it('should handle 0 duration', () => {
    expect(calculateCost(0, 100)).toBe(0)
  })

  it('should handle 0 hourly rate', () => {
    expect(calculateCost(3600, 0)).toBe(0)
  })

  it('should calculate precise fractional costs', () => {
    // 15 minutes at 120 PLN/h = 30 PLN
    expect(calculateCost(900, 120)).toBeCloseTo(30, 2)

    // 45 minutes at 80 PLN/h = 60 PLN
    expect(calculateCost(2700, 80)).toBeCloseTo(60, 2)
  })
})

// ============================================
// isStaleTimer - check if timer running too long
// ============================================
describe('isStaleTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return false for timer started recently', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    // Started 1 hour ago
    const startTime = new Date('2024-01-15T11:00:00Z').toISOString()
    expect(isStaleTimer(startTime)).toBe(false)
  })

  it('should return true for timer running over 12 hours (default)', () => {
    const now = new Date('2024-01-15T23:00:00Z')
    vi.setSystemTime(now)

    // Started 13 hours ago
    const startTime = new Date('2024-01-15T10:00:00Z').toISOString()
    expect(isStaleTimer(startTime)).toBe(true)
  })

  it('should return false for timer exactly at threshold', () => {
    const now = new Date('2024-01-15T22:00:00Z')
    vi.setSystemTime(now)

    // Started exactly 12 hours ago
    const startTime = new Date('2024-01-15T10:00:00Z').toISOString()
    expect(isStaleTimer(startTime)).toBe(false) // Not > 12, exactly 12
  })

  it('should use custom threshold', () => {
    const now = new Date('2024-01-15T14:00:00Z')
    vi.setSystemTime(now)

    const startTime = new Date('2024-01-15T10:00:00Z').toISOString() // 4 hours ago

    expect(isStaleTimer(startTime, 3)).toBe(true)  // > 3h threshold
    expect(isStaleTimer(startTime, 5)).toBe(false) // < 5h threshold
    expect(isStaleTimer(startTime, 4)).toBe(false) // = 4h threshold (not >)
  })

  it('should handle overnight timers', () => {
    const now = new Date('2024-01-16T08:00:00Z')
    vi.setSystemTime(now)

    // Started yesterday at 6pm = 14 hours ago
    const startTime = new Date('2024-01-15T18:00:00Z').toISOString()
    expect(isStaleTimer(startTime)).toBe(true)
  })
})

// ============================================
// getStatusBadgeColor
// ============================================
describe('getStatusBadgeColor', () => {
  it('should return green for running', () => {
    expect(getStatusBadgeColor('running')).toBe('bg-green-600')
  })

  it('should return yellow for paused', () => {
    expect(getStatusBadgeColor('paused')).toBe('bg-yellow-600')
  })

  it('should return slate for completed', () => {
    expect(getStatusBadgeColor('completed')).toBe('bg-slate-600')
  })

  it('should return slate for unknown status', () => {
    expect(getStatusBadgeColor('unknown')).toBe('bg-slate-600')
    expect(getStatusBadgeColor('')).toBe('bg-slate-600')
  })
})

// ============================================
// compareActualVsEstimated
// ============================================
describe('compareActualVsEstimated', () => {
  it('should return "under" when actual is significantly less than estimated', () => {
    expect(compareActualVsEstimated(5, 10)).toBe('under')   // 50%
    expect(compareActualVsEstimated(8, 10)).toBe('under')   // 80%
    expect(compareActualVsEstimated(8.9, 10)).toBe('under') // 89%
  })

  it('should return "on" when actual is within tolerance', () => {
    expect(compareActualVsEstimated(9, 10)).toBe('on')    // 90%
    expect(compareActualVsEstimated(10, 10)).toBe('on')   // 100%
    expect(compareActualVsEstimated(11, 10)).toBe('on')   // 110%
    expect(compareActualVsEstimated(9.5, 10)).toBe('on')  // 95%
    expect(compareActualVsEstimated(10.5, 10)).toBe('on') // 105%
  })

  it('should return "over" when actual exceeds estimate beyond tolerance', () => {
    expect(compareActualVsEstimated(11.1, 10)).toBe('over') // 111%
    expect(compareActualVsEstimated(12, 10)).toBe('over')   // 120%
    expect(compareActualVsEstimated(15, 10)).toBe('over')   // 150%
  })

  it('should respect custom tolerance', () => {
    // 20% tolerance
    expect(compareActualVsEstimated(8, 10, 0.2)).toBe('on')    // 80% within 20%
    expect(compareActualVsEstimated(7.9, 10, 0.2)).toBe('under') // 79% below 20%
    expect(compareActualVsEstimated(12, 10, 0.2)).toBe('on')   // 120% within 20%
    expect(compareActualVsEstimated(12.1, 10, 0.2)).toBe('over') // 121% above 20%
  })

  it('should handle zero tolerance', () => {
    expect(compareActualVsEstimated(10, 10, 0)).toBe('on')
    expect(compareActualVsEstimated(9.9, 10, 0)).toBe('under')
    expect(compareActualVsEstimated(10.1, 10, 0)).toBe('over')
  })
})

// ============================================
// getComparisonBadgeColor
// ============================================
describe('getComparisonBadgeColor', () => {
  it('should return green for under', () => {
    expect(getComparisonBadgeColor('under')).toBe('bg-green-600')
  })

  it('should return blue for on', () => {
    expect(getComparisonBadgeColor('on')).toBe('bg-blue-600')
  })

  it('should return red for over', () => {
    expect(getComparisonBadgeColor('over')).toBe('bg-red-600')
  })
})

// ============================================
// validateTimeRange
// ============================================
describe('validateTimeRange', () => {
  it('should return valid for correct time range', () => {
    const start = new Date('2024-01-15T08:00:00Z')
    const end = new Date('2024-01-15T17:00:00Z')

    const result = validateTimeRange(start, end)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject when end time is before start time', () => {
    const start = new Date('2024-01-15T17:00:00Z')
    const end = new Date('2024-01-15T08:00:00Z')

    const result = validateTimeRange(start, end)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('End time must be after start time')
  })

  it('should reject when end time equals start time', () => {
    const time = new Date('2024-01-15T12:00:00Z')

    const result = validateTimeRange(time, time)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('End time must be after start time')
  })

  it('should reject when duration exceeds 24 hours', () => {
    const start = new Date('2024-01-15T00:00:00Z')
    const end = new Date('2024-01-16T01:00:00Z') // 25 hours

    const result = validateTimeRange(start, end)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Duration cannot exceed 24 hours')
  })

  it('should accept exactly 24 hours', () => {
    const start = new Date('2024-01-15T00:00:00Z')
    const end = new Date('2024-01-16T00:00:00Z') // exactly 24 hours

    const result = validateTimeRange(start, end)
    expect(result.valid).toBe(true)
  })

  it('should accept very short durations', () => {
    const start = new Date('2024-01-15T12:00:00Z')
    const end = new Date('2024-01-15T12:00:01Z') // 1 second

    const result = validateTimeRange(start, end)
    expect(result.valid).toBe(true)
  })
})

// ============================================
// parseDurationToSeconds
// ============================================
describe('parseDurationToSeconds', () => {
  it('should parse hours and minutes', () => {
    expect(parseDurationToSeconds('5h 30m')).toBe(19800) // 5.5h
    expect(parseDurationToSeconds('1h 0m')).toBe(3600)
    expect(parseDurationToSeconds('2h 15m')).toBe(8100)
  })

  it('should parse hours only', () => {
    expect(parseDurationToSeconds('2h')).toBe(7200)
    expect(parseDurationToSeconds('10h')).toBe(36000)
  })

  it('should parse minutes only', () => {
    expect(parseDurationToSeconds('30m')).toBe(1800)
    expect(parseDurationToSeconds('45m')).toBe(2700)
    expect(parseDurationToSeconds('1m')).toBe(60)
  })

  it('should return 0 for empty string', () => {
    expect(parseDurationToSeconds('')).toBe(0)
  })

  it('should return 0 for invalid format', () => {
    expect(parseDurationToSeconds('invalid')).toBe(0)
    expect(parseDurationToSeconds('abc')).toBe(0)
  })

  it('should handle different formats', () => {
    expect(parseDurationToSeconds('5h30m')).toBe(19800)  // no space
    expect(parseDurationToSeconds('5h 30m')).toBe(19800) // with space
  })

  it('should handle large values', () => {
    expect(parseDurationToSeconds('100h')).toBe(360000)
    expect(parseDurationToSeconds('999m')).toBe(59940)
  })
})
