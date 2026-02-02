'use client'

import dynamic from 'next/dynamic'

// Skeleton loader for calendar
function CalendarSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="flex-1 bg-card border border-border rounded-lg p-6">
        {/* View switcher skeleton */}
        <div className="flex gap-2 mb-4">
          <div className="h-9 w-24 bg-secondary animate-pulse rounded-lg" />
          <div className="h-9 w-24 bg-secondary animate-pulse rounded-lg" />
          <div className="h-9 w-24 bg-secondary animate-pulse rounded-lg" />
        </div>

        {/* Calendar skeleton */}
        <div className="space-y-3">
          <div className="h-12 bg-secondary animate-pulse rounded" />
          <div className="h-96 bg-secondary animate-pulse rounded" />
        </div>

        {/* Legend skeleton */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="h-4 w-20 bg-secondary animate-pulse rounded mb-2" />
          <div className="flex gap-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-6 w-24 bg-secondary animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Lazy-loaded ProductionCalendar
// FullCalendar is ~200-300KB - lazy loading significantly improves initial page load
const LazyProductionCalendar = dynamic(
  () => import('./ProductionCalendar'),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false, // FullCalendar doesn't work with SSR
  }
)

export default LazyProductionCalendar
