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

  const totalTasks =
    overdueOrders.length +
    ordersDueToday.length +
    lowStockItems.length +
    staleTimers.length;

  // DUAL THEME CONTAINER
  const containerClass = "glass-panel rounded-xl p-6 shadow-sm border border-slate-200 dark:border-border h-full";
  const headerTextClass = "text-xl font-bold text-slate-900 dark:text-foreground";
  
  if (totalTasks === 0) {
    return (
      <div className={containerClass}>     
        <div className="flex items-center justify-between mb-4">
          <h2 className={headerTextClass}>🎉 Pilne Zadania</h2>
        </div>
        <div className="text-center py-8 h-full flex flex-col justify-center">
          <p className="text-6xl mb-4">✅</p>
          <p className="text-lg font-medium text-green-600 dark:text-green-400">Wszystko w porządku!</p>     
          <p className="text-sm text-slate-500 dark:text-muted-foreground mt-2">Brak pilnych problemów</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>       
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className={headerTextClass}>
          🔴 Pilne Zadania ({totalTasks})
        </h2>
      </div>

      <div className="space-y-4">
        {/* Overdue Orders */}
        {overdueOrders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wide text-xs">⚠️ Po terminie</h3>
            {overdueOrders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg p-3 mb-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-foreground group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
                      Zlecenie #{order.order_number}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">{order.customer_name}</p>       
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">
                      Termin: {new Date(order.deadline).toLocaleDateString('pl-PL')}      
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-2 py-1 rounded">      
                    Po terminie
                  </span>
                </div>
              </Link>
            ))}
            {overdueOrders.length > 3 && (
              <Link
                href="/orders"
                className="text-sm text-blue-600 dark:text-primary hover:underline block mt-2 ml-1"
              >
                + {overdueOrders.length - 3} więcej
              </Link>
            )}
          </div>
        )}

        {/* Orders Due Today */}
        {ordersDueToday.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wide text-xs">📅 Dzisiaj</h3>  
            {ordersDueToday.slice(0, 2).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-3 mb-2 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                      Zlecenie #{order.order_number}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">{order.customer_name}</p>       
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 px-2 py-1 rounded">   
                    Dziś
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-2 uppercase tracking-wide text-xs">📦 Niski stan</h3>
            {lowStockItems.slice(0, 2).map((item) => (
              <Link
                key={item.id}
                href={`/inventory/${item.id}`}
                className="block bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-3 mb-2 hover:bg-orange-100 dark:hover:bg-orange-900/20 transition group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-foreground group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">{item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                      Tylko {item.quantity} {item.unit} (min: {item.low_stock_threshold}) 
                    </p>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 px-2 py-1 rounded">   
                    Low Stock
                  </span>
                </div>
              </Link>
            ))}
            {lowStockItems.length > 2 && (
              <Link
                href="/inventory"
                className="text-sm text-blue-600 dark:text-primary hover:underline block mt-2 ml-1"
              >
                + {lowStockItems.length - 2} więcej
              </Link>
            )}
          </div>
        )}

        {/* Stale Timers */}
        {staleTimers.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 uppercase tracking-wide text-xs">⏱️ Stare Timery</h3>
            {staleTimers.slice(0, 2).map((timer) => {
              const hoursRunning = Math.floor(
                (new Date().getTime() - new Date(timer.start_time).getTime()) /
                  (1000 * 60 * 60)
              );
              return (
                <div
                  key={timer.id}
                  className="block bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-lg p-3 mb-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-foreground">
                        {timer.order?.order_number || 'Nieznane zlecenie'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        Operator: {timer.user?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-mono">
                        Działa przez {hoursRunning}h
                      </p>
                    </div>
                    <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-1 rounded"> 
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
