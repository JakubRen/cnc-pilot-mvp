export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border">
      {/* Header */}
      <div className="bg-muted p-4 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-4 flex gap-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-4 bg-secondary rounded animate-pulse flex-1"
                style={{ animationDelay: `${(rowIdx * columns + colIdx) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
