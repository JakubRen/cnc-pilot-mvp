// ============================================
// app/time-tracking/page.tsx
// Time tracking list page - Server Component
// ============================================

import { createClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import TimeLogsClient from './TimeLogsClient';
import StaleTimerAlert from '@/components/time-tracking/StaleTimerAlert';

export const metadata = {
  title: 'Time Tracking | CNC Pilot',
  description: 'Track time spent on orders'
};

export default async function TimeTrackingPage() {
  const supabase = await createClient();
  const currentUser = await getUserProfile();

  if (!currentUser || !currentUser.company_id) {
    redirect('/login');
  }

  // Fetch time logs with relations
  const { data: timeLogs, error } = await supabase
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
        full_name
      )
    `)
    .eq('company_id', currentUser.company_id)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time logs:', error);
  }

  // Fetch all orders for filter dropdown
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('company_id', currentUser.company_id)
    .order('order_number', { ascending: true });

  // Fetch all users for filter dropdown
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('company_id', currentUser.company_id)
    .order('full_name', { ascending: true });

  return (
    <AppLayout>
      <div className="text-white">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">⏱️ Czas Pracy</h1>
            <p className="text-slate-400">
              Śledź czas spędzony na zleceniach i monitoruj produktywność
            </p>
          </div>

          {/* Stale Timer Alert */}
          <StaleTimerAlert companyId={currentUser.company_id} />

          {/* Client Component with all data */}
          <TimeLogsClient
            timeLogs={timeLogs || []}
            orders={orders || []}
            users={users || []}
            currentUserId={currentUser.id}
            currentUserRole={currentUser.role}
          />
        </div>
      </div>
    </AppLayout>
  );
}
