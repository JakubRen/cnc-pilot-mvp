// ============================================
// app/time-tracking/[id]/edit/EditTimeLogForm.tsx
// Edit form for time logs - Client Component
// ============================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { validateTimeRange } from '@/lib/time-utils';

interface TimeLog {
  id: string;
  order_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  status: string;
  hourly_rate: number;
  notes: string | null;
  orders: {
    order_number: string;
  };
}

interface Order {
  id: string;
  order_number: string;
}

interface Props {
  timeLog: TimeLog;
  orders: Order[];
}

export default function EditTimeLogForm({ timeLog, orders }: Props) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    order_id: timeLog.order_id,
    start_time: timeLog.start_time.substring(0, 16), // Format for datetime-local
    end_time: timeLog.end_time ? timeLog.end_time.substring(0, 16) : '',
    notes: timeLog.notes || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate time range if end_time is set
      if (formData.end_time) {
        const validation = validateTimeRange(
          new Date(formData.start_time),
          new Date(formData.end_time)
        );

        if (!validation.valid) {
          setError(validation.error || 'Invalid time range');
          setLoading(false);
          return;
        }
      }

      // Update time log (trigger will recalculate duration and cost)
      const { error: updateError } = await supabase
        .from('time_logs')
        .update({
          order_id: formData.order_id,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
          notes: formData.notes || null
        })
        .eq('id', timeLog.id);

      if (updateError) throw updateError;

      router.push(`/time-tracking/${timeLog.id}`);
      router.refresh();
    } catch (err: unknown) {
      const error = err as Error | null
      setError(error?.message || 'Failed to update time log');
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/time-tracking/${timeLog.id}`}
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          ← Back to Details
        </Link>
        <h1 className="text-3xl font-bold mb-2">Edit Time Log</h1>
        <p className="text-slate-400">
          Update time log for Order #{(timeLog.orders as unknown as { order_number: string }).order_number}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        {error && (
          <div className="bg-red-900/20 border border-red-600 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Order Selection */}
          <div>
            <label htmlFor="edit_order_id" className="block text-sm font-medium mb-2">Order *</label>
            <select
              id="edit_order_id"
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {orders.map(order => (
                <option key={order.id} value={order.id}>
                  {order.order_number}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div>
            <label htmlFor="edit_start_time" className="block text-sm font-medium mb-2">Start Time *</label>
            <input
              id="edit_start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Time */}
          <div>
            <label htmlFor="edit_end_time" className="block text-sm font-medium mb-2">
              End Time <span className="text-slate-400">(optional - leave empty if still running)</span>
            </label>
            <input
              id="edit_end_time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="edit_notes" className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              id="edit_notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Add any notes about this time entry..."
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration Preview */}
          {formData.start_time && formData.end_time && (
            <div className="bg-slate-700 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Duration (calculated)</div>
              <div className="text-xl font-bold">
                {(() => {
                  const start = new Date(formData.start_time);
                  const end = new Date(formData.end_time);
                  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
                  const hours = Math.floor(seconds / 3600);
                  const minutes = Math.floor((seconds % 3600) / 60);
                  return `${hours}h ${minutes}m`;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-slate-700">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            href={`/time-tracking/${timeLog.id}`}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
