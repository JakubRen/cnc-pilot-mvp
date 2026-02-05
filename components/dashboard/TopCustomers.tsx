'use client'

import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';
import { PriceDisplay } from '@/components/permissions';

interface TopCustomersProps {
  customers: Array<{
    name: string;
    revenue: number;
    count: number;
  }>;
}

export default function TopCustomers({ customers }: TopCustomersProps) {
  const { canViewPrices } = usePermissions();
  const showRevenue = canViewPrices('dashboard');
  const maxRevenue = customers[0]?.revenue || 1;

  // DUAL THEME STYLES
  const containerClass = "bg-card rounded-lg p-6 shadow-sm border border-border min-h-[200px]";
  const headerTextClass = "text-xl font-semibold text-foreground";

  if (customers.length === 0) {
    return (
      <div className={containerClass}>
        <h2 className={`${headerTextClass} mb-4 flex items-center gap-2`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> Top 5 Klientów
        </h2>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Brak completed orders z kosztami
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Zamówienia z kosztami pojawią się tutaj po ukończeniu
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <h2 className={`${headerTextClass} mb-4 flex items-center gap-2`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg> Top 5 Klientów
      </h2>

      <div className="space-y-4 stagger-fade-in">
        {customers.map((customer, index) => (
          <Link
            key={customer.name}
            href={`/orders?search=${encodeURIComponent(customer.name)}`}
            className="block space-y-2 rounded-lg p-2 -m-2 hover:bg-accent transition group"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-500 dark:bg-yellow-600 text-white' :
                  index === 1 ? 'bg-muted-foreground text-white' :
                  index === 2 ? 'bg-orange-500 dark:bg-orange-700 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  #{index + 1}
                </span>
                <span className="font-semibold text-foreground truncate max-w-[180px] group-hover:text-primary transition-colors">
                  {customer.name}
                </span>
              </div>
              <div className="text-right">
                {showRevenue ? (
                  <PriceDisplay
                    value={customer.revenue}
                    module="dashboard"
                    className="font-bold text-green-600 dark:text-green-400"
                  />
                ) : (
                  <div className="font-bold text-muted-foreground">---</div>
                )}
                <div className="text-xs text-muted-foreground">
                  {customer.count} {customer.count === 1 ? 'zlecenie' : customer.count < 5 ? 'zlecenia' : 'zleceń'}
                </div>
              </div>
            </div>
            {/* Progress bar - tylko gdy widoczne revenue */}
            {showRevenue && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    index === 0 ? 'bg-green-500' :
                    index === 1 ? 'bg-violet-500' :
                    'bg-muted-foreground'
                  }`}
                  style={{ width: `${(customer.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
