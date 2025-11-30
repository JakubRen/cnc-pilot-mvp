import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getOrdersReport, getOrdersReportSummary } from '@/lib/reports/orders-report';
import OrdersReportClient from './OrdersReportClient';

export default async function OrdersReportPage() {
  const user = await getUserProfile();

  if (!user || !user.company_id) {
    redirect('/login');
  }

  const [orders, summary] = await Promise.all([
    getOrdersReport(user.company_id),
    getOrdersReportSummary(user.company_id),
  ]);

  const safeSummary = summary ?? {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    delayed: 0,
    cancelled: 0,
    total_revenue: 0,
  };

  return (
    <div>
      <OrdersReportClient orders={orders} summary={safeSummary} />
    </div>
  );
}
