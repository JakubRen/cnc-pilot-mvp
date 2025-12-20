import { CardSkeleton } from '@/components/skeletons/CardSkeleton'
import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

export default function Loading() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-64 mb-8 animate-pulse" />

        {/* Product Details Card */}
        <div className="mb-6">
          <CardSkeleton />
        </div>

        {/* Summary Card */}
        <div className="mb-6">
          <CardSkeleton />
        </div>

        {/* Locations Table */}
        <TableSkeleton rows={3} columns={4} />
      </div>
    </div>
  )
}
