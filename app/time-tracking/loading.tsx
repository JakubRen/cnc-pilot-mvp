// Loading skeleton for time tracking page
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8 animate-pulse">
          <div className="h-10 bg-slate-800 rounded w-48"></div>
          <div className="h-12 bg-slate-800 rounded w-48"></div>
        </div>

        {/* Filters Skeleton */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6 animate-pulse">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>

        {/* Time Log Cards Skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 animate-pulse"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-slate-700 rounded w-40"></div>
                  <div className="h-4 bg-slate-700 rounded w-60"></div>
                </div>
                <div className="h-8 bg-slate-700 rounded w-24"></div>
              </div>
              <div className="flex gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-slate-700 rounded w-20"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
