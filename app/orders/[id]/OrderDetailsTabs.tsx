'use client'

import Link from 'next/link'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import OrderTimeTracking from './OrderTimeTracking'
import OrderProductionPlans from './OrderProductionPlans'
import OrderQCSummary from './OrderQCSummary'
import OrderCostAnalysis from '@/components/orders/OrderCostAnalysis'
import OrderTimeline from '@/components/orders/OrderTimeline'

// Type definitions
interface OrderItem {
  id: string
  part_name: string
  material: string | null
  quantity: number
  length: number | null
  width: number | null
  height: number | null
  tolerance_length: number | null
  tolerance_width: number | null
  tolerance_height: number | null
  complexity: string | null
  notes: string | null
}

interface TimeLog {
  id: string
  start_time: string
  end_time: string | null
  duration_seconds: number
  status: string
  total_cost: number
  hourly_rate: number
  users: {
    full_name: string
  }
}

interface ProductionPlan {
  id: string
  plan_number: string
  part_name: string
  quantity: number
  material: string | null
  status: string
  total_setup_time_minutes: number | null
  total_run_time_minutes: number | null
  estimated_cost: number | null
  operations: { id: string; status: string }[]
}

interface QCMeasurement {
  id: string
  is_pass: boolean
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  part_name: string | null
  material: string | null
  quantity: number
  deadline: string
  created_at: string
  updated_at: string
  notes: string | null
  status: string
  estimated_material_cost: number | null
  estimated_labor_cost: number | null
  estimated_overhead_cost: number | null
  estimated_hours: number | null
  material_cost: number
  labor_cost: number
  overhead_cost: number
  total_cost: number
  selling_price: number
  margin_percent: number
  creator: { full_name: string; email: string } | null
  assigned_operator: { full_name: string; email: string } | null
}

interface OrderDetailsTabsProps {
  order: Order
  orderItems: OrderItem[]
  timeLogs: TimeLog[]
  productionPlans: ProductionPlan[]
  qcMeasurements: QCMeasurement[]
  currentUserId: number
  companyId: string
  hourlyRate: number
  isOverdue: boolean
}

