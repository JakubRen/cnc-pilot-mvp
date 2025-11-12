// ============================================
// components/time-tracking/TimeStats.tsx
// Statistics cards for time tracking
// ============================================

'use client';

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
        <div className="text-sm text-slate-400 mb-2">Today</div>
        <div className="text-3xl font-bold">{stats.todayHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Hours logged</div>
      </div>

      {/* This Week */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="text-sm text-slate-400 mb-2">This Week</div>
        <div className="text-3xl font-bold">{stats.weekHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Hours logged</div>
      </div>

      {/* This Month */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="text-sm text-slate-400 mb-2">This Month</div>
        <div className="text-3xl font-bold">{stats.monthHours.toFixed(1)}h</div>
        <div className="text-xs text-slate-500 mt-1">Hours logged</div>
      </div>

      {/* Month Cost */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="text-sm text-slate-400 mb-2">Month Cost</div>
        <div className="text-3xl font-bold">{stats.monthCost.toFixed(0)} PLN</div>
        <div className="text-xs text-slate-500 mt-1">Total labor cost</div>
      </div>
    </div>
  );
}
