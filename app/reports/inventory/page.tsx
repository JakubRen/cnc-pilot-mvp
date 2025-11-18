import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import {
  getInventoryReport,
  getInventoryReportSummary,
  getInventoryCategories,
} from '@/lib/reports/inventory-report';
import InventoryReportClient from './InventoryReportClient';

export default async function InventoryReportPage() {
  const user = await getUserProfile();

  if (!user || !user.company_id) {
    redirect('/login');
  }

  const [items, summary, categories] = await Promise.all([
    getInventoryReport(user.company_id),
    getInventoryReportSummary(user.company_id),
    getInventoryCategories(user.company_id),
  ]);

  return (
    <div>
      <InventoryReportClient
        items={items}
        summary={summary}
        categories={categories}
      />
    </div>
  );
}
