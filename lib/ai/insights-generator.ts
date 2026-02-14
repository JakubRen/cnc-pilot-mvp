'use server'

import { createClient } from '@/lib/supabase-server'
import { callGemini } from '@/lib/ai/gemini-client'
import { SchemaType } from '@/lib/ai/schema-types'
import { logger } from '@/lib/logger'
import type { AIInsight, AIInsightsData, InsightsDataSnapshot } from '@/types/ai-insights'

// ============================================
// DATA AGGREGATION
// ============================================

async function aggregateInsightsData(companyId: string): Promise<InsightsDataSnapshot> {
  const supabase = await createClient()
  const now = new Date()

  const oneWeekAgo = new Date(now)
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  const today = now.toISOString().split('T')[0]

  const [
    revenueThisWeekResult,
    revenuePreviousWeekResult,
    overdueResult,
    marginResult,
    recentCustomersResult,
    allCustomersResult,
    deadlineRiskResult,
    lowStockResult,
    completedThisWeekResult,
    activeOrdersResult,
  ] = await Promise.all([
    // Revenue this week (completed orders)
    supabase
      .from('orders')
      .select('selling_price')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('created_at', oneWeekAgo.toISOString()),

    // Revenue previous week
    supabase
      .from('orders')
      .select('selling_price')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', oneWeekAgo.toISOString()),

    // Overdue orders
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .lt('deadline', today),

    // Margin data (last 30 days)
    supabase
      .from('orders')
      .select('selling_price, total_cost')
      .eq('company_id', companyId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .neq('status', 'cancelled'),

    // Customers active in last 30 days
    supabase
      .from('orders')
      .select('customer_name')
      .eq('company_id', companyId)
      .gte('created_at', thirtyDaysAgo.toISOString()),

    // All customers ever
    supabase
      .from('orders')
      .select('customer_name')
      .eq('company_id', companyId),

    // Orders with deadline in next 3 days (not completed)
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .gte('deadline', today)
      .lte('deadline', threeDaysFromNow.toISOString().split('T')[0]),

    // Low stock items
    supabase
      .from('inventory')
      .select('id, quantity, low_stock_threshold')
      .eq('company_id', companyId),

    // Completed this week
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .gte('created_at', oneWeekAgo.toISOString()),

    // Active orders
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'in_progress'),
  ])

  // Calculate revenue
  const revenueThisWeek = (revenueThisWeekResult.data || [])
    .reduce((sum, o) => sum + (Number(o.selling_price) || 0), 0)
  const revenuePreviousWeek = (revenuePreviousWeekResult.data || [])
    .reduce((sum, o) => sum + (Number(o.selling_price) || 0), 0)
  const revenueChangePercent = revenuePreviousWeek > 0
    ? ((revenueThisWeek - revenuePreviousWeek) / revenuePreviousWeek) * 100
    : 0

  // Margin
  const marginOrders = (marginResult.data || []).filter(o => o.selling_price && o.selling_price > 0)
  const totalRevenue = marginOrders.reduce((sum, o) => sum + (Number(o.selling_price) || 0), 0)
  const totalCost = marginOrders.reduce((sum, o) => sum + (Number(o.total_cost) || 0), 0)
  const avgMarginPercent = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

  // Inactive customers
  const recentCustomerNames = new Set(
    (recentCustomersResult.data || []).map(o => o.customer_name)
  )
  const allCustomerNames = new Set(
    (allCustomersResult.data || []).map(o => o.customer_name)
  )
  const inactiveCustomers = [...allCustomerNames].filter(c => !recentCustomerNames.has(c)).length

  // Low stock
  const lowStockCount = (lowStockResult.data || [])
    .filter(item => item.quantity < (item.low_stock_threshold || 0))
    .length

  return {
    revenueThisWeek,
    revenuePreviousWeek,
    revenueChangePercent: Math.round(revenueChangePercent * 10) / 10,
    overdueOrders: overdueResult.count || 0,
    avgMarginPercent: Math.round(avgMarginPercent * 10) / 10,
    inactiveCustomers,
    deadlineRiskOrders: deadlineRiskResult.count || 0,
    lowStockCount,
    completedThisWeek: completedThisWeekResult.count || 0,
    activeOrders: activeOrdersResult.count || 0,
  }
}

// ============================================
// HEURISTIC FALLBACK (no AI needed)
// ============================================

