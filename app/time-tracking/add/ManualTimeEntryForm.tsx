// ============================================
// app/time-tracking/add/ManualTimeEntryForm.tsx
// Manual time entry form - Client Component
// ============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { validateTimeRange } from '@/lib/time-utils';
import { logger } from '@/lib/logger';

interface Order {
  id: string;
  order_number: string;
}

interface Props {
  orders: Order[];
  currentUserId: number;
  companyId: string;
  defaultHourlyRate: number;
}

export default function ManualTimeEntryForm({
  orders,
  currentUserId,
  companyId,
  defaultHourlyRate
}: Props) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    order_id: orders[0]?.id || '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate
      if (!formData.order_id || !formData.start_time || !formData.end_time) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate time range
      const validation = validateTimeRange(
        new Date(formData.start_time),
        new Date(formData.end_time)
      );

      if (!validation.valid) {
        setError(validation.error || 'Invalid time range');
        setLoading(false);
        return;
      }

      // Insert time log (trigger will calculate duration and cost)
      const { error: insertError } = await supabase
        .from('time_logs')
        .insert({
          order_id: formData.order_id,
          user_id: currentUserId,
          company_id: companyId,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          status: 'completed',
          hourly_rate: defaultHourlyRate,
          notes: formData.notes || null
        });

      if (insertError) throw insertError;

      router.push('/time-tracking');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create time entry';
      setError(message);
      logger.error('Create error', { error: err });
    } finally {
      setLoading(false);
    }
  };

  // Calculate preview
  const durationPreview = formData.start_time && formData.end_time ? (() => {
    const start = new Date(formData.start_time);
    const end = new Date(formData.end_time);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const cost = (seconds / 3600) * defaultHourlyRate;
    return { hours, minutes, cost };
  })() : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/time-tracking"
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to Time Tracking
        </Link>
        <h1 className="text-3xl font-bold mb-2">Add Time Entry</h1>
        <p className="text-slate-400">
          Manually add a time entry (for corrections or retroactive logging)
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        {error && (
          <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Order Selection */}
          <div>
            <label htmlFor="order_id" className="block text-sm font-medium mb-2">Order *</label>
            <select
              id="order_id"
              autoFocus
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an order</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.order_number}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium mb-2">Start Time *</label>
            <input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium mb-2">End Time *</label>
            <input
              id="end_time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Add any notes about this time entry (e.g., 'Retroactive entry for yesterday')"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview */}
          {durationPreview && (
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4">
              <div className="text-sm text-blue-400 mb-2 font-semibold">Preview</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">Duration</div>
                  <div className="text-xl font-bold">
                    {durationPreview.hours}h {durationPreview.minutes}m
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-sm">Cost</div>
                  <div className="text-xl font-bold text-green-400">
                    {durationPreview.cost.toFixed(2)} PLN
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-2">
                Rate: {defaultHourlyRate} PLN/h
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
          >
            {loading ? 'Creating...' : 'Create Time Entry'}
          </button>
          <Link
            href="/time-tracking"
            className="px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
