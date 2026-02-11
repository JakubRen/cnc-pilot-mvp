'use server'

import { callGemini, SchemaType } from '@/lib/ai/gemini-client'
import { readCache, writeCache } from '@/lib/ai/cache-utils'
import { logger } from '@/lib/logger'
import type {
  ReportType,
  ReportAISummary,
  ReportSummaryResponse,
} from '@/types/ai-report-summary'

const CACHE_TTL_HOURS = 4
const MODEL = 'gemini-2.5-flash'

function cacheKey(reportType: ReportType): string {
  return `report_summary_${reportType}`
}

// ============================================
// HEURISTIC FALLBACK
// ============================================

function generateHeuristicSummary(
  reportType: ReportType,
  reportData: Record<string, unknown>
): ReportAISummary {
  const findings: string[] = []
  const recommendations: string[] = []
  let trend: ReportAISummary['trend'] = 'stable'

  switch (reportType) {
    case 'costs': {
      const totalCost = Number(reportData.totalCost) || 0
      const avgMargin = Number(reportData.avgMargin) || 0
      findings.push(`Calkowity koszt w okresie: ${totalCost.toLocaleString('pl-PL')} PLN`)
      if (avgMargin < 15) {
        findings.push(`Srednia marza ${avgMargin.toFixed(1)}% jest ponizej zdrowego poziomu 15%`)
        recommendations.push('Przeanalizuj zlecenia z najnizsza marza i rozważ podwyzke cen')
        trend = 'declining'
      } else if (avgMargin > 30) {
        findings.push(`Srednia marza ${avgMargin.toFixed(1)}% utrzymuje sie na dobrym poziomie`)
        trend = 'improving'
      }
      recommendations.push('Monitoruj koszty materialow — stanowia glowny czynnik zmiennosci')
      break
    }
    case 'orders': {
      const totalOrders = Number(reportData.totalOrders) || 0
      const completedOrders = Number(reportData.completedOrders) || 0
      const overdueOrders = Number(reportData.overdueOrders) || 0
      findings.push(`Laczna liczba zlecen: ${totalOrders}, ukonczone: ${completedOrders}`)
      if (overdueOrders > 0) {
        findings.push(`${overdueOrders} zlecen po terminie wymaga uwagi`)
        recommendations.push('Priorytetyzuj przeterminowane zlecenia')
        trend = 'declining'
      }
      if (completedOrders > 0 && totalOrders > 0) {
        const rate = Math.round((completedOrders / totalOrders) * 100)
        findings.push(`Wskaznik realizacji: ${rate}%`)
      }
      recommendations.push('Regularnie aktualizuj statusy zlecen dla lepszego planowania')
      break
    }
    case 'inventory': {
      const totalItems = Number(reportData.totalItems) || 0
      const lowStockItems = Number(reportData.lowStockItems) || 0
      findings.push(`Pozycji w magazynie: ${totalItems}`)
      if (lowStockItems > 0) {
        findings.push(`${lowStockItems} pozycji z niskim stanem wymaga uzupelnienia`)
        recommendations.push('Zamow materialy z niskim stanem aby uniknac przestojow')
        trend = lowStockItems > 5 ? 'declining' : 'mixed'
      }
      recommendations.push('Ustal progi minimalne dla kluczowych materialow')
      break
    }
    case 'time': {
      const totalHours = Number(reportData.totalHours) || 0
      const avgEfficiency = Number(reportData.avgEfficiency) || 0
      findings.push(`Laczny czas pracy: ${totalHours.toFixed(1)}h`)
      if (avgEfficiency > 0) {
        findings.push(`Srednia efektywnosc: ${avgEfficiency.toFixed(0)}%`)
        if (avgEfficiency < 70) {
          recommendations.push('Efektywnosc ponizej 70% — sprawdz zrodla przestojow')
          trend = 'declining'
        }
      }
      recommendations.push('Rejestruj czas pracy na biezaco dla dokladniejszych analiz')
      break
    }
  }

  return {
    summary: findings.join('. ') + '.',
    keyFindings: findings.length > 0 ? findings : ['Brak wystarczajacych danych do analizy'],
    recommendations: recommendations.length > 0 ? recommendations : ['Uzupelnij dane w systemie dla lepszych analiz'],
    trend,
  }
}