function generateHeuristicInsights(snapshot: InsightsDataSnapshot): AIInsight[] {
  const insights: AIInsight[] = []

  // Revenue trend
  if (snapshot.revenuePreviousWeek > 0 || snapshot.revenueThisWeek > 0) {
    const change = snapshot.revenueChangePercent
    if (change > 0) {
      insights.push({
        type: 'revenue_trend',
        severity: 'positive',
        icon: '📈',
        title: `Przychód wzrósł o ${change}%`,
        description: `Ten tydzień: ${snapshot.revenueThisWeek.toLocaleString('pl-PL')} PLN vs poprzedni: ${snapshot.revenuePreviousWeek.toLocaleString('pl-PL')} PLN.`,
      })
    } else if (change < -10) {
      insights.push({
        type: 'revenue_trend',
        severity: 'warning',
        icon: '📉',
        title: `Przychód spadł o ${Math.abs(change)}%`,
        description: `Ten tydzień: ${snapshot.revenueThisWeek.toLocaleString('pl-PL')} PLN vs poprzedni: ${snapshot.revenuePreviousWeek.toLocaleString('pl-PL')} PLN.`,
      })
    }
  }

  // Overdue orders
  if (snapshot.overdueOrders > 0) {
    insights.push({
      type: 'deadline_risk',
      severity: snapshot.overdueOrders >= 3 ? 'critical' : 'warning',
      icon: '⏰',
      title: `${snapshot.overdueOrders} zleceń po terminie`,
      description: 'Wymaga natychmiastowej uwagi — sprawdź przeterminowane zlecenia.',
    })
  }

  // Deadline risk
  if (snapshot.deadlineRiskOrders > 0) {
    insights.push({
      type: 'deadline_risk',
      severity: 'warning',
      icon: '⚡',
      title: `${snapshot.deadlineRiskOrders} zleceń z deadline w ciągu 3 dni`,
      description: 'Upewnij się, że priorytetyzujesz te zlecenia.',
    })
  }

  // Margin
  if (snapshot.avgMarginPercent > 0 && snapshot.avgMarginPercent < 15) {
    insights.push({
      type: 'margin_analysis',
      severity: 'warning',
      icon: '💰',
      title: `Średnia marża: ${snapshot.avgMarginPercent}%`,
      description: 'Marża poniżej 15% — rozważ przegląd cen lub redukcję kosztów.',
    })
  } else if (snapshot.avgMarginPercent >= 30) {
    insights.push({
      type: 'margin_analysis',
      severity: 'positive',
      icon: '💎',
      title: `Świetna marża: ${snapshot.avgMarginPercent}%`,
      description: 'Marża powyżej 30% — utrzymuj ten poziom.',
    })
  }

  // Inactive customers
  if (snapshot.inactiveCustomers > 0) {
    insights.push({
      type: 'customer_activity',
      severity: 'info',
      icon: '👥',
      title: `${snapshot.inactiveCustomers} nieaktywnych klientów (>30 dni)`,
      description: 'Rozważ kontakt — klient, który wraca, kosztuje mniej niż nowy.',
    })
  }

  // Low stock
  if (snapshot.lowStockCount > 0) {
    insights.push({
      type: 'inventory_alert',
      severity: snapshot.lowStockCount >= 5 ? 'warning' : 'info',
      icon: '📦',
      title: `${snapshot.lowStockCount} pozycji z niskim stanem`,
      description: 'Sprawdź magazyn i uzupełnij krytyczne materiały.',
    })
  }

  // Productivity
  if (snapshot.completedThisWeek > 0) {
    insights.push({
      type: 'productivity',
      severity: 'positive',
      icon: '✅',
      title: `${snapshot.completedThisWeek} zleceń ukończonych w tym tygodniu`,
      description: `Aktywne zlecenia w toku: ${snapshot.activeOrders}.`,
    })
  }

  return insights.slice(0, 5)
}

// ============================================
// GEMINI AI GENERATION
// ============================================

