// Loading skeleton for inventory page
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8 animate-pulse">
          <div className="h-10 bg-slate-800 rounded w-40"></div>
          <div className="h-12 bg-slate-800 rounded w-40"></div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="bg-slate-700 p-4">
            <div className="grid grid-cols-8 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-slate-600 rounded"></div>
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-700">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="grid grid-cols-8 gap-4">
                  {[...Array(8)].map((_, j) => (
                    <div key={j} className="h-4 bg-slate-700 rounded"></div>
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
