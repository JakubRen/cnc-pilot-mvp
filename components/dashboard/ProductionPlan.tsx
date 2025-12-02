import Link from 'next/link';
import { getOrderPriorityColor, getStatusBadgeColor } from '@/lib/dashboard-utils';

interface PlanOrder {
  id: string;
  order_number: string;
  customer_name: string;
  deadline: string;
  status: string;
  quantity: number;
  assigned_operator?: {
    name: string;
  };
  total_cost?: string | number;
}

interface ProductionPlanProps {
  productionPlan: PlanOrder[];
}

export default function ProductionPlan({ productionPlan }: ProductionPlanProps) {
  if (productionPlan.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">📋 Plan Produkcji</h2>
        <div className="text-center py-8">
          <p className="text-6xl mb-4">✅</p>
          <p className="text-lg font-medium text-green-400">Brak aktywnych zleceń</p>
          <p className="text-sm text-slate-400 mt-2">
            Wszystkie zlecenia zostały zakończone
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          📋 Plan Produkcji ({productionPlan.length})
        </h2>
        <Link
          href="/orders"
          className="text-sm text-blue-400 hover:underline"
        >
          Zobacz wszystkie →
        </Link>
      </div>

      {/* Production Plan List */}
      <div className="space-y-3">
        {productionPlan.map((order) => {
          const priority = getOrderPriorityColor(order.deadline, order.status);
          const statusBadge = getStatusBadgeColor(order.status);

          return (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-slate-700/50 rounded-md p-4 hover:bg-slate-700 transition border-l-4"
              style={{
                borderLeftColor:
                  priority.color === 'red'
                    ? '#ef4444'
                    : priority.color === 'yellow'
                    ? '#eab308'
                    : '#22c55e',
              }}
            >
              {/* Order Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{priority.icon}</span>
                    <h3 className="font-semibold text-white">
                      #{order.order_number}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${statusBadge.bgColor} ${statusBadge.textColor}`}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{order.customer_name}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-medium ${
                      priority.color === 'red'
                        ? 'text-red-400'
                        : priority.color === 'yellow'
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}
                  >
                    {priority.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(order.deadline).toLocaleDateString('pl-PL')}
                  </p>
                </div>
              </div>

              {/* Order Meta */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>Ilość: {order.quantity} szt</span>
                {order.assigned_operator?.name && (
                  <span>Operator: {order.assigned_operator.name}</span>
                )}
                {order.total_cost && (
                  <span>
                    Wartość: {parseFloat(String(order.total_cost)).toFixed(2)} PLN
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      {productionPlan.length >= 20 && (
        <div className="mt-4 text-center">
          <Link
            href="/orders"
            className="text-sm text-blue-400 hover:underline"
          >
            Zobacz wszystkie zlecenia →
          </Link>
        </div>
      )}
    </div>
  );
}
