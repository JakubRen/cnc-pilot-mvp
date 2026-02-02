// ============================================
// components/time-tracking/TimeStats.tsx
// Statistics cards for time tracking
// ============================================

'use client';

import { PermissionGuard } from '@/components/permissions';

interface Stats {
  todayHours: number;
  weekHours: number;
  monthHours: number;
  monthCost: number;
}

interface Props {
  stats: Stats;
}

export default function TimeStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Today */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="text-sm text-muted-foreground mb-2">Dziś</div>
        <div className="text-3xl font-bold text-foreground">{stats.todayHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Zarejestrowane godziny</div>
      </div>

      {/* This Week */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="text-sm text-muted-foreground mb-2">Ten tydzień</div>
        <div className="text-3xl font-bold text-foreground">{stats.weekHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Zarejestrowane godziny</div>
      </div>

      {/* This Month */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="text-sm text-muted-foreground mb-2">Ten miesiąc</div>
        <div className="text-3xl font-bold text-foreground">{stats.monthHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Zarejestrowane godziny</div>
      </div>

      {/* Month Cost - TYLKO DLA UPRAWNIONYCH */}
      <PermissionGuard prices="time-tracking">
        <div className="bg-card rounded-lg p-6 border border-border">
          <div className="text-sm text-muted-foreground mb-2">Koszt (miesiąc)</div>
          <div className="text-3xl font-bold text-foreground">{stats.monthCost.toFixed(0)} PLN</div>
          <div className="text-xs text-slate-500 mt-1">Całkowity koszt pracy</div>
        </div>
      </PermissionGuard>
    </div>
  );
}
