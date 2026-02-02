'use client'

import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'

interface ProfitabilitySummary {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  avgMarginPercent: number
  profitableOrders: number
  unprofitableOrders: number
  ordersWithoutPrice: number
  totalLaborHours: number
  totalLaborCost: number
  totalMaterialCost: number
}

interface ProfitabilityWidgetProps {
  data: ProfitabilitySummary
}

export default function ProfitabilityWidget({ data }: ProfitabilityWidgetProps) {
  const { t } = useTranslation()
  const isProfitable = data.totalProfit >= 0

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          {t('dashboard', 'profitability30Days')}
        </h3>
        <Link
          href="/costs"
          className="text-primary hover:text-primary/80 text-sm transition"
        >
          Zobacz szczegóły →
        </Link>
      </div>

      {/* Main Profit Metric */}
      <div className={`p-4 rounded-lg mb-4 ${isProfitable ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50'}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-muted-foreground text-sm">{t('dashboard', 'totalProfit')}</p>
            <p className={`text-3xl font-bold ${isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {data.totalProfit.toFixed(0)} PLN
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">{t('dashboard', 'margin')}</p>
            <p className={`text-2xl font-semibold ${isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {data.avgMarginPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Revenue vs Cost */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-muted-foreground text-xs">{t('dashboard', 'revenue')}</p>
          <p className="text-xl font-bold text-primary">{data.totalRevenue.toFixed(0)} PLN</p>
        </div>
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-muted-foreground text-xs">{t('dashboard', 'cost')}</p>
          <p className="text-xl font-bold text-foreground">{data.totalCost.toFixed(0)} PLN</p>
        </div>
      </div>

      {/* Orders Stats */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30 px-3 py-2 rounded-lg text-center">
          <p className="text-green-600 dark:text-green-400 font-bold text-lg">{data.profitableOrders}</p>
          <p className="text-muted-foreground text-xs">rentownych</p>
        </div>
        <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 px-3 py-2 rounded-lg text-center">
          <p className="text-red-600 dark:text-red-400 font-bold text-lg">{data.unprofitableOrders}</p>
          <p className="text-muted-foreground text-xs">stratnych</p>
        </div>
        {data.ordersWithoutPrice > 0 && (
          <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 px-3 py-2 rounded-lg text-center">
            <p className="text-yellow-600 dark:text-yellow-400 font-bold text-lg">{data.ordersWithoutPrice}</p>
            <p className="text-muted-foreground text-xs">bez ceny</p>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="border-t border-border pt-4">
        <p className="text-muted-foreground text-xs mb-2">Struktura kosztów</p>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-muted-foreground">Materiał: </span>
            <span className="text-foreground">{data.totalMaterialCost.toFixed(0)} PLN</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
            <span className="text-muted-foreground">Praca: </span>
            <span className="text-foreground">{data.totalLaborCost.toFixed(0)} PLN</span>
          </div>
        </div>
        {data.totalLaborHours > 0 && (
          <p className="text-muted-foreground text-xs mt-1">
            {data.totalLaborHours.toFixed(1)}h łącznie ({(data.totalLaborCost / data.totalLaborHours).toFixed(0)} PLN/h śr.)
          </p>
        )}
      </div>
    </div>
  )
}
