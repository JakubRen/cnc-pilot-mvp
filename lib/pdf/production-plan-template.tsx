import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { commonStyles, formatDatePL } from './styles'
import type { ProductionPlanPdfData } from './types'

const styles = StyleSheet.create({
  // Header — BIG, readable from distance
  planNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  partName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  // Info row
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  infoItem: {
    minWidth: 100,
  },
  infoLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  deadlineUrgent: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  // Technical notes box
  notesBox: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 3,
    padding: 8,
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 3,
  },
  notesText: {
    fontSize: 10,
    color: '#1f2937',
  },
  dimensionsText: {
    fontSize: 10,
    color: '#1f2937',
    marginBottom: 4,
  },
  // Operations table — large fonts
  thText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  tdText: {
    fontSize: 11,
    color: '#000000',
  },
  checkbox: {
    width: '5%',
    textAlign: 'center',
  },
  colNr: { width: '5%', textAlign: 'center' },
  colType: { width: '15%' },
  colName: { width: '25%' },
  colMachine: { width: '18%' },
  colSetup: { width: '12%', textAlign: 'right' },
  colRun: { width: '12%', textAlign: 'right' },
  colStatus: { width: '8%', textAlign: 'center' },
  // Table rows with taller height for readability
  opHeader: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  opRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 28,
    alignItems: 'center',
  },
  // Time summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
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

function isDeadlineSoon(deadline: string | null | undefined): boolean {
  if (!deadline) return false
  const d = new Date(deadline)
  const now = new Date()
  const daysLeft = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysLeft <= 3
}

interface ProductionPlanTemplateProps {
  data: ProductionPlanPdfData
}

export default function ProductionPlanTemplate({ data }: ProductionPlanTemplateProps) {
  const totalEstimated = data.total_setup_time_minutes + data.total_run_time_minutes

  const dims = data.dimensions
  const hasDimensions = dims && (dims.length || dims.width || dims.height)
  const dimensionStr = hasDimensions
    ? [dims.length, dims.width, dims.height].filter(Boolean).join(' x ') + ' mm'
    : null

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={commonStyles.pageLandscape}>
        {/* BIG Header: Plan number + Part name */}
        <Text style={styles.planNumber}>{data.plan_number}</Text>
        <Text style={styles.partName}>{data.part_name}</Text>

        {/* Info row */}
        <View style={styles.infoRow}>
          {data.order_number && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Zamowienie</Text>
              <Text style={styles.infoValue}>{data.order_number}</Text>
            </View>
          )}
          {data.customer_name && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Klient</Text>
              <Text style={styles.infoValue}>{data.customer_name}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Ilosc</Text>
            <Text style={styles.infoValue}>{data.quantity} szt.</Text>
          </View>
          {data.material && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Material</Text>
              <Text style={styles.infoValue}>{data.material}</Text>
            </View>
          )}
          {data.deadline && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Termin</Text>
              <Text style={isDeadlineSoon(data.deadline) ? styles.deadlineUrgent : styles.infoValue}>
                {formatDatePL(data.deadline)}
              </Text>
            </View>
          )}
        </View>

        {/* Dimensions + Technical notes */}
        {(dimensionStr || data.technical_notes) && (
          <View style={styles.notesBox}>
            {dimensionStr && (
              <Text style={styles.dimensionsText}>Wymiary: {dimensionStr}</Text>
            )}
            {data.technical_notes && (
              <View>
                <Text style={styles.notesTitle}>Uwagi techniczne:</Text>
                <Text style={styles.notesText}>{data.technical_notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Operations Table */}
        <View>
          <View style={styles.opHeader}>
            <Text style={[styles.thText, styles.checkbox]}>{'\u2610'}</Text>
            <Text style={[styles.thText, styles.colNr]}>Nr</Text>
            <Text style={[styles.thText, styles.colType]}>Typ operacji</Text>
            <Text style={[styles.thText, styles.colName]}>Nazwa</Text>
            <Text style={[styles.thText, styles.colMachine]}>Maszyna</Text>
            <Text style={[styles.thText, styles.colSetup]}>Setup (min)</Text>
            <Text style={[styles.thText, styles.colRun]}>Run (min/szt.)</Text>
            <Text style={[styles.thText, styles.colStatus]}>Status</Text>
          </View>
          {data.operations.map((op) => (
            <View style={styles.opRow} key={op.operation_number}>
              <Text style={[styles.tdText, styles.checkbox]}>{'\u2610'}</Text>
              <Text style={[styles.tdText, styles.colNr]}>{op.operation_number}</Text>
              <Text style={[styles.tdText, styles.colType]}>{op.operation_type}</Text>
              <Text style={[styles.tdText, styles.colName]}>{op.operation_name}</Text>
              <Text style={[styles.tdText, styles.colMachine]}>{op.machine_name || '-'}</Text>
              <Text style={[styles.tdText, styles.colSetup]}>{op.setup_time_minutes}</Text>
              <Text style={[styles.tdText, styles.colRun]}>{op.run_time_per_unit_minutes}</Text>
              <Text style={[styles.tdText, styles.colStatus]}>{op.status === 'completed' ? 'OK' : '-'}</Text>
            </View>
          ))}
        </View>

        {/* Time Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Setup lacznie</Text>
            <Text style={styles.summaryValue}>{formatMinutes(data.total_setup_time_minutes)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Run lacznie</Text>
            <Text style={styles.summaryValue}>{formatMinutes(data.total_run_time_minutes)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Szacowany czas</Text>
            <Text style={styles.summaryValue}>{formatMinutes(totalEstimated)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={commonStyles.footer} fixed>
          <Text style={styles.footerText}>
            Wydrukowano: {new Date().toLocaleString('pl-PL')}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
