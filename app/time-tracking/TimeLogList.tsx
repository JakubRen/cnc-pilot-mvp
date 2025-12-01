// ============================================
// app/time-tracking/TimeLogList.tsx
// Table displaying time logs
// ============================================

'use client';

import { formatDurationHuman } from '@/lib/time-utils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePermissions } from '@/hooks/usePermissions';
import { PriceDisplay } from '@/components/permissions';

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

export default function TimeLogList({ timeLogs, currentUserRole }: Props) {
  const router = useRouter();
  const { canViewPrices } = usePermissions();
  const showPrices = canViewPrices('time-tracking');

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wpis czasu?')) {
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
      alert('Nie udało się usunąć wpisu.');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return <Badge variant="success">W toku</Badge>
      case 'completed': return <Badge variant="default">Zakończone</Badge>
      case 'paused': return <Badge variant="warning">Wstrzymane</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const canDelete = currentUserRole === 'owner' || currentUserRole === 'manager';

  if (timeLogs.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
        <EmptyState
          icon="⏱️"
          title="Brak wpisów czasu pracy"
          description="Nie znaleziono żadnych wpisów czasu pracy pasujących do wybranych filtrów. Dodaj pierwszy wpis aby śledzić czas pracy na zleceniach."
          actionLabel="+ Dodaj Wpis Czasu"
          actionHref="/time-tracking/add"
        />
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
                Zlecenie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Operator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Koniec
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Czas trwania
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                Status
              </th>
              {showPrices && (
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                  Koszt
                </th>
              )}
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {timeLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-700/50 transition">
                <td className="px-6 py-4 whitespace-nowrap">
                  <Button
                    href={`/orders/${log.order_id}`}
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                  >
                    {log.orders.order_number}
                  </Button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-sm">
                  {log.users.full_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {formatDateTime(log.start_time)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                  {log.end_time ? formatDateTime(log.end_time) : (
                    <span className="text-green-400 font-medium animate-pulse">W toku...</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-300">
                  {formatDurationHuman(log.duration_seconds)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(log.status)}
                </td>
                {showPrices && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.status === 'completed' ? (
                      <PriceDisplay
                        value={log.total_cost}
                        module="time-tracking"
                        className="font-medium text-slate-300"
                      />
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                  <Button
                    href={`/time-tracking/${log.id}`}
                    variant="ghost"
                    size="sm"
                  >
                    Podgląd
                  </Button>
                  {canDelete && (
                    <Button
                      onClick={() => handleDelete(log.id)}
                      variant="danger"
                      size="sm"
                    >
                      Usuń
                    </Button>
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
