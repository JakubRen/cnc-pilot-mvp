// Dashboard utility functions for formatting and calculations

// ============================================
// TIME FORMATTING
// ============================================

export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return `${diffSec} sekund temu`;
  } else if (diffMin < 60) {
    return `${diffMin} ${diffMin === 1 ? 'minuta' : diffMin < 5 ? 'minuty' : 'minut'} temu`;
  } else if (diffHour < 24) {
    return `${diffHour} ${diffHour === 1 ? 'godzina' : diffHour < 5 ? 'godziny' : 'godzin'} temu`;
  } else if (diffDay < 7) {
    return `${diffDay} ${diffDay === 1 ? 'dzień' : 'dni'} temu`;
  } else {
    return past.toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: diffDay > 365 ? 'numeric' : undefined,
    });
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// ============================================
// NUMBER FORMATTING
// ============================================

export function formatRevenue(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('pl-PL').format(num);
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(0)}%`;
}

// ============================================
// COLOR & STATUS HELPERS
// ============================================

export function getOrderPriorityColor(deadline: string, status: string): {
  color: 'red' | 'yellow' | 'green';
  label: string;
  icon: string;
} {
  if (status === 'completed') {
    return { color: 'green', label: 'Completed', icon: '✅' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Overdue
    return {
      color: 'red',
      label: `${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dzień' : 'dni'} po terminie`,
      icon: '🔴',
    };
  } else if (diffDays === 0) {
    // Due today
    return { color: 'red', label: 'Dziś!', icon: '⚠️' };
  } else if (diffDays <= 3) {
    // Due soon (1-3 days)
    return {
      color: 'yellow',
      label: `Za ${diffDays} ${diffDays === 1 ? 'dzień' : 'dni'}`,
      icon: '🟡',
    };
  } else {
    // On track (>3 days)
    return {
      color: 'green',
      label: `Za ${diffDays} dni`,
      icon: '🟢',
    };
  }
}

export function getStockStatusColor(
  quantity: number,
  threshold: number
): {
  color: 'red' | 'yellow' | 'green';
  label: string;
} {
  if (quantity === 0) {
    return { color: 'red', label: 'Brak na stanie' };
  } else if (quantity < threshold) {
    return { color: 'yellow', label: 'Niski stan' };
  } else {
    return { color: 'green', label: 'OK' };
  }
}

export function getStatusBadgeColor(status: string): {
  bgColor: string;
  textColor: string;
  label: string;
} {
  switch (status) {
    case 'pending':
      return {
        bgColor: 'bg-gray-600',
        textColor: 'text-white',
        label: 'Oczekuje',
      };
    case 'in_progress':
      return {
        bgColor: 'bg-blue-600',
        textColor: 'text-white',
        label: 'W realizacji',
      };
    case 'completed':
      return {
        bgColor: 'bg-green-600',
        textColor: 'text-white',
        label: 'Zakończone',
      };
    case 'cancelled':
      return {
        bgColor: 'bg-red-600',
        textColor: 'text-white',
        label: 'Anulowane',
      };
    default:
      return {
        bgColor: 'bg-gray-600',
        textColor: 'text-white',
        label: status,
      };
  }
}

// ============================================
// ACTIVITY FEED HELPERS
// ============================================

export function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    order_created: '📦',
    order_updated: '✏️',
    order_completed: '✅',
    timer_started: '⏱️',
    timer_stopped: '⏹️',
    inventory_updated: '📊',
    low_stock_alert: '⚠️',
    user_login: '👤',
  };
  return icons[type] || '•';
}

export function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    order_created: 'text-blue-600',
    order_completed: 'text-green-600',
    low_stock_alert: 'text-yellow-600',
    timer_started: 'text-purple-600',
  };
  return colors[type] || 'text-slate-600';
}

// ============================================
// METRIC HELPERS
// ============================================

export function calculateGrowth(current: number, previous: number): {
  percentage: number;
  isPositive: boolean;
  label: string;
} {
  if (previous === 0) {
    return {
      percentage: current > 0 ? 100 : 0,
      isPositive: current > 0,
      label: current > 0 ? '+100%' : '0%',
    };
  }

  const growth = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(growth),
    isPositive: growth > 0,
    label: `${growth > 0 ? '+' : ''}${growth.toFixed(0)}%`,
  };
}

export function getMetricIcon(metricType: string): string {
  const icons: Record<string, string> = {
    totalOrders: '📦',
    activeOrders: '🔄',
    completedOrders: '✅',
    overdueOrders: '⚠️',
    revenue: '💰',
    activeTimers: '⏱️',
    lowStock: '📉',
    operators: '👷',
  };
  return icons[metricType] || '📊';
}

// ============================================
// DATE HELPERS
// ============================================

export function isToday(dateString: string): boolean {
  const today = new Date();
  const date = new Date(dateString);
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export function isOverdue(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateString);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
}

export function getDaysUntil(dateString: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('pl-PL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
