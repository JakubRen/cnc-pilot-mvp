import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getDashboardSummary } from '@/lib/dashboard-queries';
import MetricCards from '@/components/dashboard/MetricCards';
import UrgentTasks from '@/components/dashboard/UrgentTasks';
import ProductionPlan from '@/components/dashboard/ProductionPlan';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import TopCustomers from '@/components/dashboard/TopCustomers';
import AppLayout from '@/components/layout/AppLayout';

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

  // Get current user with company info
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

  // Fetch dashboard data
  const dashboardData = await getDashboardSummary(currentUser.company_id);

  return (
    <AppLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Dashboard
                </h1>
                <p className="text-slate-400">
                  Witaj, {currentUser.full_name}! Oto podsumowanie Twojej produkcji.
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">
                  {currentUser.company?.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date().toLocaleDateString('pl-PL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <MetricCards metrics={dashboardData.metrics} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Urgent Tasks (1/3 width on desktop, full height) */}
            <div className="lg:col-span-1 flex">
              <UrgentTasks urgentTasks={dashboardData.urgentTasks} />
            </div>

            {/* Right column (2/3 width) - Production Plan + Top Customers */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <ProductionPlan productionPlan={dashboardData.productionPlan} />
              <div className="flex-1">
                <TopCustomers customers={dashboardData.topCustomers} />
              </div>
            </div>
          </div>

          {/* Activity Feed (Full Width) */}
          <ActivityFeed recentActivity={dashboardData.recentActivity} />
        </div>
      </div>
    </AppLayout>
  );
}
