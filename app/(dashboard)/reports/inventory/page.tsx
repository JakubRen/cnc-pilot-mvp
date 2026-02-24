import { getUserProfile } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import {
  getInventoryReport,
  getInventoryReportSummary,
  getInventoryCategories,
} from '@/lib/reports/inventory-report';
import InventoryReportClient from './InventoryReportClient';
import AIReportSummary from '@/components/reports/AIReportSummary';
import InventoryPredictionsPanel from '@/components/inventory/InventoryPredictionsPanel';

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

  const safeSummary = summary ?? {
    total_items: 0,
    total_value: 0,
    low_stock_count: 0,
    categories: 0,
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <AIReportSummary reportType="inventory" companyId={user.company_id} data={safeSummary} />
        <InventoryPredictionsPanel companyId={user.company_id} />
        <div className="mt-6">
          <InventoryReportClient
            items={items}
            summary={safeSummary}
            categories={categories}
          />
        </div>
      </div>
    </div>
  );
}
