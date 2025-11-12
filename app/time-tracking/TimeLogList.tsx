// ============================================
// app/time-tracking/TimeLogList.tsx
// Table displaying time logs
// ============================================

'use client';

import Link from 'next/link';
import { formatDurationHuman, getStatusBadgeColor } from '@/lib/time-utils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface TimeLog {
  id: string;
  order_id: string;
  user_id: number;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  status: string;
  hourly_rate: number;
  total_cost: number;
  notes: string | null;
  orders: {
    id: string;
    order_number: string;
  };
  users: {
    id: number;
    full_name: string;
  };
}

interface Props {
  timeLogs: TimeLog[];
  currentUserId: number;
  currentUserRole: string;
}

export default function TimeLogList({ timeLogs, currentUserId, currentUserRole }: Props) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this time log?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error('Error deleting time log:', error);
      alert('Failed to delete time log');
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pl-PL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const canDelete = currentUserRole === 'owner' || currentUserRole === 'manager';

  if (timeLogs.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
        <div className="text-4xl mb-4">⏱️</div>
        <h3 className="text-xl font-semibold mb-2">No Time Logs Found</h3>
        <p className="text-slate-400 mb-6">
          No time logs match your current filters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Operator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                End Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {timeLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-700/50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/orders/${log.order_id}`}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {log.orders.order_number}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {log.users.full_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatDateTime(log.start_time)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.end_time ? formatDateTime(log.end_time) : (
                    <span className="text-green-400">Running...</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatDurationHuman(log.duration_seconds)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(log.status)}`}>
                    {log.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {log.status === 'completed' ? (
                    <span className="font-medium">{log.total_cost.toFixed(2)} PLN</span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                  <Link
                    href={`/time-tracking/${log.id}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    View
                  </Link>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
