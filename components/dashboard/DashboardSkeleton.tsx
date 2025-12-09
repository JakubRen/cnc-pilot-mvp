import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton'

export default function DashboardSkeleton() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Urgent Tasks */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-xl p-6 border border-slate-200 dark:border-border">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 animate-pulse rounded" />
                ))}
              </div>
            </div>
          </div>

          {/* Production Plan + Top Customers */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <SkeletonTable rows={3} />
            <SkeletonTable rows={2} />
          </div>
        </div>

        {/* Charts */}
        <SkeletonChart />
      </div>
    </div>
  )
}
