'use client'

import ChartCard from '@/components/charts/ChartCard'
import SimpleLineChart from '@/components/charts/SimpleLineChart'
import { RevenueDataPoint } from '@/lib/analytics/queries'

interface RevenueChartProps {
  data: RevenueDataPoint[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ChartCard
      title="Przychód w czasie"
      subtitle={`Ostatnie ${data.length} dni`}
    >
      <SimpleLineChart
        data={data}
        xKey="date"
        yKey="revenue"
        color="#10b981"
      />
    </ChartCard>
  )
}
