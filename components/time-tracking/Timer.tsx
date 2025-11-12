// ============================================
// components/time-tracking/Timer.tsx
// Real-time timer with crash protection
// ============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface TimerProps {
  orderId: string;
  userId: number;
  companyId: string;
  hourlyRate: number;
  orderNumber: string;
}

export default function Timer({ orderId, userId, companyId, hourlyRate, orderNumber }: TimerProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load active timer on mount (recovery)
  useEffect(() => {
    loadActiveTimer();
  }, []);

  // Browser close warning
  useEffect(() => {
    if (status === 'running') {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Timer is still running. Are you sure you want to leave?';
        return e.returnValue;
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [status]);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (status === 'running' && currentLogId) {
      const autoSaveInterval = setInterval(() => {
        autoSaveProgress();
      }, 10000);

      return () => clearInterval(autoSaveInterval);
    }
  }, [status, currentLogId, elapsedSeconds]);

  // Live timer countdown
  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status]);

  const loadActiveTimer = async () => {
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .in('status', ['running', 'paused'])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentLogId(data.id);
        setElapsedSeconds(data.duration_seconds || 0);
        setStatus(data.status as 'running' | 'paused');
      }
    } catch (err) {
      console.error('Failed to load active timer:', err);
    }
  };

  const autoSaveProgress = async () => {
    if (!currentLogId) return;

    try {
      await supabase
        .from('time_logs')
        .update({
          duration_seconds: elapsedSeconds,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentLogId);
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check for existing active timer
      const { data: existingTimer } = await supabase
        .from('time_logs')
        .select('id, order_id, orders(order_number)')
        .eq('user_id', userId)
        .in('status', ['running', 'paused'])
        .maybeSingle();

      if (existingTimer) {
        const orderNumber = (existingTimer.orders as any)?.[0]?.order_number || 'Unknown';
        const shouldStop = confirm(
          `You have an active timer on Order #${orderNumber}. Stop it and start new timer?`
        );

        if (!shouldStop) {
          setLoading(false);
          return;
        }

        await supabase
          .from('time_logs')
          .update({
            status: 'completed',
            end_time: new Date().toISOString()
          })
          .eq('id', existingTimer.id);
      }

      // Create new timer
      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          order_id: orderId,
          user_id: userId,
          company_id: companyId,
          start_time: new Date().toISOString(),
          status: 'running',
          hourly_rate: hourlyRate,
          duration_seconds: 0,
          total_cost: 0
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentLogId(data.id);
      setStatus('running');
      setElapsedSeconds(0);
    } catch (err: any) {
      setError(err.message || 'Failed to start timer');
      console.error('Start timer error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!currentLogId) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          status: 'paused',
          duration_seconds: elapsedSeconds
        })
        .eq('id', currentLogId);

      if (error) throw error;

      setStatus('paused');
    } catch (err: any) {
      setError(err.message || 'Failed to pause timer');
      console.error('Pause timer error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!currentLogId) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({ status: 'running' })
        .eq('id', currentLogId);

      if (error) throw error;

      setStatus('running');
    } catch (err: any) {
      setError(err.message || 'Failed to resume timer');
      console.error('Resume timer error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!currentLogId) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('time_logs')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          duration_seconds: elapsedSeconds
        })
        .eq('id', currentLogId);

      if (error) throw error;

      setStatus('idle');
      setElapsedSeconds(0);
      setCurrentLogId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to stop timer');
      console.error('Stop timer error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentCost = (elapsedSeconds / 3600) * hourlyRate;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-lg font-semibold mb-4">
        Time Tracking: Order #{orderNumber}
      </h3>

      <div className="text-center mb-6">
        <div className="text-5xl font-mono font-bold text-white mb-2">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="text-sm text-slate-400">
          Cost: {currentCost.toFixed(2)} PLN | Rate: {hourlyRate} PLN/h
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        {status === 'idle' && (
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
          >
            {loading ? 'Starting...' : '🟢 Start'}
          </button>
        )}

        {status === 'running' && (
          <>
            <button
              onClick={handlePause}
              disabled={loading}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {loading ? 'Pausing...' : '🟡 Pause'}
            </button>
            <button
              onClick={handleStop}
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {loading ? 'Stopping...' : '🔴 Stop'}
            </button>
          </>
        )}

        {status === 'paused' && (
          <>
            <button
              onClick={handleResume}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {loading ? 'Resuming...' : '▶️ Resume'}
            </button>
            <button
              onClick={handleStop}
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
            >
              {loading ? 'Stopping...' : '🔴 Stop'}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 text-center">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          status === 'running' ? 'bg-green-600' :
          status === 'paused' ? 'bg-yellow-600' :
          'bg-slate-600'
        }`}>
          {status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
