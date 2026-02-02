export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg p-6 border border-border animate-pulse">
      <div className="h-4 bg-secondary rounded w-1/3 mb-4" />
      <div className="h-8 bg-secondary rounded w-1/2 mb-2" />
      <div className="h-3 bg-secondary rounded w-2/3" />
    </div>
  )
}
