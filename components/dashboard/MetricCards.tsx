import MetricCard from './MetricCard';
import { formatRevenue, formatNumber } from '@/lib/dashboard-utils';

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

export default function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Orders */}
      <MetricCard
        title="Wszystkie Zlecenia"
        value={formatNumber(metrics.totalOrders)}
        icon="📦"
        subtitle={`${metrics.activeOrders} w realizacji`}
        color="blue"
        link="/orders"
      />

      {/* Overdue Orders */}
      <MetricCard
        title="Po Terminie"
        value={formatNumber(metrics.overdueCount)}
        icon="⚠️"
        subtitle={metrics.overdueCount > 0 ? 'Wymaga uwagi!' : 'Wszystko w terminie'}
        color={metrics.overdueCount > 0 ? 'red' : 'green'}
        link="/orders"
      />

      {/* Revenue This Month */}
      <MetricCard
        title="Przychód (Miesiąc)"
        value={formatRevenue(metrics.revenueThisMonth)}
        icon="💰"
        subtitle={`${metrics.completedThisWeek} ukończonych w tym tygodniu`}
        color="green"
      />

      {/* Active Timers */}
      <MetricCard
        title="Aktywne Timery"
        value={formatNumber(metrics.activeTimers)}
        icon="⏱️"
        subtitle={metrics.activeTimers > 0 ? 'Operatorzy pracują' : 'Brak aktywnych'}
        color={metrics.activeTimers > 0 ? 'purple' : 'blue'}
        link="/time-tracking"
      />
    </div>
  );
}
