// ============================================
// components/time-tracking/StaleTimerAlert.tsx
// Alert for timers running >12 hours
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StaleTimer {
  id: string;
  order_number: string;
  user_name: string;
  start_time: string;
  duration_seconds: number;
}

export default function StaleTimerAlert({ companyId }: { companyId: string }) {
  const [staleTimers, setStaleTimers] = useState<StaleTimer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaleTimers();

    const interval = setInterval(loadStaleTimers, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
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

      const formatted = data?.map(log => ({
        id: log.id,
        order_number: (log.orders as any)?.order_number || 'Unknown',
        user_name: (log.users as any)?.full_name || 'Unknown',
        start_time: log.start_time,
        duration_seconds: log.duration_seconds
      })) || [];

      setStaleTimers(formatted);
    } catch (err) {
      console.error('Failed to load stale timers:', err);
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
      console.error('Failed to stop timer:', err);
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
          <p className="text-sm text-slate-300 mb-3">
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
                  className="bg-slate-800 rounded p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      Order #{timer.order_number} - {timer.user_name}
                    </div>
                    <div className="text-sm text-slate-400">
                      Running for {hoursRunning} hours
                    </div>
                  </div>
                  <button
                    onClick={() => handleStopTimer(timer.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition"
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
