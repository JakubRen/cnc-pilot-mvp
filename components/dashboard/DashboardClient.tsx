'use client'

import { useState } from 'react'
import { DashboardPreferences, DEFAULT_DASHBOARD_PREFERENCES } from '@/types/dashboard'
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

interface Props {
  userId: number
  userName: string
  companyName: string
  initialPreferences: DashboardPreferences
  dashboardData: any
}

export default function DashboardClient({
  userId,
  userName,
  companyName,
  initialPreferences,
  dashboardData,
}: Props) {
  const [preferences, setPreferences] = useState<DashboardPreferences>(
    initialPreferences || DEFAULT_DASHBOARD_PREFERENCES
  )
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSavePreferences = (newPreferences: DashboardPreferences) => {
    setPreferences(newPreferences)
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-slate-400">
                Witaj, {userName}! Oto podsumowanie Twojej produkcji.
              </p>
            </div>
            <div className="text-right flex gap-4 items-start">
              {/* Personalization Button */}
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-semibold flex items-center gap-2 shadow-lg"
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
                Personalizuj
              </button>

              {/* Company & Date Info */}
              <div>
                <p className="text-sm text-slate-400">{companyName}</p>
                <p className="text-xs text-slate-500 mt-1">
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
            <OrdersChart data={dashboardData.ordersChartData} />
          </div>
        )}

        {/* Analytics Charts Grid (3 columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-1">
            <RevenueChart data={dashboardData.revenueChartData || []} />
          </div>

          {/* Top Customers Chart */}
          <div className="lg:col-span-1">
            <TopCustomersChart data={dashboardData.topCustomersAnalyticsData || []} />
          </div>

          {/* Productivity Chart */}
          <div className="lg:col-span-1">
            <ProductivityChart data={dashboardData.productivityData || []} />
          </div>
        </div>

        {/* Activity Feed (Full Width) */}
        {preferences.activityFeed && (
          <ActivityFeed recentActivity={dashboardData.recentActivity} />
        )}

        {/* Empty State - gdy wszystkie widgety wyłączone */}
        {!Object.values(preferences).some(Boolean) && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2">Dashboard jest pusty</h2>
            <p className="text-slate-400 mb-6">
              Włącz widgety w ustawieniach, aby zobaczyć dane
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              ⚙️ Personalizuj Dashboard
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
    </div>
  )
}
