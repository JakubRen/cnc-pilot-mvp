'use client'

import { Button } from '@/components/ui/Button'

interface CarbonReport {
  id: string
  report_number: string
  product_name: string
  product_quantity: number
  product_unit?: string
  material_name?: string
  material_weight_kg?: number
  material_emission_factor?: number
  material_co2_kg?: number
  energy_kwh?: number
  energy_emission_factor?: number
  energy_co2_kg?: number
  total_co2_kg: number
  co2_per_unit?: number
  calculation_method?: string
  notes?: string
  created_at: string
  orders?: {
    order_number: string
    customer_name: string
    part_name?: string
  } | null
}

interface Props {
  report: CarbonReport
}

export default function CarbonPassportPDF({ report }: Props) {
  const handlePrint = () => {
    // Create print-friendly content
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Paszport Węglowy - ${report.report_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #1f2937;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #16a34a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo-section h1 {
            font-size: 28px;
            color: #16a34a;
            margin-bottom: 5px;
          }
          .logo-section p {
            color: #6b7280;
            font-size: 14px;
          }
          .doc-info {
            text-align: right;
          }
          .doc-info .report-number {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
          }
          .doc-info .date {
            color: #6b7280;
            font-size: 14px;
            margin-top: 5px;
          }
          .cbam-badge {
            background: #dcfce7;
            border: 1px solid #16a34a;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .cbam-badge .eu-flag {
            font-size: 32px;
          }
          .cbam-badge .text h3 {
            color: #16a34a;
            font-size: 16px;
            margin-bottom: 3px;
          }
          .cbam-badge .text p {
            color: #4b5563;
            font-size: 12px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .info-row .label {
            color: #6b7280;
            font-size: 14px;
          }
          .info-row .value {
            font-weight: 500;
            font-size: 14px;
          }
          .emission-box {
            background: #f0fdf4;
            border: 2px solid #16a34a;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin-bottom: 25px;
          }
          .emission-box .total-label {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 10px;
          }
          .emission-box .total-value {
            font-size: 48px;
            font-weight: bold;
            color: #16a34a;
          }
          .emission-box .unit {
            color: #6b7280;
            font-size: 16px;
          }
          .emission-box .per-unit {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #bbf7d0;
            color: #4b5563;
            font-size: 14px;
          }
          .calculation-box {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
          }
          .calculation-box .formula {
            font-family: monospace;
            font-size: 14px;
            color: #16a34a;
            margin-bottom: 10px;
          }
          .calculation-box .calculation {
            font-size: 12px;
            color: #6b7280;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <h1>🌱 Paszport Węglowy</h1>
            <p>Carbon Footprint Certificate</p>
          </div>
          <div class="doc-info">
            <div class="report-number">${report.report_number}</div>
            <div class="date">${new Date(report.created_at).toLocaleDateString('pl-PL')}</div>
          </div>
        </div>

        <div class="cbam-badge">
          <div class="eu-flag">🇪🇺</div>
          <div class="text">
            <h3>Dokument zgodny z CBAM</h3>
            <p>Carbon Border Adjustment Mechanism - Rozporządzenie UE 2023/956</p>
          </div>
        </div>

        <div class="emission-box">
          <div class="total-label">Całkowita emisja CO₂</div>
          <div class="total-value">${report.total_co2_kg?.toFixed(2)}</div>
          <div class="unit">kilogramów CO₂</div>
          <div class="per-unit">
            Emisja jednostkowa: <strong>${report.co2_per_unit?.toFixed(3)} kg CO₂/${report.product_unit || 'szt'}</strong>
          </div>
        </div>

        <div class="grid">
          <div class="section">
            <div class="section-title">📦 Informacje o produkcie</div>
            <div class="info-row">
              <span class="label">Nazwa produktu</span>
              <span class="value">${report.product_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Ilość</span>
              <span class="value">${report.product_quantity} ${report.product_unit || 'szt'}</span>
            </div>
            ${report.orders ? `
              <div class="info-row">
                <span class="label">Nr zamówienia</span>
                <span class="value">${report.orders.order_number}</span>
              </div>
              <div class="info-row">
                <span class="label">Klient</span>
                <span class="value">${report.orders.customer_name}</span>
              </div>
            ` : ''}
          </div>

          <div class="section">
            <div class="section-title">🔩 Emisja z materiału</div>
            ${report.material_name ? `
              <div class="info-row">
                <span class="label">Materiał</span>
                <span class="value">${report.material_name}</span>
              </div>
              <div class="info-row">
                <span class="label">Waga</span>
                <span class="value">${report.material_weight_kg} kg</span>
              </div>
              <div class="info-row">
                <span class="label">Współczynnik emisji</span>
                <span class="value">${report.material_emission_factor} kg CO₂/kg</span>
              </div>
              <div class="info-row">
                <span class="label">Emisja</span>
                <span class="value" style="color: #16a34a; font-weight: bold;">${report.material_co2_kg?.toFixed(3)} kg CO₂</span>
              </div>
            ` : '<p style="color: #9ca3af; font-size: 14px;">Brak danych</p>'}
          </div>

          <div class="section">
            <div class="section-title">⚡ Emisja z energii</div>
            ${report.energy_kwh ? `
              <div class="info-row">
                <span class="label">Zużycie energii</span>
                <span class="value">${report.energy_kwh} kWh</span>
              </div>
              <div class="info-row">
                <span class="label">Współczynnik emisji</span>
                <span class="value">${report.energy_emission_factor} kg CO₂/kWh</span>
              </div>
              <div class="info-row">
                <span class="label">Emisja</span>
                <span class="value" style="color: #16a34a; font-weight: bold;">${report.energy_co2_kg?.toFixed(3)} kg CO₂</span>
              </div>
            ` : '<p style="color: #9ca3af; font-size: 14px;">Brak danych</p>'}
          </div>

          <div class="section">
            <div class="section-title">📋 Dane dokumentu</div>
            <div class="info-row">
              <span class="label">Metoda obliczeń</span>
              <span class="value">${report.calculation_method === 'simplified' ? 'Uproszczona' : report.calculation_method}</span>
            </div>
            ${report.notes ? `
              <div class="info-row">
                <span class="label">Uwagi</span>
                <span class="value">${report.notes}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="calculation-box">
          <div class="formula">CO₂ = (Waga × EF<sub>mat</sub>) + (kWh × EF<sub>en</sub>)</div>
          <div class="calculation">
            ${report.material_weight_kg || 0} kg × ${report.material_emission_factor || 0} + ${report.energy_kwh || 0} kWh × ${report.energy_emission_factor || 0} = ${report.total_co2_kg?.toFixed(3)} kg CO₂
          </div>
        </div>

        <div class="footer">
          <p>Dokument wygenerowany automatycznie przez CNC-Pilot</p>
          <p>Data wydruku: ${new Date().toLocaleString('pl-PL')}</p>
        </div>
      </body>
      </html>
    `

    // Open new window and print
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return (
    <Button onClick={handlePrint} variant="primary">
      📄 Drukuj / PDF
    </Button>
  )
}
