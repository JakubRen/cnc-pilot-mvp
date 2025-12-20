import { CardSkeleton } from '@/components/skeletons/CardSkeleton'

export default function Loading() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-8 animate-pulse" />

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
