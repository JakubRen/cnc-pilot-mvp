import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { commonStyles, VIOLET, formatDatePL, formatPLN } from './styles'
import CompanyHeader from './company-header'
import type { QuotePdfData } from './types'

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
    marginBottom: 2,
  },
  quoteNumber: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginBottom: 16,
  },
  customerBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  customerName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 1,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    fontSize: 9,
    color: '#374151',
  },
  // Table
  thText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
  },
  tdText: {
    fontSize: 9,
    color: '#1a1a1a',
  },
  colLp: { width: '6%' },
  colName: { width: '30%' },
  colMaterial: { width: '18%' },
  colQty: { width: '10%', textAlign: 'right' },
  colUnit: { width: '18%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  // Summary
  totalBox: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: VIOLET,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: VIOLET,
    marginLeft: 12,
  },
  // Breakdown
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  breakdownItem: {
    width: '23%',
    backgroundColor: '#f9fafb',
    borderRadius: 3,
    padding: 8,
  },
  breakdownLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  footerLeft: {
    fontSize: 8,
    color: '#6b7280',
  },
  notesBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fefce8',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  notesText: {
    fontSize: 9,
    color: '#92400e',
  },
})

interface QuoteTemplateProps {
  data: QuotePdfData
}

export default function QuoteTemplate({ data }: QuoteTemplateProps) {
  // Build items list: use items[] if available, otherwise single-item from root
  const items = data.items.length > 0
    ? data.items
    : data.part_name
      ? [{
          part_name: data.part_name,
          material: data.material ?? null,
          quantity: data.quantity ?? 1,
          unit_price: data.price_per_unit ?? data.total_price,
          total_price: data.total_price,
          dimensions: null,
          complexity: null,
          notes: null,
        }]
      : []

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Company Header */}
        <CompanyHeader company={data.company} />

        {/* Title */}
        <Text style={styles.title}>WYCENA</Text>
        <Text style={styles.quoteNumber}>{data.quote_number}</Text>

        {/* Customer Box */}
        <View style={styles.customerBox}>
          <Text style={styles.customerName}>{data.customer_name}</Text>
          {data.customer_email && (
            <Text style={styles.customerDetail}>{data.customer_email}</Text>
          )}
          {data.customer_phone && (
            <Text style={styles.customerDetail}>{data.customer_phone}</Text>
          )}
        </View>

        {/* Dates */}
        <View style={styles.dateRow}>
          <Text>Data: {formatDatePL(data.created_at)}</Text>
          {data.expires_at && <Text>Wazna do: {formatDatePL(data.expires_at)}</Text>}
        </View>

        {/* Items Table */}
        {items.length > 0 && (
          <View>
            {/* Header row */}
            <View style={commonStyles.tableHeader}>
              <Text style={[styles.thText, styles.colLp]}>Lp</Text>
              <Text style={[styles.thText, styles.colName]}>Nazwa</Text>
              <Text style={[styles.thText, styles.colMaterial]}>Material</Text>
              <Text style={[styles.thText, styles.colQty]}>Ilosc</Text>
              <Text style={[styles.thText, styles.colUnit]}>Cena jedn.</Text>
              <Text style={[styles.thText, styles.colTotal]}>Wartosc</Text>
            </View>
            {/* Data rows */}
            {items.map((item, idx) => (
              <View style={commonStyles.tableRow} key={idx}>
                <Text style={[styles.tdText, styles.colLp]}>{idx + 1}</Text>
                <Text style={[styles.tdText, styles.colName]}>{item.part_name}</Text>
                <Text style={[styles.tdText, styles.colMaterial]}>{item.material || '-'}</Text>
                <Text style={[styles.tdText, styles.colQty]}>{item.quantity} szt.</Text>
                <Text style={[styles.tdText, styles.colUnit]}>{formatPLN(item.unit_price)}</Text>
                <Text style={[styles.tdText, styles.colTotal]}>{formatPLN(item.total_price)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>RAZEM:</Text>
          <Text style={styles.totalValue}>{formatPLN(data.total_price)}</Text>
        </View>

        {/* Cost Breakdown */}
        {data.breakdown && (
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Material</Text>
              <Text style={styles.breakdownValue}>{formatPLN(data.breakdown.materialCost)}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Robocizna</Text>
              <Text style={styles.breakdownValue}>{formatPLN(data.breakdown.laborCost)}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Przygotowanie</Text>
              <Text style={styles.breakdownValue}>{formatPLN(data.breakdown.setupCost)}</Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Marza</Text>
              <Text style={styles.breakdownValue}>{data.breakdown.marginPercentage}%</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>Uwagi: {data.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={commonStyles.footer} fixed>
          <View>
            <Text style={styles.footerLeft}>Warunki platnosci: 14 dni</Text>
            {data.company.bank_account && (
              <Text style={styles.footerLeft}>
                Konto: {data.company.bank_account}
              </Text>
            )}
          </View>
          <Text
            render={({ pageNumber, totalPages }) => `Strona ${pageNumber} z ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