// Format dates in Polish locale (defined in client component)
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function OrderDetailsTabs({
  order,
  orderItems,
  timeLogs,
  productionPlans,
  qcMeasurements,
  currentUserId,
  companyId,
  hourlyRate,
  isOverdue,
}: OrderDetailsTabsProps) {
  return (
    <Tabs defaultValue="podstawowe" className="w-full">
      <TabsList className="mb-6 bg-muted/50 p-1 gap-1">
        <TabsTrigger value="podstawowe" className="px-4 py-2">
          📋 Podstawowe
        </TabsTrigger>
        <TabsTrigger value="opis" className="px-4 py-2">
          📝 Opis
        </TabsTrigger>
        <TabsTrigger value="produkcja" className="px-4 py-2">
          ⚙️ Produkcja
        </TabsTrigger>
        <TabsTrigger value="finanse" className="px-4 py-2">
          💰 Finanse
        </TabsTrigger>
        <TabsTrigger value="jakosc" className="px-4 py-2">
          ✅ Jakość
        </TabsTrigger>
        <TabsTrigger value="historia" className="px-4 py-2">
          🕐 Historia
        </TabsTrigger>
      </TabsList>

      {/* TAB: Podstawowe */}
      <TabsContent value="podstawowe" className="animate-fade-in">
        <div className="grid grid-cols-2 gap-6">
          {/* Dane (Klient + Oś czasu) */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Dane</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Klient</p>
                <p className="font-semibold text-lg text-foreground">{order.customer_name}</p>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">Termin</p>
                <p className={`font-semibold text-lg ${isOverdue ? 'text-red-400' : 'text-foreground'}`}>
                  {formatDate(order.deadline)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data utworzenia</p>
                <p className="text-foreground">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ostatnia aktualizacja</p>
                <p className="text-foreground">{formatDate(order.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Operator */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Przypisany operator</h2>
            <div className="space-y-3">
              {order.assigned_operator ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Imię i nazwisko</p>
                    <p className="font-semibold text-foreground">{order.assigned_operator.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-foreground">{order.assigned_operator.email}</p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Brak przypisanego operatora</p>
              )}
            </div>
          </div>

          {/* Pozycje zamówienia (full width) */}
          <div className="col-span-2 bg-card p-6 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Pozycje zamówienia {orderItems && orderItems.length > 0 ? `(${orderItems.length})` : ''}
            </h2>
            {orderItems && orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nazwa</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Materiał</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ilość</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Wymiary (mm)</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Tolerancje</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Złożoność</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Notatki</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map((item, idx) => (
                      <tr key={item.id} className="border-b border-slate-100/50 dark:border-slate-800/50">
                        <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                        <td className="py-2 px-3 text-foreground font-medium">{item.part_name}</td>
                        <td className="py-2 px-3 text-foreground">{item.material || '-'}</td>
                        <td className="py-2 px-3 text-right text-foreground font-semibold">{item.quantity} szt</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {item.length || item.width || item.height
                            ? `${item.length || '-'} x ${item.width || '-'} x ${item.height || '-'}`
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-violet-500 text-xs">
                          {item.tolerance_length || item.tolerance_width || item.tolerance_height
                            ? `±${item.tolerance_length ?? 0.1} / ±${item.tolerance_width ?? 0.1} / ±${item.tolerance_height ?? 0.1}`
                            : '±0.1'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">
                          {item.complexity === 'simple'
                            ? 'Prosty'
                            : item.complexity === 'medium'
                            ? 'Średni'
                            : item.complexity === 'complex'
                            ? 'Złożony'
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">{item.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Fallback: wyświetl dane z głównego zamówienia (stare zamówienia bez order_items) */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nazwa</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Materiał</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">Ilość</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100/50 dark:border-slate-800/50">
                      <td className="py-2 px-3 text-muted-foreground">1</td>
                      <td className="py-2 px-3 text-foreground font-medium">{order.part_name || 'Brak nazwy'}</td>
                      <td className="py-2 px-3 text-foreground">{order.material || '-'}</td>
                      <td className="py-2 px-3 text-right text-foreground font-semibold">{order.quantity} szt</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* TAB: Opis */}
      <TabsContent value="opis" className="animate-fade-in">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Opis zamówienia</h2>
          {order.notes ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{order.notes}</p>
            </div>
          ) : (
            <p className="text-muted-foreground">Brak notatek dla tego zamówienia.</p>
          )}
          <div className="mt-6 pt-4 border-t border-border">
            <Link
              href={`/orders/${order.id}/edit`}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition"
            >
              Edytuj opis
            </Link>
          </div>
        </div>
      </TabsContent>

      {/* TAB: Produkcja */}
      <TabsContent value="produkcja" className="animate-fade-in">
        <div className="grid grid-cols-1 gap-6">
          {/* Production Plans */}
          <OrderProductionPlans orderId={order.id} productionPlans={productionPlans} />

          {/* Time Tracking */}
          <OrderTimeTracking
            orderId={order.id}
            orderNumber={order.order_number}
            estimatedHours={order.estimated_hours}
            timeLogs={timeLogs}
            currentUserId={currentUserId}
            companyId={companyId}
            hourlyRate={hourlyRate}
          />
        </div>
      </TabsContent>

      {/* TAB: Finanse */}
      <TabsContent value="finanse" className="animate-fade-in">
        <OrderCostAnalysis
          orderId={order.id}
          quantity={order.quantity || 1}
          estimatedMaterialCost={order.estimated_material_cost || order.material_cost || 0}
          estimatedLaborCost={order.estimated_labor_cost || order.labor_cost || 0}
          estimatedOverheadCost={order.estimated_overhead_cost || order.overhead_cost || 0}
          estimatedHours={order.estimated_hours || null}
          materialCost={order.material_cost || 0}
          laborCost={order.labor_cost || 0}
          overheadCost={order.overhead_cost || 0}
          totalCost={order.total_cost || 0}
          sellingPrice={order.selling_price || 0}
          marginPercent={order.margin_percent || 0}
          timeLogs={timeLogs}
        />
      </TabsContent>

      {/* TAB: Jakość */}
      <TabsContent value="jakosc" className="animate-fade-in">
        <div className="grid grid-cols-1 gap-6">
          {/* QC Summary */}
          <OrderQCSummary
            orderId={order.id}
            orderStatus={order.status}
            qcMeasurements={qcMeasurements}
            orderItems={orderItems}
            companyId={companyId}
            userId={currentUserId}
          />

          {/* Carbon Footprint - tylko dla completed/ready_to_ship */}
          {(order.status === 'completed' || order.status === 'ready_to_ship') && (
            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <span>🌿</span> Ślad Węglowy
                </h2>
                <Link
                  href={`/reports/carbon?order_id=${order.id}`}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  Oblicz emisje CO2
                </Link>
              </div>
              <p className="text-muted-foreground text-sm">
                Oblicz ślad węglowy dla tego zamówienia w module raportów CO₂.
              </p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* TAB: Historia */}
      <TabsContent value="historia" className="animate-fade-in">
        <OrderTimeline orderId={order.id} companyId={companyId} />
      </TabsContent>
    </Tabs>
  )
}
