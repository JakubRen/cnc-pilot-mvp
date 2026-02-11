'use server'

import { callGemini, SchemaType } from '@/lib/ai/gemini-client'
import { readCache, writeCache } from '@/lib/ai/cache-utils'
import { logger } from '@/lib/logger'

import type { AIReportSummaryData, ReportType as FrontendReportType, ReportFinding, ReportRecommendation } from '@/types/ai-expansion'

// NOTE: The old 3-arg backend API is in @/lib/ai/report-summary
// This file provides the 2-arg frontend-compatible API

// ============================================
// TYPES (matching test expectations)
// ============================================

export interface ReportSummaryInput {
  reportType: 'costs' | 'orders' | 'inventory' | 'time'
  companyId: string
  data: Record<string, unknown>
}

export interface KeyMetric {
  label: string
  value: string
  trend?: 'up' | 'down' | 'stable'
}

export interface ReportSummaryResult {
  summary: string
  keyMetrics: KeyMetric[]
  recommendations: string[]
  trend: 'improving' | 'stable' | 'declining' | 'mixed'
  generatedAt: string
}

// ============================================
// REPORT TYPE LABELS
// ============================================

const REPORT_TYPE_LABELS: Record<string, string> = {
  costs: 'kosztow',
  orders: 'zlecen',
  inventory: 'magazynu',
  time: 'czasu pracy',
}

// ============================================
// HEURISTIC SUMMARY GENERATOR
// ============================================

function generateHeuristicSummary(input: ReportSummaryInput): ReportSummaryResult {
  const { reportType, data } = input
  const keyMetrics: KeyMetric[] = []
  const recommendations: string[] = []
  let summary = ''
  let trend: ReportSummaryResult['trend'] = 'stable'

  switch (reportType) {
    case 'costs': {
      const totalCost = Number(data.totalCost) || 0
      const avgMargin = Number(data.avgMargin) || 0
      summary = `Raport kosztow: calkowity koszt ${totalCost.toLocaleString('pl-PL')} PLN, srednia marza ${avgMargin.toFixed(1)}%.`
      if (totalCost > 0) keyMetrics.push({ label: 'Calkowity koszt', value: `${totalCost.toLocaleString('pl-PL')} PLN` })
      if (avgMargin > 0) keyMetrics.push({ label: 'Srednia marza', value: `${avgMargin.toFixed(1)}%`, trend: avgMargin > 20 ? 'up' : 'down' })
      if (avgMargin < 15) {
        recommendations.push('Przeanalizuj zlecenia z najnizsza marza')
        trend = 'declining'
      }
      recommendations.push('Monitoruj koszty materialow')
      break
    }
    case 'orders': {
      const totalOrders = Number(data.totalOrders) || 0
      const completedOrders = Number(data.completedOrders) || 0
      const revenue = Number(data.revenue) || 0
      const previousRevenue = Number(data.previousRevenue) || 0
      summary = `Raport zlecen: ${totalOrders} zlecen, ${completedOrders} ukonczone.`
      if (revenue > 0) {
        keyMetrics.push({ label: 'Przychod', value: `${revenue.toLocaleString('pl-PL')} PLN`, trend: revenue > previousRevenue ? 'up' : revenue < previousRevenue ? 'down' : 'stable' })
        if (revenue > previousRevenue) {
          const change = previousRevenue > 0 ? Math.round(((revenue - previousRevenue) / previousRevenue) * 100) : 0
          summary = `Raport zlecen: przychod wzrosl o ${change}% do ${revenue.toLocaleString('pl-PL')} PLN. ${totalOrders} zlecen, ${completedOrders} ukonczone.`
          trend = 'improving'
        }
      }
      if (totalOrders > 0) keyMetrics.push({ label: 'Zlecenia', value: `${completedOrders}/${totalOrders}` })
      recommendations.push('Regularnie aktualizuj statusy zlecen')
      break
    }
    case 'inventory': {
      const totalItems = Number(data.totalItems) || 0
      const lowStockItems = Number(data.lowStockItems) || 0
      summary = `Raport magazynu: ${totalItems} pozycji, ${lowStockItems} z niskim stanem.`
      if (totalItems > 0) keyMetrics.push({ label: 'Pozycje', value: `${totalItems}` })
      if (lowStockItems > 0) {
        keyMetrics.push({ label: 'Niski stan', value: `${lowStockItems}`, trend: 'down' })
        recommendations.push('Zamow materialy z niskim stanem')
        trend = 'declining'
      }
      break
    }
    case 'time': {
      const totalHours = Number(data.totalHours) || 0
      const avgEfficiency = Number(data.avgEfficiency) || 0
      summary = `Raport czasu: ${totalHours.toFixed(1)}h lacznie.`
      if (totalHours > 0) keyMetrics.push({ label: 'Laczny czas', value: `${totalHours.toFixed(1)}h` })
      if (avgEfficiency > 0) {
        keyMetrics.push({ label: 'Efektywnosc', value: `${avgEfficiency.toFixed(0)}%`, trend: avgEfficiency > 80 ? 'up' : 'down' })
        if (avgEfficiency < 70) {
          recommendations.push('Sprawdz zrodla przestojow')
          trend = 'declining'
        }
      }
      break
    }
  }

  if (summary === '') {
    summary = `Raport ${REPORT_TYPE_LABELS[reportType] || reportType}: brak wystarczajacych danych do analizy.`
  }
  if (keyMetrics.length === 0) {
    keyMetrics.push({ label: 'Status', value: 'Brak danych' })
  }
  if (recommendations.length === 0) {
    recommendations.push('Uzupelnij dane w systemie dla lepszych analiz')
  }

  return {
    summary,
    keyMetrics,
    recommendations,
    trend,
    generatedAt: new Date().toISOString(),
  }
}

