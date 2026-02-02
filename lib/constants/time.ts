// Time conversion constants — replaces magic numbers across the codebase
// Usage: import { TIME, BUSINESS } from '@/lib/constants/time'

export const TIME = {
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3_600,
  SECONDS_PER_DAY: 86_400,
  SECONDS_PER_WEEK: 604_800,
  MS_PER_SECOND: 1_000,
  MS_PER_MINUTE: 60_000,
  MS_PER_HOUR: 3_600_000,
  MS_PER_DAY: 86_400_000,
  MINUTES_PER_HOUR: 60,
} as const

export const BUSINESS = {
  QUOTE_EXPIRY_DAYS: 14,
  MAINTENANCE_WINDOW_DAYS: 7,
  RATE_LIMIT_WINDOW_MS: 60_000,
  STALE_TIMER_CHECK_MS: 5 * 60_000, // 5 minutes
} as const
