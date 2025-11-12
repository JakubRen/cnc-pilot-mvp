// ============================================
// app/time-tracking/page.tsx
// Time tracking list page - Server Component
// ============================================

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TimeLogsClient from './TimeLogsClient';
import StaleTimerAlert from '@/components/time-tracking/StaleTimerAlert';

export const metadata = {
  title: 'Time Tracking | CNC Pilot',
  description: 'Track time spent on orders'
};

export default async function TimeTrackingPage() {
  const supabase = createServerComponentClient({ cookies });

  // Check auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get current user with company_id
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, company_id, role, full_name')
    .eq('auth_id', session.user.id)
    .single();

  if (!currentUser) {
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
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">⏱️ Time Tracking</h1>
          <p className="text-slate-400">
            Track time spent on orders and monitor productivity
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
  );
}
