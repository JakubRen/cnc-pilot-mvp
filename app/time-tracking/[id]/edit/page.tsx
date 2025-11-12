// ============================================
// app/time-tracking/[id]/edit/page.tsx
// Edit time log page - Server Component
// ============================================

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import EditTimeLogForm from './EditTimeLogForm';

export default async function EditTimeLogPage({ params }: { params: { id: string } }) {
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

  // Fetch time log
  const { data: timeLog, error } = await supabase
    .from('time_logs')
    .select(`
      *,
      orders (
        id,
        order_number
      )
    `)
    .eq('id', params.id)
    .eq('company_id', currentUser.company_id)
    .single();

  if (error || !timeLog) {
    notFound();
  }

  // Check permissions
  const canEdit = timeLog.user_id === currentUser.id ||
                  currentUser.role === 'owner' ||
                  currentUser.role === 'manager';

  if (!canEdit) {
    redirect('/time-tracking');
  }

  // Fetch all orders for dropdown
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('company_id', currentUser.company_id)
    .order('order_number', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <EditTimeLogForm
          timeLog={timeLog}
          orders={orders || []}
        />
      </div>
    </div>
  );
}
