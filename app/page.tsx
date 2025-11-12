import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getDashboardSummary } from '@/lib/dashboard-queries';
import MetricCards from '@/components/dashboard/MetricCards';
import UrgentTasks from '@/components/dashboard/UrgentTasks';
import ProductionPlan from '@/components/dashboard/ProductionPlan';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import AppLayout from '@/components/layout/AppLayout';

export default async function HomePage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get current user with company info
  const { data: currentUser } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('auth_id', user.id)
    .single();

  if (!currentUser || !currentUser.company_id) {
    redirect('/login');
  }

  // Fetch dashboard data
  const dashboardData = await getDashboardSummary(currentUser.company_id);

  return (
    <AppLayout>
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  Dashboard
                </h1>
                <p className="text-slate-400">
                  Witaj, {currentUser.name}! Oto podsumowanie Twojej produkcji.
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
            {/* Urgent Tasks (1/3 width on desktop) */}
            <div className="lg:col-span-1">
              <UrgentTasks urgentTasks={dashboardData.urgentTasks} />
            </div>

            {/* Production Plan (2/3 width on desktop) */}
            <div className="lg:col-span-2">
              <ProductionPlan productionPlan={dashboardData.productionPlan} />
            </div>
          </div>

          {/* Activity Feed (Full Width) */}
          <ActivityFeed recentActivity={dashboardData.recentActivity} />
        </div>
      </div>
    </AppLayout>
  );
}
