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
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="text-sm text-slate-400 mb-2">Dziś</div>
        <div className="text-3xl font-bold">{stats.todayHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Zarejestrowane godziny</div>
      </div>

      {/* This Week */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="text-sm text-slate-400 mb-2">Ten tydzień</div>
        <div className="text-3xl font-bold">{stats.weekHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Zarejestrowane godziny</div>
      </div>

      {/* This Month */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="text-sm text-slate-400 mb-2">Ten miesiąc</div>
        <div className="text-3xl font-bold">{stats.monthHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Zarejestrowane godziny</div>
      </div>

      {/* Month Cost - TYLKO DLA UPRAWNIONYCH */}
      <PermissionGuard prices="time-tracking">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="text-sm text-slate-400 mb-2">Koszt (miesiąc)</div>
          <div className="text-3xl font-bold">{stats.monthCost.toFixed(0)} PLN</div>
          <div className="text-xs text-slate-500 mt-1">Całkowity koszt pracy</div>
        </div>
      </PermissionGuard>
    </div>
  );
}
