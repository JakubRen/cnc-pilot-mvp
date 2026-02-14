'use client'

import { useState } from 'react'
import { DashboardPreferences, DEFAULT_DASHBOARD_PREFERENCES } from '@/types/dashboard'
import { useTranslation } from '@/hooks/useTranslation'
import PersonalizationModal from './PersonalizationModal'
import MetricCards from './MetricCards'
import UrgentTasks from './UrgentTasks'
import ProductionPlan from './ProductionPlan'
import ActivityFeed from './ActivityFeed'
import TopCustomers from './TopCustomers'
import OrdersChart from './OrdersChart'
import RevenueChart from './RevenueChart'
import TopCustomersChart from './TopCustomersChart'
import ProductivityChart from './ProductivityChart'
import ProfitabilityWidget from './ProfitabilityWidget'
import AIInsightsWidget from './AIInsightsWidget'
import AnomalyAlertsWidget from './AnomalyAlertsWidget'
import DemandForecastWidget from './DemandForecastWidget'
import RevenueForecastWidget from './RevenueForecastWidget'
import PageTransition from '@/components/ui/PageTransition'
import type { AIInsightsData } from '@/types/ai-insights'
import type { AnomalyAlertsData } from '@/types/anomaly-alerts'

interface DashboardData {
  metrics: {
    totalOrders: number
    activeOrders: number
    completedThisWeek: number
    overdueCount: number
    activeTimers: number
    lowStockCount: number
    revenueThisMonth: number
  }
  urgentTasks: {
    overdueOrders: Array<{ id: string; order_number: string; customer_name: string; deadline: string }>
    ordersDueToday: Array<{ id: string; order_number: string; customer_name: string; deadline: string }>
    lowStockItems: Array<{ id: string; name: string; quantity: number; unit: string; low_stock_threshold: number }>
    staleTimers: Array<{ id: string; start_time: string; order?: { order_number: string }; user?: { name: string } }>
  }
  productionPlan: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    deadline: string;
    status: string;
    quantity: number;
    assigned_operator?: { name: string };
    total_cost?: string | number;
  }>
  recentActivity: Array<{ type: string; title: string; subtitle: string; actor: string; timestamp: string; href?: string }>
  topCustomers: Array<{ name: string; revenue: number; count: number }>
  ordersChartData: Array<{ date: string; orders: number }>
  revenueChartData: Array<{ date: string; revenue: number }>
  topCustomersAnalyticsData: Array<{ customer: string; revenue: number; orders: number }> 
  productivityData: Array<{ employee: string; hours: number; earnings: number; ordersCompleted: number }>
  profitabilitySummary: {
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
}

interface Props {
  userId: number
  userName: string
  companyName: string
  companyId: string
  initialPreferences: DashboardPreferences
  dashboardData: DashboardData
  aiInsights: AIInsightsData
  anomalyAlerts: AnomalyAlertsData
}

