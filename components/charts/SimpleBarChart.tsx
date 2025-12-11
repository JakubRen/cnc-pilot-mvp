'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/components/theme/ThemeProvider'

interface SimpleBarChartProps<T = Record<string, unknown>> {
  data: T[]
  xKey: string
  yKey: string
  color?: string
  height?: number
}

export default function SimpleBarChart<T = Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = '#3b82f6',
  height = 300
}: SimpleBarChartProps<T>) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? '#475569' : '#e2e8f0'
  const textColor = isDark ? '#94a3b8' : '#64748b'
  const tooltipBg = isDark ? '#1e293b' : '#ffffff'
  const tooltipBorder = isDark ? '#475569' : '#e2e8f0'
  const tooltipText = isDark ? '#fff' : '#0f172a'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey={xKey}
          stroke={textColor}
          tick={{ fill: textColor, fontSize: 12 }}
        />
        <YAxis
          stroke={textColor}
          tick={{ fill: textColor, fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '8px',
            color: tooltipText
          }}
        />
        <Bar dataKey={yKey} fill={color} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
