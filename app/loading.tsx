// Loading skeleton for dashboard/home page
export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-9 bg-muted rounded w-48 mb-2 animate-pulse"></div>
              <div className="h-5 bg-muted rounded w-64 animate-pulse"></div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 w-36 bg-muted rounded-lg animate-pulse"></div>
              <div className="text-right">
                <div className="h-4 w-24 bg-muted rounded mb-1 animate-pulse"></div>
                <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards Skeleton - matches min-h-[160px] from MetricCard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 stagger-fade-in">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="glass-panel rounded-xl p-6 border border-border min-h-[160px] animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 bg-muted rounded-lg"></div>
                <div className="h-3 w-20 bg-muted rounded"></div>
              </div>
              <div className="h-10 w-24 bg-muted rounded mb-2"></div>
              <div className="flex items-center gap-2">
                <div className="h-1 w-1 rounded-full bg-muted"></div>
                <div className="h-3 w-32 bg-muted rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 stagger-fade-in">
          {/* Urgent Tasks Skeleton */}
          <div className="lg:col-span-1">
            <div className="glass-panel rounded-xl p-6 border border-border min-h-[320px] animate-pulse">
              <div className="h-6 bg-muted rounded w-32 mb-4"></div>
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Production Plan + Top Customers Skeleton */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-panel rounded-xl p-6 border border-border min-h-[200px] animate-pulse">
              <div className="h-6 bg-muted rounded w-40 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
            <div className="glass-panel rounded-xl p-6 border border-border min-h-[200px] animate-pulse">
              <div className="h-6 bg-muted rounded w-36 mb-4"></div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-fade-in">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="glass-panel rounded-xl p-6 border border-border min-h-[280px] animate-pulse"
            >
              <div className="h-6 bg-muted rounded w-32 mb-4"></div>
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