export default function DashboardClient({
  userId,
  userName,
  companyName,
  companyId,
  initialPreferences,
  dashboardData,
  aiInsights,
  anomalyAlerts,
}: Props) {
  const { t } = useTranslation()
  const [preferences, setPreferences] = useState<DashboardPreferences>(
    initialPreferences || DEFAULT_DASHBOARD_PREFERENCES
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSavePreferences = (newPreferences: DashboardPreferences) => {
    setPreferences(newPreferences)
  }

  return (
    <PageTransition className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              {/* FIXED: text-white -> text-foreground */}
              <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">{t('nav', 'dashboard')}</h1>
              <p className="text-muted-foreground">
                {t('dashboard', 'welcome').replace('{name}', userName)}
              </p>
            </div>
            <div className="text-right flex gap-4 items-start">
              {/* Personalization Button - Theme aware */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition font-semibold flex items-center gap-2 shadow-sm"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {t('dashboard', 'customize')}
              </button>

              {/* Company & Date Info */}
              <div>
                <p className="text-sm text-foreground font-medium">{companyName}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {new Date().toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        {preferences.metricCards && <MetricCards metrics={dashboardData.metrics} />}

        {/* AI Insights Widget */}
        {preferences.aiInsights && (
          <div className="mb-6">
            <AIInsightsWidget initialInsights={aiInsights} companyId={companyId} />
          </div>
        )}

        {/* Anomaly Alerts Widget */}
        {preferences.anomalyAlerts && (
          <div className="mb-6">
            <AnomalyAlertsWidget data={anomalyAlerts} />
          </div>
        )}

        {/* Main Content Grid */}
        {(preferences.urgentTasks || preferences.productionPlan || preferences.topCustomers) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Urgent Tasks (1/3 width on desktop, full height) */}
            {preferences.urgentTasks && (
              <div className="lg:col-span-1 flex">
                <UrgentTasks urgentTasks={dashboardData.urgentTasks} />
              </div>
            )}

            {/* Right column (2/3 width) - Production Plan + Top Customers */}
            {(preferences.productionPlan || preferences.topCustomers) && (
              <div
                className={`${
                  preferences.urgentTasks ? 'lg:col-span-2' : 'lg:col-span-3'
                } flex flex-col gap-6`}
              >
                {preferences.productionPlan && (
                  <ProductionPlan productionPlan={dashboardData.productionPlan} />        
                )}
                {preferences.topCustomers && (
                  <div className="flex-1">
                    <TopCustomers customers={dashboardData.topCustomers} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Orders Chart (Full Width) */}
        {preferences.ordersChart && (
          <div className="mb-6">
            <OrdersChart />
          </div>
        )}

        {/* Analytics Charts Grid (3 columns) */}
        {(preferences.revenueChart || preferences.topCustomersAnalyticsChart || preferences.productivityChart || preferences.profitabilityWidget) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Revenue Chart */}
            {preferences.revenueChart && (
              <div className="lg:col-span-1">
                <RevenueChart data={dashboardData.revenueChartData || []} />
              </div>
            )}

            {/* Top Customers Chart */}
            {preferences.topCustomersAnalyticsChart && (
              <div className="lg:col-span-1">
                <TopCustomersChart data={dashboardData.topCustomersAnalyticsData || []} />
              </div>
            )}

            {/* Productivity Chart */}
            {preferences.productivityChart && (
              <div className="lg:col-span-1">
                <ProductivityChart data={dashboardData.productivityData || []} />
              </div>
            )}

            {/* Profitability Widget */}
            {preferences.profitabilityWidget && dashboardData.profitabilitySummary && (   
              <div className="lg:col-span-1">
                <ProfitabilityWidget data={dashboardData.profitabilitySummary} />
              </div>
            )}
          </div>
        )}

        {/* AI Forecast Widgets (2 columns) */}
        {(preferences.demandForecast || preferences.revenueForecast) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {preferences.demandForecast && (
              <DemandForecastWidget companyId={companyId} />
            )}
            {preferences.revenueForecast && (
              <RevenueForecastWidget companyId={companyId} />
            )}
          </div>
        )}

        {/* Activity Feed (Full Width) */}
        {preferences.activityFeed && (
          <ActivityFeed recentActivity={dashboardData.recentActivity} />
        )}

        {/* Empty State */}
        {!Object.values(preferences).some(Boolean) && (
          // FIXED: bg-slate-800 -> glass-panel / bg-card
          <div className="bg-card rounded-lg border border-border p-12 text-center shadow-sm">
            <div className="text-6xl mb-4 opacity-50 text-muted-foreground">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t('dashboard', 'emptyDashboard')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('dashboard', 'enableWidgets')}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-semibold"
            >
              {t('dashboard', 'customizeDashboard')}
            </button>
          </div>
        )}
      </div>

      {/* Personalization Modal */}
      <PersonalizationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentPreferences={preferences}
        userId={userId}
        onSave={handleSavePreferences}
      />
    </PageTransition>
  )
}
