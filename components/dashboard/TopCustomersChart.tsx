'use client'

import ChartCard from '@/components/charts/ChartCard'
import SimpleBarChart from '@/components/charts/SimpleBarChart'
import { CustomerData } from '@/lib/analytics/queries'

interface TopCustomersChartProps {
  data: CustomerData[]
}

export default function TopCustomersChart({ data }: TopCustomersChartProps) {
  return (
    <ChartCard
      title="Top Klienci"
      subtitle="Największy przychód"
    >
      <SimpleBarChart
        data={data}
        xKey="customer"
        yKey="revenue"
        color="#3b82f6"
      />
    </ChartCard>
  )
}
