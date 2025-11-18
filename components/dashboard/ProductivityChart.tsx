'use client'

import ChartCard from '@/components/charts/ChartCard'
import SimpleBarChart from '@/components/charts/SimpleBarChart'
import { ProductivityData } from '@/lib/analytics/queries'

interface ProductivityChartProps {
  data: ProductivityData[]
}

export default function ProductivityChart({ data }: ProductivityChartProps) {
  return (
    <ChartCard
      title="Produktywność Pracowników"
      subtitle="Godziny pracy"
    >
      <SimpleBarChart
        data={data}
        xKey="employee"
        yKey="hours"
        color="#8b5cf6"
        height={250}
      />
    </ChartCard>
  )
}
