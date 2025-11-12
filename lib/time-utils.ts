// ============================================
// lib/time-utils.ts
// Helper functions for time tracking
// ============================================

/**
 * Format seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Format seconds to human-readable format (e.g., "5h 42m")
 */
export function formatDurationHuman(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

/**
 * Calculate cost from duration and hourly rate
 */
export function calculateCost(durationSeconds: number, hourlyRate: number): number {
  return (durationSeconds / 3600) * hourlyRate;
}

/**
 * Check if timer is stale (running >12 hours)
 */
export function isStaleTimer(startTime: string, thresholdHours: number = 12): boolean {
  const start = new Date(startTime);
  const now = new Date();
  const hoursElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  return hoursElapsed > thresholdHours;
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'running':
      return 'bg-green-600';
    case 'paused':
      return 'bg-yellow-600';
    case 'completed':
      return 'bg-slate-600';
    default:
      return 'bg-slate-600';
  }
}

/**
 * Compare actual vs estimated time
 * Returns: 'under' | 'on' | 'over'
 */
export function compareActualVsEstimated(
  actualHours: number,
  estimatedHours: number,
  tolerance: number = 0.1 // 10% tolerance
): 'under' | 'on' | 'over' {
  const ratio = actualHours / estimatedHours;

  if (ratio < 1 - tolerance) return 'under';
  if (ratio > 1 + tolerance) return 'over';
  return 'on';
}

/**
 * Get comparison badge color
 */
export function getComparisonBadgeColor(comparison: 'under' | 'on' | 'over'): string {
  switch (comparison) {
    case 'under':
      return 'bg-green-600';
    case 'on':
      return 'bg-blue-600';
    case 'over':
      return 'bg-red-600';
  }
}

/**
 * Validate time range
 */
export function validateTimeRange(startTime: Date, endTime: Date): { valid: boolean; error?: string } {
  if (endTime <= startTime) {
    return { valid: false, error: 'End time must be after start time' };
  }

  const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  if (durationHours > 24) {
    return { valid: false, error: 'Duration cannot exceed 24 hours' };
  }

  return { valid: true };
}

/**
 * Parse duration string (e.g., "5h 30m") to seconds
 */
export function parseDurationToSeconds(duration: string): number {
  const hoursMatch = duration.match(/(\d+)h/);
  const minutesMatch = duration.match(/(\d+)m/);

  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

  return (hours * 3600) + (minutes * 60);
}
