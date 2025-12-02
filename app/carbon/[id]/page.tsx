import { createClient } from '@/lib/supabase-server'
import { getUserProfile } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import CarbonPassportPDF from './CarbonPassportPDF'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CarbonReportDetailPage({ params }: Props) {
  const { id } = await params
  const user = await getUserProfile()

  if (!user || !user.company_id) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch report with order details
  const { data: report, error } = await supabase
    .from('carbon_reports')
    .select(`
      *,
      orders (order_number, customer_name, part_name),
      creator:users!carbon_reports_created_by_fkey (full_name)
    `)
    .eq('id', id)
    .eq('company_id', user.company_id)
    .single()

  if (error || !report) {
    redirect('/carbon')
  }

  const createdAt = new Date(report.created_at).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const creatorName = Array.isArray(report.creator)
    ? report.creator[0]?.full_name
    : report.creator?.full_name

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <Link
                href="/carbon"
                className="text-slate-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1"
              >
                ← Powrót do kalkulatora
              </Link>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span>🌱</span> Paszport Węglowy
              </h1>
              <p className="text-slate-400 mt-1">{report.report_number}</p>
            </div>
            <div className="flex gap-2">
              <CarbonPassportPDF report={report} />
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇪🇺</span>
              <div>
                <p className="text-green-400 font-semibold">Dokument zgodny z CBAM</p>
                <p className="text-slate-400 text-sm">
                  Carbon Border Adjustment Mechanism - Rozporządzenie UE 2023/956
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Product Info */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📦</span> Informacje o produkcie
              </h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-slate-400">Nazwa produktu</dt>
                  <dd className="text-white font-medium">{report.product_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-400">Ilość</dt>
                  <dd className="text-white font-medium">
                    {report.product_quantity} {report.product_unit || 'szt'}
                  </dd>
                </div>
                {report.orders && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Nr zamówienia</dt>
                      <dd className="text-white font-medium">{report.orders.order_number}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Klient</dt>
                      <dd className="text-white font-medium">{report.orders.customer_name}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {/* Emission Summary */}
            <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                <span>📊</span> Podsumowanie emisji
              </h2>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-slate-400 text-sm mb-1">Całkowita emisja CO₂</p>
                  <p className="text-5xl font-bold text-green-400">
                    {report.total_co2_kg?.toFixed(2)}
                  </p>
                  <p className="text-slate-500 text-sm">kilogramów CO₂</p>
                </div>
                <div className="border-t border-green-700/30 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Emisja na jednostkę</span>
                    <span className="text-white font-semibold">
                      {report.co2_per_unit?.toFixed(3)} kg CO₂/{report.product_unit || 'szt'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Emission Details */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Szczegóły obliczenia</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Material Emissions */}
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>🔩</span> Emisja z materiału
                </h3>
                {report.material_name ? (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Materiał</dt>
                      <dd className="text-white">{report.material_name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Waga</dt>
                      <dd className="text-white">{report.material_weight_kg} kg</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Wsp. emisji</dt>
                      <dd className="text-white">{report.material_emission_factor} kg CO₂/kg</dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <dt className="text-slate-300 font-medium">Emisja</dt>
                      <dd className="text-green-400 font-semibold">
                        {report.material_co2_kg?.toFixed(3)} kg CO₂
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-slate-500 text-sm">Brak danych o materiale</p>
                )}
              </div>

              {/* Energy Emissions */}
              <div className="bg-slate-900 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span>⚡</span> Emisja z energii
                </h3>
                {report.energy_kwh ? (
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Zużycie energii</dt>
                      <dd className="text-white">{report.energy_kwh} kWh</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Wsp. emisji</dt>
                      <dd className="text-white">{report.energy_emission_factor} kg CO₂/kWh</dd>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <dt className="text-slate-300 font-medium">Emisja</dt>
                      <dd className="text-green-400 font-semibold">
                        {report.energy_co2_kg?.toFixed(3)} kg CO₂
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-slate-500 text-sm">Brak danych o energii</p>
                )}
              </div>
            </div>

            {/* Formula */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Zastosowana formuła:</p>
              <div className="bg-slate-900 p-3 rounded-lg font-mono text-sm text-green-400">
                CO₂ = (Waga × EF<sub>mat</sub>) + (kWh × EF<sub>en</sub>)
              </div>
              <p className="text-slate-500 text-xs mt-2">
                {report.material_weight_kg || 0} kg × {report.material_emission_factor || 0} + {report.energy_kwh || 0} kWh × {report.energy_emission_factor || 0} = {report.total_co2_kg?.toFixed(3)} kg CO₂
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Dane dokumentu</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-slate-400">Numer raportu</dt>
                <dd className="text-white font-medium">{report.report_number}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Data utworzenia</dt>
                <dd className="text-white font-medium">{createdAt}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Utworzony przez</dt>
                <dd className="text-white font-medium">{creatorName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Metoda obliczeń</dt>
                <dd className="text-white font-medium capitalize">
                  {report.calculation_method === 'simplified' ? 'Uproszczona' : report.calculation_method}
                </dd>
              </div>
            </dl>
            {report.notes && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm">Uwagi:</p>
                <p className="text-white mt-1">{report.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
