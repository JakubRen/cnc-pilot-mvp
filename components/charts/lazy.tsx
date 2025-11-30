'use client'

import dynamic from 'next/dynamic'

// Skeleton loader for charts
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="w-full bg-slate-700/50 animate-pulse rounded-lg"
      style={{ height }}
    />
  )
}

// Lazy-loaded chart components
// These will only be loaded when actually rendered, reducing initial bundle size

export const LazyLineChart = dynamic(
  () => import('./SimpleLineChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
)

export const LazyBarChart = dynamic(
  () => import('./SimpleBarChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
)

export const LazyPieChart = dynamic(
  () => import('./SimplePieChart'),
  {
    loading: () => <ChartSkeleton height={250} />,
    ssr: false
  }
)

export const LazyOrdersChart = dynamic(
  () => import('../dashboard/OrdersChart'),
  {
    loading: () => <ChartSkeleton height={350} />,
    ssr: false
  }
)
