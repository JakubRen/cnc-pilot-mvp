// ============================================
// components/time-tracking/StaleTimerAlert.tsx
// Alert for timers running >12 hours
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface StaleTimer {
  id: string;
  order_number: string;
  user_name: string;
  start_time: string;
  duration_seconds: number;
}

// Type for Supabase join result (relations come as arrays or objects)
interface TimeLogWithRelations {
  id: string;
  start_time: string;
  duration_seconds: number;
  orders: { order_number: string }[] | { order_number: string } | null;
  users: { full_name: string }[] | { full_name: string } | null;
}

export default function StaleTimerAlert({ companyId }: { companyId: string }) {
  const [staleTimers, setStaleTimers] = useState<StaleTimer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaleTimers();

    const interval = setInterval(loadStaleTimers, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const loadStaleTimers = async () => {
    try {
      const twelveHoursAgo = new Date();
      twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          id,
          start_time,
          duration_seconds,
          orders (order_number),
          users (full_name)
        `)
        .eq('company_id', companyId)
        .eq('status', 'running')
        .lt('start_time', twelveHoursAgo.toISOString());

      if (error) throw error;

      const logs = data as unknown as TimeLogWithRelations[] | null;
      const formatted = logs?.map(log => {
        const orderNum = Array.isArray(log.orders)
          ? log.orders[0]?.order_number
          : log.orders?.order_number;
        const userName = Array.isArray(log.users)
          ? log.users[0]?.full_name
          : log.users?.full_name;
        return {
          id: log.id,
          order_number: orderNum ?? 'Unknown',
          user_name: userName ?? 'Unknown',
          start_time: log.start_time,
          duration_seconds: log.duration_seconds
        };
      }) || [];

      setStaleTimers(formatted);
    } catch (err) {
      logger.error('Failed to load stale timers', { error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleStopTimer = async (timerId: string) => {
    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          status: 'completed',
          end_time: new Date().toISOString()
        })
        .eq('id', timerId);

      if (error) throw error;

      setStaleTimers(prev => prev.filter(t => t.id !== timerId));
    } catch (err) {
      logger.error('Failed to stop timer', { error: err });
      alert('Failed to stop timer. Please try again.');
    }
  };

  if (loading || staleTimers.length === 0) return null;

  return (
    <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-400 mb-2">
            Long-Running Timers Detected
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
            The following timers have been running for over 12 hours:
          </p>
          <div className="space-y-2">
            {staleTimers.map(timer => {
              const hoursRunning = Math.floor(
                (new Date().getTime() - new Date(timer.start_time).getTime()) / (1000 * 60 * 60)
              );

              return (
                <div
                  key={timer.id}
                  className="bg-white dark:bg-slate-800 rounded p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">
                      Order #{timer.order_number} - {timer.user_name}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Running for {hoursRunning} hours
                    </div>
                  </div>
                  <button
                    onClick={() => handleStopTimer(timer.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium text-white transition"
                  >
                    Stop Timer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
