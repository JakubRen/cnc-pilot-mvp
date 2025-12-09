// Loading skeleton for orders page
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
          <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
        </div>

        {/* Layout: Stats + Table */}
        <div className="grid grid-cols-[350px_1fr] gap-6">
          {/* Stats Sidebar Skeleton */}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 animate-pulse"
              >
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
            ))}
          </div>

          {/* Table Skeleton */}
          <div>
            {/* Filters Skeleton */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4 animate-pulse">
              <div className="flex gap-3">
                <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-40 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="w-40 h-10 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-700 p-4">
                <div className="grid grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-slate-200 dark:bg-slate-600 rounded"></div>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-4 animate-pulse">
                    <div className="grid grid-cols-6 gap-4">
                      {[...Array(6)].map((_, j) => (
                        <div key={j} className="h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
