'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'
import CustomerRiskBadge from './CustomerRiskBadge'
import { getCustomerIntelligence } from '@/lib/ai/customer-intelligence'
import type { CustomerIntelligenceData, CustomerChurnRisk } from '@/types/ai-expansion'

interface Props {
  companyId: string
}

function ChurnRiskRow({ customer }: { customer: CustomerChurnRisk }) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/50 transition">
      <td className="py-2.5 px-3 text-sm text-foreground font-medium">
        {customer.customerName}
      </td>
      <td className="py-2.5 px-3">
        <CustomerRiskBadge riskLevel={customer.riskLevel} size="sm" />
      </td>
      <td className="py-2.5 px-3 text-xs text-muted-foreground">
        {customer.daysSinceLastOrder}d temu
      </td>
      <td className="py-2.5 px-3 text-xs text-foreground text-right">
        {customer.orderCount}
      </td>
      <td className="py-2.5 px-3 text-xs text-foreground text-right">
        {customer.totalRevenue.toFixed(0)} PLN
      </td>
    </tr>
  )
}

function InactiveAlert({ count, revenue }: { count: number; revenue: number }) {
  if (count === 0) return null

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 dark:text-amber-400 text-sm flex-shrink-0">&#x26A0;</span>
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            {count} nieaktywnych klientow
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Zagrozony przychod: {revenue.toFixed(0)} PLN
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

export default function CustomerIntelligencePanel({ companyId }: Props) {
  const [data, setData] = useState<CustomerIntelligenceData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const result = await getCustomerIntelligence(companyId)
      setData(result)
    } catch {
      toast.error('Blad analizy klientow')
    } finally {
      setIsLoading(false)
    }
  }

  // Initial state
  if (!data && !isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">&#x1F50D;</span>
            <h3 className="text-lg font-semibold text-foreground">Analiza Klientow AI</h3>
          </div>
          <button
            onClick={handleGenerate}
            className="px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-md transition"
          >
            Analizuj
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          AI przeanalizuje aktywnosc klientow, zidentyfikuje zagrozenia churn i zaproponuje dzialania.
        </p>
      </div>
    )
  }

  // Loading
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h3 className="text-sm font-semibold text-foreground">Analizuje klientow...</h3>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (!data) return null

  const sortedRisks = [...data.churnRisks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.riskLevel] - order[b.riskLevel]
  })

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#x1F50D;</span>
          <h3 className="text-sm font-semibold text-foreground">Analiza Klientow AI</h3>
        </div>
        <button
          onClick={handleGenerate}
          className="px-2 py-1 text-[10px] font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded transition"
        >
          Odswiez
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Inactive alert */}
        <InactiveAlert count={data.inactiveCount} revenue={data.atRiskRevenue} />

        {/* Churn risk table */}
        {sortedRisks.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Klient</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ryzyko</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ostatnie zam.</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Ilosc</th>
                  <th className="py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Przychod</th>
                </tr>
              </thead>
              <tbody>
                {sortedRisks.slice(0, 10).map((customer) => (
                  <ChurnRiskRow key={customer.customerId} customer={customer} />
                ))}
              </tbody>
            </table>
            {sortedRisks.length > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                +{sortedRisks.length - 10} kolejnych klientow
              </p>
            )}
          </div>
        )}

        {/* AI Analysis (collapsible) */}
        {data.aiAnalysis && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
              className="w-full flex items-center justify-between p-3 text-sm font-medium text-foreground hover:bg-muted/50 transition"
            >
              <span>Analiza AI</span>
              <svg
                className={`h-4 w-4 transition-transform text-muted-foreground ${isAnalysisExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isAnalysisExpanded && (
              <div className="px-3 pb-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {data.aiAnalysis}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
