'use client'

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

  if (customers.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>👥</span> Top 5 Klientów
        </h2>
        <div className="text-center py-8">
          <p className="text-slate-400">
            Brak completed orders z kosztami
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Zamówienia z kosztami pojawią się tutaj po ukończeniu
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <span>👥</span> Top 5 Klientów
      </h2>

      <div className="space-y-4">
        {customers.map((customer, index) => (
          <div key={customer.name} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-600 text-white' :
                  index === 1 ? 'bg-slate-600 text-white' :
                  index === 2 ? 'bg-orange-700 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  #{index + 1}
                </span>
                <span className="font-semibold text-white truncate max-w-[180px]">
                  {customer.name}
                </span>
              </div>
              <div className="text-right">
                {showRevenue ? (
                  <PriceDisplay
                    value={customer.revenue}
                    module="dashboard"
                    className="font-bold text-green-400"
                  />
                ) : (
                  <div className="font-bold text-slate-400">---</div>
                )}
                <div className="text-xs text-slate-400">
                  {customer.count} {customer.count === 1 ? 'zlecenie' : customer.count < 5 ? 'zlecenia' : 'zleceń'}
                </div>
              </div>
            </div>
            {/* Progress bar - tylko gdy widoczne revenue */}
            {showRevenue && (
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    index === 0 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                    index === 1 ? 'bg-gradient-to-r from-blue-600 to-blue-400' :
                    'bg-gradient-to-r from-slate-600 to-slate-500'
                  }`}
                  style={{ width: `${(customer.revenue / maxRevenue) * 100}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
