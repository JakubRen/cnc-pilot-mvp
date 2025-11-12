// ============================================
// app/time-tracking/add/page.tsx
// Manual time entry form - Server Component
// ============================================

import { createClient } from '@/lib/supabase-server';
import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import ManualTimeEntryForm from './ManualTimeEntryForm';

export const metadata = {
  title: 'Add Time Entry | CNC Pilot',
  description: 'Manually add a time entry'
};

export default async function AddTimeEntryPage() {
  const supabase = await createClient();
  const currentUser = await getUserProfile();

  if (!currentUser || !currentUser.company_id) {
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