// ============================================
// REPORT TYPE LABELS (Polish)
// ============================================

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  costs: 'kosztow',
  orders: 'zlecen',
  inventory: 'magazynu',
  time: 'czasu pracy',
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Get report summary — cache-first, then Gemini, then heuristic fallback.
 */
export async function getReportSummary(
  companyId: string,
  reportType: ReportType,
  reportData: Record<string, unknown>
): Promise<ReportSummaryResponse> {
  // 1. Try cache
  const cached = await readCache<ReportAISummary>(companyId, cacheKey(reportType))
  if (cached && !cached.isStale) {
    return {
      summary: cached.data,
      generatedAt: cached.generatedAt,
      model: cached.model,
      isStale: false,
    }
  }

  // 2. Try Gemini
  const result = await callGemini<ReportAISummary>({
    label: 'report-summary',
    prompt: buildPrompt(reportType, reportData),
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: 'Podsumowanie raportu 2-3 zdania po polsku' },
        keyFindings: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: '3-5 kluczowych wnioskow po polsku',
        },
        recommendations: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: '2-4 konkretne rekomendacje po polsku',
        },
        trend: {
          type: SchemaType.STRING,
          description: 'Ogolny trend: improving, stable, declining, mixed',
        },
      },
      required: ['summary', 'keyFindings', 'recommendations', 'trend'],
    },
    temperature: 0.3,
  })

  if (result) {
    // Validate trend value
    const validTrends = ['improving', 'stable', 'declining', 'mixed'] as const
    if (!validTrends.includes(result.data.trend as typeof validTrends[number])) {
      result.data.trend = 'stable'
    }

    await writeCache(companyId, cacheKey(reportType), result.data, CACHE_TTL_HOURS, result.model)

    return {
      summary: result.data,
      generatedAt: new Date().toISOString(),
      model: result.model,
      isStale: false,
    }
  }

  // 3. Heuristic fallback
  const heuristic = generateHeuristicSummary(reportType, reportData)
  return {
    summary: heuristic,
    generatedAt: new Date().toISOString(),
    model: 'heuristic',
    isStale: false,
  }
}

/**
 * Force refresh — bypass cache, regenerate from AI.
 */
export async function refreshReportSummary(
  companyId: string,
  reportType: ReportType,
  reportData: Record<string, unknown>
): Promise<ReportSummaryResponse> {
  const result = await callGemini<ReportAISummary>({
    label: 'report-summary-refresh',
    prompt: buildPrompt(reportType, reportData),
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        summary: { type: SchemaType.STRING, description: 'Podsumowanie raportu 2-3 zdania po polsku' },
        keyFindings: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: '3-5 kluczowych wnioskow po polsku',
        },
        recommendations: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: '2-4 konkretne rekomendacje po polsku',
        },
        trend: {
          type: SchemaType.STRING,
          description: 'Ogolny trend: improving, stable, declining, mixed',
        },
      },
      required: ['summary', 'keyFindings', 'recommendations', 'trend'],
    },
    temperature: 0.3,
  })

  if (result) {
    const validTrends = ['improving', 'stable', 'declining', 'mixed'] as const
    if (!validTrends.includes(result.data.trend as typeof validTrends[number])) {
      result.data.trend = 'stable'
    }

    await writeCache(companyId, cacheKey(reportType), result.data, CACHE_TTL_HOURS, result.model)

    return {
      summary: result.data,
      generatedAt: new Date().toISOString(),
      model: result.model,
      isStale: false,
    }
  }

  const heuristic = generateHeuristicSummary(reportType, reportData)
  return {
    summary: heuristic,
    generatedAt: new Date().toISOString(),
    model: 'heuristic',
    isStale: false,
  }
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildPrompt(reportType: ReportType, reportData: Record<string, unknown>): string {
  const label = REPORT_TYPE_LABELS[reportType]
  return `Jestes analitykiem produkcji CNC. Przygotuj podsumowanie raportu ${label} po polsku.

DANE RAPORTU:
${JSON.stringify(reportData, null, 2)}

ZASADY:
- Podsumowanie: 2-3 zdania, konkretne, po polsku
- keyFindings: 3-5 kluczowych wnioskow
- recommendations: 2-4 konkretne rekomendacje (co zrobic)
- trend: "improving" (poprawa), "stable" (stabilnie), "declining" (spadek), "mixed" (mieszane)
- Nie wymyslaj danych — opieraj sie TYLKO na podanych liczbach
- Jesli brak danych dla jakiegos wskaznika, nie komentuj go`
}
