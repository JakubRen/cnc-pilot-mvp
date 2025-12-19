import { CardSkeleton } from './CardSkeleton'
import { TableSkeleton } from './TableSkeleton'

export function DashboardSkeleton() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-8 animate-pulse" />

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton rows={5} columns={3} />
          <TableSkeleton rows={5} columns={3} />
        </div>
      </div>
    </div>
  )
}
