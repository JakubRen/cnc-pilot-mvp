'use client'

import { useTranslation } from '@/hooks/useTranslation'
import Link from 'next/link'
import CarbonPassportPDF from './CarbonPassportPDF'

interface CarbonReportDetailClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any
  createdAt: string
  creatorName: string | undefined
}

export default function CarbonReportDetailClient({
  report,
  createdAt,
  creatorName
}: CarbonReportDetailClientProps) {
  const { t } = useTranslation()

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link
              href="/reports/carbon"
              className="text-muted-foreground hover:text-foreground text-sm mb-2 inline-flex items-center gap-1"
            >
              ← {t('carbon', 'backToCalculator')}
            </Link>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <span>🌱</span> {t('carbon', 'carbonPassport')}
            </h1>
            <p className="text-muted-foreground mt-1">{report.report_number}</p>
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
              <p className="text-green-400 font-semibold">{t('carbon', 'cbamCompliant')}</p>
              <p className="text-muted-foreground text-sm">
                {t('carbon', 'cbamRegulation')}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Product Info */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>📦</span> {t('carbon', 'productInfo')}
            </h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('carbon', 'productName2')}</dt>
                <dd className="text-foreground font-medium">{report.product_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('carbon', 'quantity2')}</dt>
                <dd className="text-foreground font-medium">
                  {report.product_quantity} {report.product_unit || t('common', 'pcs')}
                </dd>
              </div>
              {report.orders && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('carbon', 'orderNumber')}</dt>
                    <dd className="text-foreground font-medium">{report.orders.order_number}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('carbon', 'customer')}</dt>
                    <dd className="text-foreground font-medium">{report.orders.customer_name}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* Emission Summary */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
              <span>📊</span> {t('carbon', 'emissionSummary')}
            </h2>
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-1">{t('carbon', 'totalCO2Emission')}</p>
                <p className="text-5xl font-bold text-green-400">
                  {report.total_co2_kg?.toFixed(2)}
                </p>
                <p className="text-slate-500 text-sm">{t('carbon', 'kgCO2')}</p>
              </div>
              <div className="border-t border-green-700/30 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('carbon', 'emissionPerUnit2')}</span>
                  <span className="text-foreground font-semibold">
                    {report.co2_per_unit?.toFixed(3)} kg CO₂/{report.product_unit || t('common', 'pcs')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emission Details */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('carbon', 'calculationDetails')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Material Emissions */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                <span>🔩</span> {t('carbon', 'materialEmission2')}
              </h3>
              {report.material_name ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('carbon', 'material3')}</dt>
                    <dd className="text-foreground">{report.material_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('carbon', 'weight')}</dt>
                    <dd className="text-foreground">{report.material_weight_kg} kg</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('carbon', 'emissionFactor')}</dt>
                    <dd className="text-foreground">{report.material_emission_factor} kg CO₂/kg</dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <dt className="text-foreground font-medium">{t('carbon', 'emission')}</dt>
                    <dd className="text-green-400 font-semibold">
                      {report.material_co2_kg?.toFixed(3)} kg CO₂
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-slate-500 text-sm">{t('carbon', 'noMaterialData')}</p>
              )}
            </div>

            {/* Energy Emissions */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-foreground font-medium mb-3 flex items-center gap-2">
                <span>⚡</span> {t('carbon', 'energyEmission2')}
              </h3>
              {report.energy_kwh ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('carbon', 'energyConsumption')}</dt>
                    <dd className="text-foreground">{report.energy_kwh} kWh</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('carbon', 'emissionFactor')}</dt>
                    <dd className="text-foreground">{report.energy_emission_factor} kg CO₂/kWh</dd>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <dt className="text-foreground font-medium">{t('carbon', 'emission')}</dt>
                    <dd className="text-green-400 font-semibold">
                      {report.energy_co2_kg?.toFixed(3)} kg CO₂
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-slate-500 text-sm">{t('carbon', 'noEnergyData')}</p>
              )}
            </div>
          </div>

          {/* Formula */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-muted-foreground text-sm mb-2">{t('carbon', 'formulaUsed')}</p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm text-green-400">
              CO₂ = (Waga × EF<sub>mat</sub>) + (kWh × EF<sub>en</sub>)
            </div>
            <p className="text-slate-500 text-xs mt-2">
              {report.material_weight_kg || 0} kg × {report.material_emission_factor || 0} + {report.energy_kwh || 0} kWh × {report.energy_emission_factor || 0} = {report.total_co2_kg?.toFixed(3)} kg CO₂
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">{t('carbon', 'documentData')}</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('carbon', 'reportNumber')}</dt>
              <dd className="text-foreground font-medium">{report.report_number}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('carbon', 'createdAt')}</dt>
              <dd className="text-foreground font-medium">{createdAt}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('carbon', 'createdBy')}</dt>
              <dd className="text-foreground font-medium">{creatorName || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('carbon', 'calculationMethod')}</dt>
              <dd className="text-foreground font-medium capitalize">
                {report.calculation_method === 'simplified' ? t('carbon', 'simplified') : report.calculation_method}
              </dd>
            </div>
          </dl>
          {report.notes && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-muted-foreground text-sm">{t('carbon', 'notesLabel')}</p>
              <p className="text-foreground mt-1">{report.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
