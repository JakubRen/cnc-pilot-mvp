'use client';

import { memo } from 'react';
import MetricCard from './MetricCard';
import { formatRevenue, formatNumber } from '@/lib/dashboard-utils';
import { PermissionGuard } from '@/components/permissions';
import { useTranslation } from '@/hooks/useTranslation';

interface MetricCardsProps {
  metrics: {
    totalOrders: number;
    activeOrders: number;
    completedThisWeek: number;
    overdueCount: number;
    activeTimers: number;
    lowStockCount: number;
    revenueThisMonth: number;
  };
}

// Memoized to prevent unnecessary re-renders when parent state changes
const MetricCards = memo(function MetricCards({ metrics }: MetricCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Orders */}
      <MetricCard
        title={t('dashboard', 'allOrders')}
        value={formatNumber(metrics.totalOrders)}
        icon="📦"
        subtitle={`${metrics.activeOrders} ${t('dashboard', 'inProgress')}`}
        color="blue"
        link="/orders"
      />

      {/* Overdue Orders */}
      <MetricCard
        title={t('dashboard', 'overdueLabel')}
        value={formatNumber(metrics.overdueCount)}
        icon="⚠️"
        subtitle={metrics.overdueCount > 0 ? t('dashboard', 'needsAttention') : t('dashboard', 'allOnTime')}
        color={metrics.overdueCount > 0 ? 'red' : 'green'}
        link="/orders"
      />

      {/* Revenue This Month - TYLKO DLA UPRAWNIONYCH */}
      <PermissionGuard prices="dashboard">
        <MetricCard
          title={t('dashboard', 'revenueMonth')}
          value={formatRevenue(metrics.revenueThisMonth)}
          icon="💰"
          subtitle={`${metrics.completedThisWeek} ${t('dashboard', 'completedThisWeek')}`}
          color="green"
        />
      </PermissionGuard>

      {/* Active Timers */}
      <MetricCard
        title={t('dashboard', 'activeTimers')}
        value={formatNumber(metrics.activeTimers)}
        icon="⏱️"
        subtitle={metrics.activeTimers > 0 ? t('dashboard', 'operatorsWorking') : t('dashboard', 'noActive')}
        color={metrics.activeTimers > 0 ? 'purple' : 'blue'}
        link="/time-tracking"
      />
    </div>
  );
});

export default MetricCards;
