import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { commonStyles, VIOLET, formatDatePL, formatPLN } from './styles'
import CompanyHeader from './company-header'
import type { OrderSummaryPdfData } from './types'

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 16,
  },
  // Info grid
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoBlock: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 6,
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: VIOLET,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  // Details section
  detailsBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 9,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 9,
    color: '#111827',
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 9,
    color: '#374151',
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Cost table
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
  },
  costLabel: {
    fontSize: 10,
    color: '#374151',
  },
  costValue: {
    fontSize: 10,
    color: '#111827',
  },
  costTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: VIOLET,
    marginTop: 4,
  },
  costTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#111827',
  },
  costTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: VIOLET,
  },
  // Production plans
  planRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    fontSize: 9,
  },
  planCol1: { width: '25%', color: '#111827', fontWeight: 'bold' },
  planCol2: { width: '25%', color: '#374151' },
  planCol3: { width: '15%', color: '#374151', textAlign: 'center' },
  planCol4: { width: '15%', color: '#374151', textAlign: 'right' },
  planCol5: { width: '20%', color: '#374151', textAlign: 'right' },
  planHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  // Footer
  footerText: {
    fontSize: 8,
    color: '#6b7280',
  },
})

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Oczekujace',
    in_progress: 'W realizacji',
    completed: 'Ukonczone',
    delayed: 'Opoznione',
    cancelled: 'Anulowane',
    ready_to_ship: 'Do wysylki',
    draft: 'Szkic',
    active: 'Aktywny',
  }
  return map[status] || status
}

interface OrderSummaryTemplateProps {
  data: OrderSummaryPdfData
}

export default function OrderSummaryTemplate({ data }: OrderSummaryTemplateProps) {
  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Company Header */}
        <CompanyHeader company={data.company} />

        {/* Title */}
        <Text style={styles.title}>ZAMOWIENIE</Text>
        <Text style={styles.orderNumber}>{data.order_number}</Text>

        {/* Info grid: customer + dates */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Klient</Text>
            <Text style={styles.infoValue}>{data.customer_name}</Text>
            <Text style={styles.statusBadge}>{translateStatus(data.status)}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Data utworzenia</Text>
            <Text style={styles.infoValue}>{formatDatePL(data.created_at)}</Text>
            {data.deadline && (
              <>
                <Text style={styles.infoLabel}>Termin realizacji</Text>
                <Text style={styles.infoValue}>{formatDatePL(data.deadline)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.detailsBox}>
          <Text style={styles.sectionTitle}>Szczegoly zamowienia</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nazwa czesci</Text>
            <Text style={styles.detailValue}>{data.part_name}</Text>
          </View>
          {data.material && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Material</Text>
              <Text style={styles.detailValue}>{data.material}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ilosc</Text>
            <Text style={styles.detailValue}>{data.quantity} szt.</Text>
          </View>
          {data.notes && (
            <Text style={styles.notesText}>Uwagi: {data.notes}</Text>
          )}
        </View>

        {/* Cost Breakdown */}
        <View>
          <Text style={styles.sectionTitle}>Koszty</Text>
          {data.material_cost != null && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Material</Text>
              <Text style={styles.costValue}>{formatPLN(data.material_cost)}</Text>
            </View>
          )}
          {data.labor_cost != null && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Robocizna</Text>
              <Text style={styles.costValue}>{formatPLN(data.labor_cost)}</Text>
            </View>
          )}
          {data.overhead_cost != null && (
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>Koszty ogolne</Text>
              <Text style={styles.costValue}>{formatPLN(data.overhead_cost)}</Text>
            </View>
          )}
          <View style={styles.costTotalRow}>
            <Text style={styles.costTotalLabel}>RAZEM</Text>
            <Text style={styles.costTotalValue}>{formatPLN(data.total_cost)}</Text>
          </View>
        </View>

        {/* Production Plans Summary */}
        {data.production_plans.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={styles.sectionTitle}>
              Plany produkcji ({data.production_plans.length})
            </Text>
            {/* Header */}
            <View style={[commonStyles.tableHeader]}>
              <Text style={[styles.planHeaderText, styles.planCol1]}>Nr planu</Text>
              <Text style={[styles.planHeaderText, styles.planCol2]}>Czesc</Text>
              <Text style={[styles.planHeaderText, styles.planCol3]}>Status</Text>
              <Text style={[styles.planHeaderText, styles.planCol4]}>Operacje</Text>
              <Text style={[styles.planHeaderText, styles.planCol5]}>Czas szac.</Text>
            </View>
            {data.production_plans.map((plan) => (
              <View style={styles.planRow} key={plan.plan_number}>
                <Text style={styles.planCol1}>{plan.plan_number}</Text>
                <Text style={styles.planCol2}>{plan.part_name}</Text>
                <Text style={styles.planCol3}>{translateStatus(plan.status)}</Text>
                <Text style={styles.planCol4}>{plan.operations_count}</Text>
                <Text style={styles.planCol5}>
                  {formatMinutes(plan.total_setup_time_minutes + plan.total_run_time_minutes)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={commonStyles.footer} fixed>
          <View>
            {data.creator_name && (
              <Text style={styles.footerText}>Utworzyl: {data.creator_name}</Text>
            )}
            <Text style={styles.footerText}>
              Wydrukowano: {new Date().toLocaleString('pl-PL')}
            </Text>
          </View>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
