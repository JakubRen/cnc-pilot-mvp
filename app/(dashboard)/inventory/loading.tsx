// Loading skeleton for inventory page
export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8 animate-pulse">
          <div className="h-10 bg-muted dark:bg-card rounded w-40"></div>
          <div className="h-12 bg-muted dark:bg-card rounded w-40"></div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-muted p-4">
            <div className="grid grid-cols-8 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded"></div>
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="grid grid-cols-8 gap-4">
                  {[...Array(8)].map((_, j) => (
                    <div key={j} className="h-4 bg-secondary rounded"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
