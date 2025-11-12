// ============================================
// app/time-tracking/[id]/page.tsx
// Time log details page - Server Component
// ============================================

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { formatDuration, formatDurationHuman, getStatusBadgeColor } from '@/lib/time-utils';

export default async function TimeLogDetailsPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies });

  // Check auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get current user
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, company_id, role')
    .eq('auth_id', session.user.id)
    .single();

  if (!currentUser) {
    redirect('/login');
  }

  // Fetch time log with relations
  const { data: timeLog, error } = await supabase
    .from('time_logs')
    .select(`
      *,
      orders (
        id,
        order_number,
        estimated_hours
      ),
      users (
        id,
        full_name,
        email
      )
    `)
    .eq('id', params.id)
    .eq('company_id', currentUser.company_id)
    .single();

  if (error || !timeLog) {
    notFound();
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(dateString));
  };

  const canEdit = timeLog.user_id === currentUser.id ||
                  currentUser.role === 'owner' ||
                  currentUser.role === 'manager';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/time-tracking"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
          >
            ← Back to Time Tracking
          </Link>
          <h1 className="text-3xl font-bold mb-2">Time Log Details</h1>
          <p className="text-slate-400">
            Complete information about this time entry
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400 mb-1">Order</div>
                <Link
                  href={`/orders/${(timeLog.orders as any).id}`}
                  className="text-2xl font-bold text-blue-400 hover:text-blue-300"
                >
                  {(timeLog.orders as any).order_number}
                </Link>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeColor(timeLog.status)}`}>
                {timeLog.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Time Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-300">Time Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Start Time</div>
                  <div className="font-medium">{formatDateTime(timeLog.start_time)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">End Time</div>
                  <div className="font-medium">
                    {timeLog.end_time ? formatDateTime(timeLog.end_time) : (
                      <span className="text-green-400">Running...</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Duration</div>
                  <div className="font-medium text-xl">
                    {formatDuration(timeLog.duration_seconds)}
                    <span className="text-sm text-slate-400 ml-2">
                      ({formatDurationHuman(timeLog.duration_seconds)})
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Status</div>
                  <div className="font-medium capitalize">{timeLog.status}</div>
                </div>
              </div>
            </div>

            {/* Cost Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-300">Cost Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Hourly Rate</div>
                  <div className="font-medium text-xl">{timeLog.hourly_rate.toFixed(2)} PLN/h</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Total Cost</div>
                  <div className="font-medium text-xl text-green-400">
                    {timeLog.total_cost.toFixed(2)} PLN
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-300">Operator Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">Operator Name</div>
                  <div className="font-medium">{(timeLog.users as any).full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Email</div>
                  <div className="font-medium text-slate-300">{(timeLog.users as any).email}</div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {timeLog.notes && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-slate-300">Notes</h3>
                <div className="bg-slate-700 rounded-lg p-4">
                  <p className="text-slate-300">{timeLog.notes}</p>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-slate-300">Audit Trail</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-400 mb-1">Created At</div>
                  <div className="text-slate-300">{formatDateTime(timeLog.created_at)}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-1">Last Updated</div>
                  <div className="text-slate-300">{formatDateTime(timeLog.updated_at)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="p-6 border-t border-slate-700 bg-slate-700/30">
              <Link
                href={`/time-tracking/${timeLog.id}/edit`}
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
              >
                Edit Time Log
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
