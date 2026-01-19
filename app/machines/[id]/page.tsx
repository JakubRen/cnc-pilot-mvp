import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import AddMaintenanceForm from './AddMaintenanceForm'
import MachineStatusUpdate from './MachineStatusUpdate'

export default async function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch machine
  const { data: machine, error } = await supabase
    .from('machines')
    .select(`
      *,
      created_by_user:users!machines_created_by_fkey (full_name)
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !machine) {
    notFound()
  }

  // Fetch maintenance history
  const { data: maintenanceLogs } = await supabase
    .from('maintenance_logs')
    .select(`
      *,
      performed_by_user:users!maintenance_logs_performed_by_fkey (full_name)
    `)
    .eq('machine_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch machine costs for ABC pricing
  const { data: machineCosts } = await supabase
    .from('machine_costs')
    .select('id, replacement_value, oee_percentage')
    .eq('machine_id', id)
    .eq('company_id', user.company_id)
    .single()

  const hasCostsConfigured = machineCosts && machineCosts.replacement_value !== null

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      active: { bg: 'bg-green-600', label: 'Aktywna' },
      inactive: { bg: 'bg-gray-600', label: 'Nieaktywna' },
      maintenance: { bg: 'bg-yellow-600', label: 'W konserwacji' },
      broken: { bg: 'bg-red-600', label: 'Awaria' }
    }
    const c = config[status] || { bg: 'bg-gray-600', label: status }
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${c.bg}`}>{c.label}</span>
  }

  const getMaintenanceTypeBadge = (type: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      scheduled: { bg: 'bg-blue-600', label: 'Planowy' },
      unscheduled: { bg: 'bg-orange-600', label: 'Nieplanowy' },
      repair: { bg: 'bg-red-600', label: 'Naprawa' },
      inspection: { bg: 'bg-purple-600', label: 'Inspekcja' }
    }
    const c = config[type] || { bg: 'bg-gray-600', label: type }
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${c.bg}`}>{c.label}</span>
  }

  const getLogStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      planned: { bg: 'bg-yellow-600', label: 'Zaplanowany' },
      in_progress: { bg: 'bg-blue-600', label: 'W trakcie' },
      completed: { bg: 'bg-green-600', label: 'Ukończony' },
      cancelled: { bg: 'bg-gray-600', label: 'Anulowany' }
    }
    const c = config[status] || { bg: 'bg-gray-600', label: status }
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${c.bg}`}>{c.label}</span>
  }

  // Check maintenance status
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isMaintenanceOverdue = machine.next_maintenance_date &&
    new Date(machine.next_maintenance_date) < today &&
    machine.status === 'active'

  const daysUntilMaintenance = machine.next_maintenance_date
    ? Math.ceil((new Date(machine.next_maintenance_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-2">
            <Link href="/machines" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              ← Wróć
            </Link>
          </div>
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{machine.name}</h1>
                {getStatusBadge(machine.status)}
              </div>
              <div className="text-slate-700 dark:text-slate-400">
                {machine.code && <span className="mr-3">Kod: {machine.code}</span>}
                {machine.manufacturer && <span className="mr-3">{machine.manufacturer}</span>}
                {machine.model && <span>{machine.model}</span>}
              </div>
            </div>
            <Link
              href={`/machines/${id}/edit`}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
              Edytuj
            </Link>
          </div>

          {/* Maintenance Alert */}
          {isMaintenanceOverdue && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6">
              <p className="text-red-400 font-semibold flex items-center gap-2">
                <span>⚠️</span> Przegląd zaległy o {Math.abs(daysUntilMaintenance || 0)} dni!
              </p>
            </div>
          )}

          {/* ABC Costs Warning */}
          {!hasCostsConfigured && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">⚠️</span>
                <div>
                  <p className="text-red-700 dark:text-red-400 font-semibold">
                    Brak skonfigurowanych kosztów operacyjnych
                  </p>
                  <p className="text-red-600 dark:text-red-400/80 text-sm mt-1">
                    Wycena części produkowanych na tej maszynie będzie nieprecyzyjna.
                    Skonfiguruj koszty (wartość odtworzeniowa, OEE, stawki operatora) aby uzyskać dokładne kalkulacje ABC.
                  </p>
                  <Link
                    href="/settings/machines"
                    className="inline-block mt-2 text-sm text-red-700 dark:text-red-400 underline hover:no-underline"
                  >
                    → Skonfiguruj koszty maszyny
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Update */}
              <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Zmień status</h2>
                <MachineStatusUpdate
                  machineId={machine.id}
                  currentStatus={machine.status}
                />
              </div>

              {/* Add Maintenance */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Dodaj wpis konserwacji</h2>
                <AddMaintenanceForm
                  machineId={machine.id}
                  companyId={user.company_id}
                  userId={user.id}
                />
              </div>

              {/* Maintenance History */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Historia konserwacji ({maintenanceLogs?.length || 0})
                </h2>
                {!maintenanceLogs || maintenanceLogs.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-500 text-center py-8">Brak wpisów konserwacji</p>
                ) : (
                  <div className="space-y-3">
                    {maintenanceLogs.map((log) => (
                      <div key={log.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-slate-900 dark:text-white font-medium">{log.title}</span>
                              {getMaintenanceTypeBadge(log.type)}
                              {getLogStatusBadge(log.status)}
                            </div>
                            {log.description && (
                              <p className="text-slate-700 dark:text-slate-400 text-sm">{log.description}</p>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            {log.total_cost && (
                              <p className="text-green-600 dark:text-green-400 font-semibold">{log.total_cost.toFixed(2)} PLN</p>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-500">
                          <div>
                            {log.performed_by_user?.full_name && (
                              <span>Wykonał: {log.performed_by_user.full_name}</span>
                            )}
                            {log.external_technician && (
                              <span>Serwis: {log.external_technician}</span>
                            )}
                          </div>
                          <div>
                            {log.completed_at ? (
                              <span>Ukończono: {new Date(log.completed_at).toLocaleDateString('pl-PL')}</span>
                            ) : log.scheduled_date ? (
                              <span>Zaplanowano: {new Date(log.scheduled_date).toLocaleDateString('pl-PL')}</span>
                            ) : (
                              <span>Utworzono: {new Date(log.created_at).toLocaleDateString('pl-PL')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Info */}
            <div className="space-y-6">
              {/* Maintenance Schedule */}
              <div className={`bg-white dark:bg-slate-800 border rounded-lg p-6 ${isMaintenanceOverdue ? 'border-red-200 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'}`}>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Harmonogram przeglądów</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-500 dark:text-slate-500 text-xs">Interwał</p>
                    <p className="text-slate-900 dark:text-white font-semibold">{machine.maintenance_interval_days} dni</p>
                  </div>
                  {machine.last_maintenance_date && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-500 text-xs">Ostatni przegląd</p>
                      <p className="text-slate-900 dark:text-white">
                        {new Date(machine.last_maintenance_date).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  )}
                  {machine.next_maintenance_date && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-500 text-xs">Następny przegląd</p>
                      <p className={`font-semibold ${isMaintenanceOverdue ? 'text-red-600 dark:text-red-400' : daysUntilMaintenance && daysUntilMaintenance <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                        {new Date(machine.next_maintenance_date).toLocaleDateString('pl-PL')}
                        {daysUntilMaintenance !== null && (
                          <span className="block text-sm">
                            ({daysUntilMaintenance < 0 ? `${Math.abs(daysUntilMaintenance)} dni temu` : `za ${daysUntilMaintenance} dni`})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Machine Details */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Szczegóły</h3>
                <div className="space-y-3">
                  {machine.serial_number && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-500 text-xs">Numer seryjny</p>
                      <p className="text-slate-900 dark:text-white font-mono">{machine.serial_number}</p>
                    </div>
                  )}
                  {machine.location && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-500 text-xs">Lokalizacja</p>
                      <p className="text-slate-900 dark:text-white">{machine.location}</p>
                    </div>
                  )}
                  {machine.purchase_date && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-500 text-xs">Data zakupu</p>
                      <p className="text-slate-900 dark:text-white">
                        {new Date(machine.purchase_date).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                  )}
                  {machine.warranty_until && (
                    <div>
                      <p className="text-slate-500 dark:text-slate-500 text-xs">Gwarancja do</p>
                      <p className={`${new Date(machine.warranty_until) < today ? 'text-slate-500 dark:text-slate-500' : 'text-green-600 dark:text-green-400'}`}>
                        {new Date(machine.warranty_until).toLocaleDateString('pl-PL')}
                        {new Date(machine.warranty_until) < today && ' (wygasła)'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {machine.notes && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Notatki</h3>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm">{machine.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