async function generateInsightsWithAI(snapshot: InsightsDataSnapshot): Promise<AIInsight[]> {
  const prompt = `Jesteś analitykiem produkcji CNC. Na podstawie danych wygeneruj 3-5 KONKRETNYCH spostrzeżeń po polsku dla właściciela warsztatu CNC.

DANE PRODUKCYJNE:
- Przychód ten tydzień: ${snapshot.revenueThisWeek} PLN
- Przychód poprzedni tydzień: ${snapshot.revenuePreviousWeek} PLN
- Zmiana przychodu: ${snapshot.revenueChangePercent}%
- Zlecenia po terminie: ${snapshot.overdueOrders}
- Średnia marża: ${snapshot.avgMarginPercent}%
- Nieaktywni klienci (>30 dni): ${snapshot.inactiveCustomers}
- Zlecenia z deadline w 3 dni: ${snapshot.deadlineRiskOrders}
- Niski stan magazynu: ${snapshot.lowStockCount} pozycji
- Ukończone ten tydzień: ${snapshot.completedThisWeek}
- Aktywne zlecenia: ${snapshot.activeOrders}

ZASADY:
- Generuj 3-5 insightów
- Każdy insight musi mieć KONKRETNĄ rekomendację (co zrobić)
- Używaj polskiego
- Severity: "positive" dla dobrych trendów, "warning" dla uwag, "critical" dla pilnych, "info" dla informacyjnych
- Typy: revenue_trend, machine_utilization, customer_activity, margin_analysis, deadline_risk, inventory_alert, productivity
- Ikony: 📈📉⏰⚡💰💎👥📦✅🔧
- Nie wymyślaj danych — opieraj się TYLKO na podanych liczbach
- Jeśli wartość = 0, nie generuj insightu o tym temacie`

  const result = await callGemini<AIInsight[]>({
    label: 'ai-insights',
    prompt,
    responseSchema: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: { type: SchemaType.STRING, description: 'Typ: revenue_trend, machine_utilization, customer_activity, margin_analysis, deadline_risk, inventory_alert, productivity' },
          severity: { type: SchemaType.STRING, description: 'Severity: positive, warning, critical, info' },
          icon: { type: SchemaType.STRING, description: 'Emoji icon' },
          title: { type: SchemaType.STRING, description: 'Krótki tytuł po polsku (max 60 znaków)' },
          description: { type: SchemaType.STRING, description: 'Opis po polsku z konkretną rekomendacją (max 150 znaków)' },
        },
        required: ['type', 'severity', 'icon', 'title', 'description'],
      },
    },
    temperature: 0.3,
  })

  if (!result) {
    logger.warn('[ai-insights] callGemini returned null — using heuristic fallback')
    return generateHeuristicInsights(snapshot)
  }

  // Validate and sanitize
  const validTypes: string[] = ['revenue_trend', 'machine_utilization', 'customer_activity', 'margin_analysis', 'deadline_risk', 'inventory_alert', 'productivity']
  const validSeverities: string[] = ['positive', 'warning', 'critical', 'info']

  const insights = Array.isArray(result.data) ? result.data : []
  return insights
    .filter(i => validTypes.includes(i.type) && validSeverities.includes(i.severity))
    .slice(0, 5)
}

// ============================================
// CACHE: READ
// ============================================

export async function getOrGenerateInsights(companyId: string): Promise<AIInsightsData> {
  const supabase = await createClient()

  const { data: cached } = await supabase
    .from('ai_insights')
    .select('insights, generated_at, expires_at, model')
    .eq('company_id', companyId)
    .single()

  if (cached) {
    const now = new Date()
    const expiresAt = new Date(cached.expires_at)
    const isStale = now > expiresAt

    return {
      insights: (cached.insights as AIInsight[]) || [],
      generatedAt: cached.generated_at,
      expiresAt: cached.expires_at,
      model: cached.model,
      isStale,
    }
  }

  // No cached data — return empty with stale flag
  return {
    insights: [],
    generatedAt: null,
    expiresAt: null,
    model: null,
    isStale: true,
  }
}

// ============================================
// CACHE: REFRESH (server action)
// ============================================

export async function refreshInsights(companyId: string): Promise<AIInsightsData> {
  const supabase = await createClient()

  // Aggregate production data
  const snapshot = await aggregateInsightsData(companyId)

  // Generate insights (AI or heuristic fallback)
  const insights = await generateInsightsWithAI(snapshot)

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000) // +6 hours

  // Upsert (1 row per company)
  const { error } = await supabase
    .from('ai_insights')
    .upsert(
      {
        company_id: companyId,
        insights: JSON.parse(JSON.stringify(insights)),
        data_snapshot: JSON.parse(JSON.stringify(snapshot)),
        model: 'gemini-2.5-flash',
        generated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'company_id' }
    )

  if (error) {
    logger.error('[ai-insights] Failed to save insights', { error })
  }

  return {
    insights,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    model: 'gemini-2.5-flash',
    isStale: false,
  }
}
