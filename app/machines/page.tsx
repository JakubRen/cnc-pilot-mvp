import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function MachinesPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch machines
  const { data: machines } = await supabase
    .from('machines')
    .select('*')
    .eq('company_id', user.company_id)
    .order('name')

  // Fetch upcoming maintenance
  const { data: upcomingMaintenance } = await supabase
    .from('maintenance_logs')
    .select(`
      *,
      machines (name, code)
    `)
    .eq('company_id', user.company_id)
    .eq('status', 'planned')
    .order('scheduled_date', { ascending: true })
    .limit(10)

  // Stats
  const totalMachines = machines?.length || 0
  const activeMachines = machines?.filter(m => m.status === 'active').length || 0
  const inMaintenanceMachines = machines?.filter(m => m.status === 'maintenance').length || 0
  const brokenMachines = machines?.filter(m => m.status === 'broken').length || 0

  // Check for machines needing maintenance
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const machinesNeedingMaintenance = machines?.filter(m => {
    if (!m.next_maintenance_date || m.status !== 'active') return false
    const nextDate = new Date(m.next_maintenance_date)
    return nextDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) // within 7 days
  }) || []

  const overdueMachines = machinesNeedingMaintenance.filter(m => {
    const nextDate = new Date(m.next_maintenance_date)
    return nextDate < today
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      active: { bg: 'bg-green-600', label: 'Aktywna' },
      inactive: { bg: 'bg-gray-600', label: 'Nieaktywna' },
      maintenance: { bg: 'bg-yellow-600', label: 'W konserwacji' },
      broken: { bg: 'bg-red-600', label: 'Awaria' }
    }
    const c = config[status] || { bg: 'bg-gray-600', label: status }
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${c.bg}`}>{c.label}</span>
  }

  const getMaintenanceUrgency = (machine: { next_maintenance_date: string | null; status: string }) => {
    if (!machine.next_maintenance_date || machine.status !== 'active') return null
    const nextDate = new Date(machine.next_maintenance_date)
    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) {
      return <span className="text-red-400 text-xs font-semibold animate-pulse">⚠️ {Math.abs(daysUntil)} dni po terminie!</span>
    } else if (daysUntil <= 7) {
      return <span className="text-yellow-400 text-xs">🔧 Za {daysUntil} dni</span>
    }
    return <span className="text-slate-500 text-xs">Za {daysUntil} dni</span>
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">Maszyny</h1>
              <p className="text-slate-400 mt-1">Zarządzanie parkiem maszynowym i przeglądami</p>
            </div>
            <Link href="/machines/add">
              <Button variant="primary">+ Dodaj maszynę</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Wszystkie</p>
              <p className="text-3xl font-bold text-white">{totalMachines}</p>
            </div>
            <div className="bg-slate-800 border border-green-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Aktywne</p>
              <p className="text-3xl font-bold text-green-400">{activeMachines}</p>
            </div>
            <div className="bg-slate-800 border border-yellow-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">W konserwacji</p>
              <p className="text-3xl font-bold text-yellow-400">{inMaintenanceMachines}</p>
            </div>
            <div className={`bg-slate-800 border rounded-lg p-4 ${brokenMachines > 0 ? 'border-red-700/50' : 'border-slate-700'}`}>
              <p className="text-slate-400 text-sm">Awarie</p>
              <p className={`text-3xl font-bold ${brokenMachines > 0 ? 'text-red-400' : 'text-slate-500'}`}>{brokenMachines}</p>
            </div>
            <div className={`bg-slate-800 border rounded-lg p-4 ${overdueMachines.length > 0 ? 'border-red-700/50' : 'border-slate-700'}`}>
              <p className="text-slate-400 text-sm">Przegląd zaległy</p>
              <p className={`text-3xl font-bold ${overdueMachines.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {overdueMachines.length}
              </p>
            </div>
          </div>

          {/* Maintenance Alert */}
          {overdueMachines.length > 0 && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-8">
              <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                <span>⚠️</span> Maszyny wymagające przeglądu
              </h3>
              <div className="space-y-2">
                {overdueMachines.map(m => {
                  const daysOverdue = Math.ceil((today.getTime() - new Date(m.next_maintenance_date).getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <Link
                      key={m.id}
                      href={`/machines/${m.id}`}
                      className="flex justify-between items-center bg-red-900/20 p-3 rounded-lg hover:bg-red-900/30 transition"
                    >
                      <div>
                        <span className="text-white font-medium">{m.name}</span>
                        {m.code && <span className="text-slate-400 ml-2">({m.code})</span>}
                      </div>
                      <span className="text-red-400 font-semibold">{daysOverdue} dni po terminie</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Machines List */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-white mb-4">Park maszynowy</h2>
              {!machines || machines.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
                  <div className="text-6xl mb-4">🔧</div>
                  <h2 className="text-xl font-semibold text-white mb-2">Brak maszyn</h2>
                  <p className="text-slate-400 mb-6">Dodaj maszyny CNC i urządzenia produkcyjne</p>
                  <Link href="/machines/add">
                    <Button variant="primary">Dodaj pierwszą maszynę</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {machines.map((machine) => (
                    <Link
                      key={machine.id}
                      href={`/machines/${machine.id}`}
                      className="block bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-blue-500/50 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-white font-semibold text-lg">{machine.name}</span>
                            {getStatusBadge(machine.status)}
                          </div>
                          <div className="text-slate-400 text-sm">
                            {machine.code && <span className="mr-3">Kod: {machine.code}</span>}
                            {machine.manufacturer && <span className="mr-3">{machine.manufacturer}</span>}
                            {machine.model && <span>{machine.model}</span>}
                          </div>
                          {machine.location && (
                            <p className="text-slate-500 text-xs mt-1">📍 {machine.location}</p>
                          )}
                        </div>
                        <div className="text-right">
                          {machine.next_maintenance_date && (
                            <div>
                              <p className="text-slate-500 text-xs">Następny przegląd</p>
                              {getMaintenanceUrgency(machine)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Upcoming Maintenance */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Zaplanowane przeglądy</h3>
                {!upcomingMaintenance || upcomingMaintenance.length === 0 ? (
                  <p className="text-slate-500 text-sm">Brak zaplanowanych przeglądów</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingMaintenance.slice(0, 5).map((log) => (
                      <div key={log.id} className="p-3 bg-slate-900 rounded-lg">
                        <p className="text-white text-sm font-medium">{log.title}</p>
                        <p className="text-slate-400 text-xs">
                          {log.machines?.name}
                          {log.scheduled_date && (
                            <span className="ml-2">
                              • {new Date(log.scheduled_date).toLocaleDateString('pl-PL')}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Typy maszyn</h3>
                {machines && machines.length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(
                      machines.reduce((acc: Record<string, number>, m) => {
                        const type = m.manufacturer || 'Inne'
                        acc[type] = (acc[type] || 0) + 1
                        return acc
                      }, {})
                    ).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">{type}</span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">Brak danych</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
