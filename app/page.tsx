import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getDashboardSummary } from '@/lib/dashboard-queries';
import { canAccessModule } from '@/lib/permissions-server';
import AppLayout from '@/components/layout/AppLayout';
import DashboardClient from '@/components/dashboard/DashboardClient';
import { DashboardPreferences, DEFAULT_DASHBOARD_PREFERENCES } from '@/types/dashboard';

export default async function HomePage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[HOME] User:', user ? `${user.id} (${user.email})` : 'null');

  if (!user) {
    console.log('[HOME] No user - redirecting to /login');
    redirect('/login');
  }

  // Get current user with company info and dashboard preferences
  const { data: currentUser, error } = await supabase
    .from('users')
    .select('*, company:companies!fk_company(*)')
    .eq('auth_id', user.id)
    .single();

  console.log('[HOME] Current user:', currentUser ? `${currentUser.id} (company: ${currentUser.company_id})` : 'null');
  console.log('[HOME] Query error:', error);

  if (!currentUser || !currentUser.company_id) {
    console.log('[HOME] No currentUser or company_id - redirecting to /login');
    redirect('/login');
  }

  // Permission check - dashboard access
  const hasAccess = await canAccessModule('dashboard');
  if (!hasAccess) {
    redirect('/no-access');
  }

  // Fetch dashboard data
  const dashboardData = await getDashboardSummary(currentUser.company_id);

  // Get user's dashboard preferences
  const preferences: DashboardPreferences =
    (currentUser.dashboard_preferences as DashboardPreferences) || DEFAULT_DASHBOARD_PREFERENCES;

  return (
    <AppLayout>
      <DashboardClient
        userId={currentUser.id}
        userName={currentUser.full_name}
        companyName={currentUser.company?.name || 'N/A'}
        initialPreferences={preferences}
        dashboardData={dashboardData}
      />
    </AppLayout>
  );
}
