import { TableSkeleton } from '@/components/skeletons/TableSkeleton'

export default function Loading() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-8 animate-pulse" />
        <TableSkeleton rows={8} columns={5} />
      </div>
    </div>
  )
}
