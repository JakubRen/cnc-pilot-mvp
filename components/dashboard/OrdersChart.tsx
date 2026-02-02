'use client';

import { memo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/components/theme/ThemeProvider';

const data = [
  { name: 'Pon', orders: 4, value: 2400 },
  { name: 'Wt', orders: 7, value: 4500 },
  { name: 'Śr', orders: 5, value: 3200 },
  { name: 'Czw', orders: 8, value: 5100 },
  { name: 'Pt', orders: 12, value: 7800 },
  { name: 'Sob', orders: 6, value: 3900 },
  { name: 'Ndz', orders: 3, value: 1800 },
];

// Memoized to prevent unnecessary re-renders when parent state changes
const OrdersChart = memo(function OrdersChart() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.95)';
  const tooltipBorder = isDark ? '#334155' : 'rgba(0,0,0,0.1)';
  const tooltipText = isDark ? '#f1f5f9' : '#0f172a';
  const accentColor = isDark ? '#8b5cf6' : '#7c3aed';

  return (
    <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground tracking-wide">
            Aktywność zamówień
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-1 uppercase tracking-wider">
            LAST 7 DAYS PERFORMANCE
          </p>
        </div>

        {/* Decorative HUD Element */}
        <div className="flex gap-2">
           <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
           <div className="h-2 w-2 rounded-full bg-primary/30"></div>
           <div className="h-2 w-2 rounded-full bg-primary/10"></div>
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: textColor, fontSize: 12, fontFamily: 'monospace' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: textColor, fontSize: 12, fontFamily: 'monospace' }}
              tickFormatter={(value) => `${value} PLN` }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `1px solid ${tooltipBorder}`,
                borderRadius: '8px',
                color: tooltipText,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              itemStyle={{ color: accentColor }}
              labelStyle={{ color: textColor, marginBottom: '0.5rem', fontFamily: 'monospace' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={accentColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default OrdersChart;
