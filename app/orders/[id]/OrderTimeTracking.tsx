// ============================================
// app/orders/[id]/OrderTimeTracking.tsx
// Time tracking section for order details page
// ============================================

'use client';

import { useState } from 'react';
import Timer from '@/components/time-tracking/Timer';
import { formatDurationHuman, compareActualVsEstimated, getComparisonBadgeColor } from '@/lib/time-utils';

interface TimeLog {
  id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  status: string;
  total_cost: number;
  users: {
    full_name: string;
  };
}

interface Props {
  orderId: string;
  orderNumber: string;
  estimatedHours: number | null;
  timeLogs: TimeLog[];
  currentUserId: number;
  companyId: string;
  hourlyRate: number;
}

export default function OrderTimeTracking({
  orderId,
  orderNumber,
  estimatedHours,
  timeLogs,
  currentUserId,
  companyId,
  hourlyRate
}: Props) {
  const [showTimer, setShowTimer] = useState(false);

  // Calculate totals
  const completedLogs = timeLogs.filter(log => log.status === 'completed');
  const totalSeconds = completedLogs.reduce((sum, log) => sum + log.duration_seconds, 0);
  const totalHours = totalSeconds / 3600;
  const totalCost = completedLogs.reduce((sum, log) => sum + log.total_cost, 0);

  // Compare with estimate
  let comparison: 'under' | 'on' | 'over' | null = null;
  if (estimatedHours && totalHours > 0) {
    comparison = compareActualVsEstimated(totalHours, estimatedHours);
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pl-PL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">⏱️ Time Tracking</h2>
        <button
          onClick={() => setShowTimer(!showTimer)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
        >
          {showTimer ? 'Hide Timer' : '🟢 Start Timer'}
        </button>
      </div>

      {/* Timer Component */}
      {showTimer && (
        <div className="mb-6">
          <Timer
            orderId={orderId}
            userId={currentUserId}
            companyId={companyId}
            hourlyRate={hourlyRate}
            orderNumber={orderNumber}
          />
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Time</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatDurationHuman(totalSeconds)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {totalHours.toFixed(2)} hours
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Cost</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalCost.toFixed(2)} PLN
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Labor cost
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">vs Estimate</div>
          {estimatedHours ? (
            <div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {estimatedHours.toFixed(1)}h
                </div>
                {comparison && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getComparisonBadgeColor(comparison)}`}>
                    {comparison === 'under' ? '✓ Under' : comparison === 'on' ? 'On Budget' : '! Over'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Estimated hours
              </div>
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400 text-sm">No estimate set</div>
          )}
        </div>
      </div>

      {/* Time Logs List */}
      {timeLogs.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
            Time Entries ({timeLogs.length})
          </h3>
          <div className="space-y-2">
            {timeLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">{log.users.full_name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDateTime(log.start_time)}
                    {log.end_time && ` - ${formatDateTime(log.end_time)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {formatDurationHuman(log.duration_seconds)}
                  </div>
                  {log.status === 'completed' && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {log.total_cost.toFixed(2)} PLN
                    </div>
                  )}
                  {log.status !== 'completed' && (
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      {log.status}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <div className="text-4xl mb-2">⏱️</div>
          <div>No time logged yet</div>
          <div className="text-sm">Click &quot;Start Timer&quot; to begin tracking</div>
        </div>
      )}
    </div>
  );
}
