// Dashboard types and interfaces

export interface DashboardPreferences {
  metricCards: boolean
  urgentTasks: boolean
  productionPlan: boolean
  topCustomers: boolean
  ordersChart: boolean
  activityFeed: boolean
  revenueChart: boolean
  topCustomersAnalyticsChart: boolean
  productivityChart: boolean
  profitabilityWidget: boolean
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  metricCards: true,
  urgentTasks: true,
  productionPlan: true,
  topCustomers: true,
  ordersChart: true,
  activityFeed: true,
  revenueChart: true,
  topCustomersAnalyticsChart: true,
  productivityChart: true,
  profitabilityWidget: true,
}

export interface DashboardWidget {
  key: keyof DashboardPreferences
  label: string
  description: string
  icon: string
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  {
    key: 'metricCards',
    label: 'Karty Metryczne',
    description: 'Podstawowe statystyki (zamówienia, timery, stany)',
    icon: '📊',
  },
  {
    key: 'urgentTasks',
    label: 'Pilne Zadania',
    description: 'Przeterminowane zamówienia, niskie stany, stałe timery',
    icon: '⚠️',
  },
  {
    key: 'productionPlan',
    label: 'Plan Produkcji',
    description: '20 najbliższych zamówień według deadline',
    icon: '📋',
  },
  {
    key: 'topCustomers',
    label: 'Najlepsi Klienci',
    description: 'Top 5 klientów wg przychodu',
    icon: '⭐',
  },
  {
    key: 'ordersChart',
    label: 'Wykres Zamówień',
    description: 'Liczba zamówień w ostatnich 30 dniach',
    icon: '📈',
  },
  {
    key: 'activityFeed',
    label: 'Ostatnia Aktywność',
    description: 'Ostatnie akcje w systemie',
    icon: '🔔',
  },
  {
    key: 'revenueChart',
    label: 'Wykres Przychodów',
    description: 'Przychody w ostatnich 30 dniach',
    icon: '💰',
  },
  {
    key: 'topCustomersAnalyticsChart',
    label: 'Wykres Top Klientów',
    description: 'Top 10 klientów według przychodów',
    icon: '👥',
  },
  {
    key: 'productivityChart',
    label: 'Wykres Produktywności',
    description: 'Produktywność pracowników (godziny, zarobki)',
    icon: '⚡',
  },
  {
    key: 'profitabilityWidget',
    label: 'Rentowność',
    description: 'Analiza zysków i marży (30 dni)',
    icon: '💰',
  },
]
