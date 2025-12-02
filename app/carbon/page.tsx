import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import CarbonCalculator from './CarbonCalculator'

export default async function CarbonPage() {
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch material emissions (global + company)
  const { data: materials } = await supabase
    .from('material_emissions')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${user.company_id}`)
    .eq('is_active', true)
    .order('material_category')
    .order('material_name')

  // Fetch energy emissions
  const { data: energies } = await supabase
    .from('energy_emissions')
    .select('*')
    .or(`company_id.is.null,company_id.eq.${user.company_id}`)
    .eq('is_active', true)
    .order('energy_type')

  // Fetch recent carbon reports
  const { data: recentReports } = await supabase
    .from('carbon_reports')
    .select(`
      *,
      orders (order_number, customer_name)
    `)
    .eq('company_id', user.company_id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Stats
  const totalReports = recentReports?.length || 0
  const totalCO2 = recentReports?.reduce((sum, r) => sum + (r.total_co2_kg || 0), 0) || 0

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">Paszport Węglowy</h1>
              <p className="text-slate-400 mt-1">Kalkulator emisji CO2 zgodny z CBAM</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded-full border border-green-700/50">
                🌱 CBAM Ready
              </span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-700/50 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🌍</div>
              <div>
                <h3 className="text-white font-semibold text-lg mb-1">
                  Carbon Border Adjustment Mechanism (CBAM)
                </h3>
                <p className="text-slate-300 text-sm">
                  Od 1 stycznia 2026 wchodzi w życie pełna faza CBAM. Eksporterzy do UE muszą deklarować
                  ślad węglowy produktów. Ten kalkulator pomoże Ci obliczyć emisje CO2 dla Twoich wyrobów.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Raporty</p>
              <p className="text-3xl font-bold text-white">{totalReports}</p>
            </div>
            <div className="bg-slate-800 border border-green-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Suma emisji</p>
              <p className="text-3xl font-bold text-green-400">{totalCO2.toFixed(1)} kg</p>
              <p className="text-slate-500 text-xs">CO₂</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Materiały w bazie</p>
              <p className="text-3xl font-bold text-white">{materials?.length || 0}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Źródła energii</p>
              <p className="text-3xl font-bold text-white">{energies?.length || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calculator */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold text-white mb-4">Kalkulator emisji CO2</h2>
              <CarbonCalculator
                materials={materials || []}
                energies={energies || []}
                companyId={user.company_id}
                userId={user.id}
              />
            </div>

            {/* Recent Reports */}
            <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Ostatnie raporty</h3>
                {!recentReports || recentReports.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">
                    Brak raportów. Oblicz pierwszą emisję!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {recentReports.slice(0, 5).map((report) => (
                      <Link
                        key={report.id}
                        href={`/carbon/${report.id}`}
                        className="block p-3 bg-slate-900 rounded-lg hover:bg-slate-700 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-white text-sm font-medium">{report.product_name}</p>
                            <p className="text-slate-500 text-xs">
                              {report.report_number}
                              {report.orders && <span> • {report.orders.order_number}</span>}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-semibold text-sm">
                              {report.total_co2_kg?.toFixed(2)} kg
                            </p>
                            <p className="text-slate-500 text-xs">CO₂</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Formula Explanation */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Formuła obliczeniowa</h3>
                <div className="bg-slate-900 p-3 rounded-lg font-mono text-sm text-green-400 mb-3">
                  CO₂ = (Waga × EF<sub>mat</sub>) + (kWh × EF<sub>en</sub>)
                </div>
                <div className="text-slate-400 text-xs space-y-1">
                  <p><span className="text-slate-300">EF<sub>mat</sub></span> = współczynnik emisji materiału (kg CO₂/kg)</p>
                  <p><span className="text-slate-300">EF<sub>en</sub></span> = współczynnik emisji energii (kg CO₂/kWh)</p>
                </div>
              </div>

              {/* Material Categories */}
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Współczynniki materiałów</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { cat: 'steel', label: 'Stal', range: '1.5-6.2 kg CO₂/kg' },
                    { cat: 'aluminum', label: 'Aluminium', range: '8-12 kg CO₂/kg' },
                    { cat: 'copper', label: 'Miedź/Mosiądz', range: '3.5-4 kg CO₂/kg' },
                    { cat: 'titanium', label: 'Tytan', range: '35+ kg CO₂/kg' },
                    { cat: 'plastic', label: 'Tworzywa', range: '3-26 kg CO₂/kg' },
                  ].map(({ cat, label, range }) => (
                    <div key={cat} className="flex justify-between items-center">
                      <span className="text-slate-300">{label}</span>
                      <span className="text-slate-500 font-mono text-xs">{range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
