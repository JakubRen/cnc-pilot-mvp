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
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/usePermissions';
import { PriceDisplay } from '@/components/permissions';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';
import { useConfirmation } from '@/components/ui/ConfirmationDialog';

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
  const { confirm, ConfirmDialog } = useConfirmation();
  const showPrices = canViewPrices('time-tracking');

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Usunąć wpis czasu?',
      description: 'Czy na pewno chcesz usunąć ten wpis czasu pracy? Tej akcji nie można cofnąć.',
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    });

    if (!confirmed) return;

    const loadingToast = toast.loading('Usuwanie...');

    try {
      const { error } = await supabase
        .from('time_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.dismiss(loadingToast);
      toast.success('Wpis usunięty!');
      router.refresh();
    } catch (error) {
      toast.dismiss(loadingToast);
      logger.error('Error deleting time log', { error });
      toast.error('Nie udało się usunąć wpisu.');
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
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
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
    <>
      <ConfirmDialog />
      {/* Desktop View - Table (hidden on mobile) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Zlecenie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Operator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Koniec
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Czas trwania
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Status
                </th>
                {showPrices && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Koszt
                  </th>
                )}
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {timeLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
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
                  <td className="px-6 py-4 whitespace-nowrap text-slate-900 dark:text-slate-300 text-sm">
                    {log.users.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {formatDateTime(log.start_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {log.end_time ? formatDateTime(log.end_time) : (
                      <span className="text-green-400 font-medium animate-pulse">W toku...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-900 dark:text-slate-300">
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
                          className="font-medium text-slate-900 dark:text-slate-300"
                        />
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">-</span>
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

      {/* Mobile View - Cards (visible only on mobile) */}
      <div className="md:hidden space-y-4">
        {timeLogs.map((log) => (
          <div
            key={log.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Zlecenie:</span>
                <Button
                  href={`/orders/${log.order_id}`}
                  variant="ghost"
                  size="sm"
                  className="text-blue-400 hover:text-blue-300 p-0 h-auto font-bold"
                >
                  {log.orders.order_number}
                </Button>
              </div>
              {getStatusBadge(log.status)}
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              {/* Operator */}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                  Operator
                </p>
                <p className="text-base text-slate-900 dark:text-white font-medium">
                  {log.users.full_name}
                </p>
              </div>

              {/* Time Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                    Start
                  </p>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {formatDateTime(log.start_time)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                    Koniec
                  </p>
                  {log.end_time ? (
                    <p className="text-sm text-slate-900 dark:text-white">
                      {formatDateTime(log.end_time)}
                    </p>
                  ) : (
                    <p className="text-sm text-green-400 font-medium animate-pulse">
                      W toku...
                    </p>
                  )}
                </div>
              </div>

              {/* Duration */}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                  Czas trwania
                </p>
                <p className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                  {formatDurationHuman(log.duration_seconds)}
                </p>
              </div>

              {/* Cost (if permissions) */}
              {showPrices && log.status === 'completed' && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                    Koszt
                  </p>
                  <PriceDisplay
                    value={log.total_cost}
                    module="time-tracking"
                    className="text-lg font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Notes (if any) */}
              {log.notes && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
                    Notatki
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {log.notes}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Button
                  href={`/time-tracking/${log.id}`}
                  variant="primary"
                  size="sm"
                  className="flex-1"
                >
                  Podgląd
                </Button>
                {canDelete && (
                  <Button
                    onClick={() => handleDelete(log.id)}
                    variant="danger"
                    size="sm"
                    className="flex-1"
                  >
                    Usuń
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
