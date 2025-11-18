'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  orders: number
}

interface Props {
  data: DataPoint[]
}

export default function OrdersChart({ data }: Props) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">
            Zamówienia (ostatnie 30 dni)
          </h2>
          <p className="text-slate-400 text-sm">
            Liczba utworzonych zamówień w czasie
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-blue-400">
            {data.reduce((sum, item) => sum + item.orders, 0)}
          </p>
          <p className="text-slate-400 text-sm">Łącznie</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#fff'
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area
            type="monotone"
            dataKey="orders"
            stroke="#3b82f6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorOrders)"
            name="Zamówienia"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
