'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { tCarbon } from '@/lib/translation-helpers'
import Link from 'next/link'
import CarbonCalculator from './CarbonCalculator'

interface Material {
  id: string
  material_name: string
  material_category: string
  emission_factor: number
  unit: string
  is_active: boolean
  company_id: string | null
}

interface Energy {
  id: string
  energy_type: string
  emission_factor: number
  unit: string
  is_active: boolean
  company_id: string | null
}

interface CarbonReport {
  id: string
  report_number: string
  product_name: string
  total_co2_kg: number | null
  orders?: {
    order_number: string
    customer_name: string
  }
}

interface CarbonReportClientProps {
  materials: Material[]
  energies: Energy[]
  reports: CarbonReport[]
  totalReports: number
  totalCO2: number
  companyId: string
  userId: number
}

export default function CarbonReportClient({
  materials,
  energies,
  reports,
  totalReports,
  totalCO2,
  companyId,
  userId
}: CarbonReportClientProps) {
  const { t, lang } = useTranslation()

  const materialCategories = [
    { cat: 'steel', label: tCarbon('steel', lang), range: '1.5-6.2 kg CO₂/kg' },
    { cat: 'aluminum', label: tCarbon('aluminum', lang), range: '8-12 kg CO₂/kg' },
    { cat: 'copper', label: tCarbon('copperBrass', lang), range: '3.5-4 kg CO₂/kg' },
    { cat: 'titanium', label: tCarbon('titanium', lang), range: '35+ kg CO₂/kg' },
    { cat: 'plastic', label: tCarbon('plastics', lang), range: '3-26 kg CO₂/kg' },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/reports" className="text-muted-foreground hover:text-foreground text-sm">
                ← Raporty
              </Link>
            </div>
            <h1 className="text-4xl font-bold text-foreground">{t('carbon', 'title')}</h1>
            <p className="text-muted-foreground mt-1">{t('carbon', 'subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded-full border border-green-700/50">
              🌱 {t('carbon', 'cbamReady')}
            </span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-green-900/30 to-violet-900/30 border border-green-700/50 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🌍</div>
            <div>
              <h3 className="text-foreground font-semibold text-lg mb-1">
                {t('carbon', 'cbamTitle')}
              </h3>
              <p className="text-foreground text-sm">
                {t('carbon', 'cbamDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">{t('carbon', 'reports')}</p>
            <p className="text-3xl font-bold text-foreground">{totalReports}</p>
          </div>
          <div className="bg-card border border-green-700/50 rounded-lg p-4">
            <p className="text-muted-foreground text-sm">{t('carbon', 'totalEmissions')}</p>
            <p className="text-3xl font-bold text-green-400">{totalCO2.toFixed(1)} kg</p>
            <p className="text-slate-500 text-xs">CO₂</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">{t('carbon', 'materialsInDatabase')}</p>
            <p className="text-3xl font-bold text-foreground">{materials.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-muted-foreground text-sm">{t('carbon', 'energySources')}</p>
            <p className="text-3xl font-bold text-foreground">{energies.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calculator */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground mb-4">{t('carbon', 'calculator')}</h2>
            <CarbonCalculator
              materials={materials}
              energies={energies}
              companyId={companyId}
              userId={userId}
            />
          </div>

          {/* Recent Reports */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('carbon', 'recentReports')}</h3>
              {reports.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  {t('carbon', 'noReports')}
                </p>
              ) : (
                <div className="space-y-2">
                  {reports.slice(0, 5).map((report) => (
                    <Link
                      key={report.id}
                      href={`/reports/carbon/${report.id}`}
                      className="block p-3 bg-muted rounded-lg hover:bg-muted transition"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-foreground text-sm font-medium">{report.product_name}</p>
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
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('carbon', 'formula')}</h3>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm text-green-400 mb-3">
                CO₂ = (Waga × EF<sub>mat</sub>) + (kWh × EF<sub>en</sub>)
              </div>
              <div className="text-muted-foreground text-xs space-y-1">
                <p><span className="text-foreground">EF<sub>mat</sub></span> = {t('carbon', 'materialEmissionFactor')}</p>
                <p><span className="text-foreground">EF<sub>en</sub></span> = {t('carbon', 'energyEmissionFactor')}</p>
              </div>
            </div>

            {/* Material Categories */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('carbon', 'materialCoefficients')}</h3>
              <div className="space-y-2 text-sm">
                {materialCategories.map(({ cat, label, range }) => (
                  <div key={cat} className="flex justify-between items-center">
                    <span className="text-foreground">{label}</span>
                    <span className="text-slate-500 font-mono text-xs">{range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
