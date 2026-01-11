/**
 * Reusable skeleton for detail pages ([id] routes)
 * Provides consistent loading state across all detail views
 */
export default function DetailPageSkeleton() {
  return (
    <div className="p-6 md:p-8 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Back link */}
        <div className="h-4 bg-muted rounded w-24 mb-6 animate-pulse" />

        {/* Header with title and actions */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="h-9 bg-muted rounded w-64 mb-2 animate-pulse" />
            <div className="h-5 bg-muted rounded w-48 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-muted rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Main content card */}
        <div className="glass-panel rounded-xl p-6 border border-border mb-6">
          {/* Card header */}
          <div className="h-6 bg-muted rounded w-40 mb-6 animate-pulse" />

          {/* Grid of details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                <div className="h-6 bg-muted rounded w-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Secondary section */}
        <div className="glass-panel rounded-xl p-6 border border-border mb-6">
          <div className="h-6 bg-muted rounded w-32 mb-4 animate-pulse" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Third section (optional - table-like) */}
        <div className="glass-panel rounded-xl p-6 border border-border">
          <div className="h-6 bg-muted rounded w-36 mb-4 animate-pulse" />
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-4 gap-4 pb-3 border-b border-border">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" />
              ))}
            </div>
            {/* Table rows */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 py-3">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-5 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