// ============================================
// MAIN API (matching test contract)
// ============================================

/**
 * Generate a report summary — tries Gemini, falls back to heuristic.
 * This is the function the tests import.
 */
export async function generateReportSummary(
  input: ReportSummaryInput
): Promise<ReportSummaryResult> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    return generateHeuristicSummary(input)
  }

  const result = await callGemini<{
    summary: string
    keyMetrics: KeyMetric[]
    recommendations: string[]
  }>({
    label: 'report-summaries',
    prompt: `Jestes analitykiem produkcji CNC. Przygotuj podsumowanie raportu ${REPORT_TYPE_LABELS[input.reportType] || input.reportType} po polsku.

DANE RAPORTU:
${JSON.stringify(input.data, null, 2)}

ZASADY:
- summary: 2-3 zdania, konkretne, po polsku
- keyMetrics: lista klucz-wartosc z metrykami (label, value, trend: up/down/stable)
- recommendations: 2-4 rekomendacje
- Nie wymyslaj danych`,
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING },
        keyMetrics: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              label: { type: SchemaType.STRING },
              value: { type: SchemaType.STRING },
              trend: { type: SchemaType.STRING },
            },
            required: ['label', 'value'],
          },
        },
        recommendations: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ['summary', 'keyMetrics', 'recommendations'],
    },
  })

  if (result) {
    return {
      summary: result.data.summary,
      keyMetrics: result.data.keyMetrics,
      recommendations: result.data.recommendations,
      trend: 'stable', // Gemini doesn't return trend in this format
      generatedAt: new Date().toISOString(),
    }
  }

  return generateHeuristicSummary(input)
}

// ============================================
// CACHE API (matching test contract)
// ============================================

/**
 * Get cached report summary. Returns null if no cache or stale.
 */
export async function getCachedReportSummary(
  companyId: string,
  reportType: string
): Promise<ReportSummaryResult | null> {
  const cached = await readCache<ReportSummaryResult>(companyId, `report_summary_${reportType}`)
  if (cached && !cached.isStale) {
    return cached.data
  }
  return null
}

/**
 * Invalidate (delete) cached report summary.
 */
export async function invalidateReportCache(
  companyId: string,
  reportType: string
): Promise<{ success: boolean }> {
  try {
    // Write expired cache entry to effectively invalidate
    await writeCache(companyId, `report_summary_${reportType}`, {}, 0, 'invalidated')
    return { success: true }
  } catch {
    return { success: false }
  }
}

// ============================================
// FRONTEND API (2-arg: reportType, companyId)
// Used by components/reports/AIReportSummary.tsx
// Returns AIReportSummaryData from types/ai-expansion.ts
// ============================================

function resultToFrontendFormat(result: ReportSummaryResult): AIReportSummaryData {
  const findings: ReportFinding[] = result.keyMetrics.map(m => ({
    icon: m.trend === 'up' ? '\u2191' : m.trend === 'down' ? '\u2193' : '\u2192',
    text: `${m.label}: ${m.value}`,
    severity: m.trend === 'up' ? 'positive' as const : m.trend === 'down' ? 'warning' as const : 'info' as const,
  }))

  const recommendations: ReportRecommendation[] = result.recommendations.map((text, i) => ({
    text,
    priority: (i === 0 ? 'high' : i === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
  }))

  return {
    summary: result.summary,
    findings,
    recommendations,
    trend: result.trend,
    generatedAt: result.generatedAt,
  }
}

/**
 * Frontend-compatible getReportSummary.
 * Called as: getReportSummary(reportType, companyId)
 */
export async function getReportSummary(
  reportType: FrontendReportType,
  companyId: string
): Promise<AIReportSummaryData> {
  const result = await generateReportSummary({
    reportType,
    companyId,
    data: {},
  })
  return resultToFrontendFormat(result)
}
