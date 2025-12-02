import Link from 'next/link';

interface OverdueOrder {
  id: string;
  order_number: string;
  customer_name: string;
  deadline: string;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
}

interface StaleTimer {
  id: string;
  start_time: string;
  order?: {
    order_number: string;
  };
  user?: {
    name: string;
  };
}

interface UrgentTasksProps {
  urgentTasks: {
    overdueOrders: OverdueOrder[];
    ordersDueToday: OverdueOrder[];
    lowStockItems: LowStockItem[];
    staleTimers: StaleTimer[];
  };
}

export default function UrgentTasks({ urgentTasks }: UrgentTasksProps) {
  const { overdueOrders, ordersDueToday, lowStockItems, staleTimers } = urgentTasks;

  // Count total urgent tasks
  const totalTasks =
    overdueOrders.length +
    ordersDueToday.length +
    lowStockItems.length +
    staleTimers.length;

  if (totalTasks === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">🔔 Pilne Zadania</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-6xl mb-4">✅</p>
          <p className="text-lg font-medium text-green-400">Wszystko w porządku!</p>
          <p className="text-sm text-slate-400 mt-2">Brak pilnych problemów</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-md border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          🔴 Pilne Zadania ({totalTasks})
        </h2>
      </div>

      <div className="space-y-4">
        {/* Overdue Orders */}
        {overdueOrders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2">⚠️ PO TERMINIE</h3>
            {overdueOrders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-red-900/20 border border-red-700/50 rounded-md p-3 mb-2 hover:bg-red-900/30 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">
                      Zlecenie #{order.order_number}
                    </p>
                    <p className="text-sm text-slate-400">{order.customer_name}</p>
                    <p className="text-xs text-red-400 mt-1">
                      Termin: {new Date(order.deadline).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                  <span className="text-xs bg-red-600 px-2 py-1 rounded text-white">
                    Po terminie
                  </span>
                </div>
              </Link>
            ))}
            {overdueOrders.length > 3 && (
              <Link
                href="/orders"
                className="text-sm text-blue-400 hover:underline block mt-2"
              >
                + {overdueOrders.length - 3} więcej
              </Link>
            )}
          </div>
        )}

        {/* Orders Due Today */}
        {ordersDueToday.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-yellow-400 mb-2">📅 DZISIAJ</h3>
            {ordersDueToday.slice(0, 2).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-yellow-900/20 border border-yellow-700/50 rounded-md p-3 mb-2 hover:bg-yellow-900/30 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">
                      Zlecenie #{order.order_number}
                    </p>
                    <p className="text-sm text-slate-400">{order.customer_name}</p>
                  </div>
                  <span className="text-xs bg-yellow-600 px-2 py-1 rounded text-white">
                    Dziś!
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-orange-400 mb-2">📦 NISKI STAN</h3>
            {lowStockItems.slice(0, 2).map((item) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="block bg-orange-900/20 border border-orange-700/50 rounded-md p-3 mb-2 hover:bg-orange-900/30 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-sm text-slate-400">
                      Tylko {item.quantity} {item.unit} (min: {item.low_stock_threshold})
                    </p>
                  </div>
                  <span className="text-xs bg-orange-600 px-2 py-1 rounded text-white">
                    Niski stan
                  </span>
                </div>
              </Link>
            ))}
            {lowStockItems.length > 2 && (
              <Link
                href="/inventory"
                className="text-sm text-blue-400 hover:underline block mt-2"
              >
                + {lowStockItems.length - 2} więcej
              </Link>
            )}
          </div>
        )}

        {/* Stale Timers */}
        {staleTimers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-purple-400 mb-2">⏱️ STARE TIMERY</h3>
            {staleTimers.slice(0, 2).map((timer) => {
              const hoursRunning = Math.floor(
                (new Date().getTime() - new Date(timer.start_time).getTime()) /
                  (1000 * 60 * 60)
              );
              return (
                <div
                  key={timer.id}
                  className="block bg-purple-900/20 border border-purple-700/50 rounded-md p-3 mb-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-white">
                        {timer.order?.order_number || 'Nieznane zlecenie'}
                      </p>
                      <p className="text-sm text-slate-400">
                        Operator: {timer.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-purple-400 mt-1">
                        Działa przez {hoursRunning}h
                      </p>
                    </div>
                    <span className="text-xs bg-purple-600 px-2 py-1 rounded text-white">
                      {hoursRunning}h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
