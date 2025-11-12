// ============================================
// app/time-tracking/add/page.tsx
// Manual time entry form - Server Component
// ============================================

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ManualTimeEntryForm from './ManualTimeEntryForm';

export const metadata = {
  title: 'Add Time Entry | CNC Pilot',
  description: 'Manually add a time entry'
};

export default async function AddTimeEntryPage() {
  const supabase = createServerComponentClient({ cookies });

  // Check auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get current user
  const { data: currentUser } = await supabase
    .from('users')
    .select('id, company_id, hourly_rate')
    .eq('auth_id', session.user.id)
    .single();

  if (!currentUser) {
    redirect('/login');
  }

  // Fetch orders for dropdown
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number')
    .eq('company_id', currentUser.company_id)
    .order('order_number', { ascending: true });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <ManualTimeEntryForm
          orders={orders || []}
          currentUserId={currentUser.id}
          companyId={currentUser.company_id}
          defaultHourlyRate={currentUser.hourly_rate || 150}
        />
      </div>
    </div>
  );
}
