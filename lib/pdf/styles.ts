import { StyleSheet, Font } from '@react-pdf/renderer'

// =====================================================
// PDF Shared Styles — CNC-Pilot Express
// =====================================================

// Register Roboto for Polish diacritics (ą, ę, ś, ź, ć, ń, ó, ł)
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf',
      fontWeight: 'normal',
    },
    {
      src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf',
      fontWeight: 'bold',
    },
  ],
})

// Brand color — used sparingly (headers, accent lines)
export const VIOLET = '#7c3aed'

// Common styles reused across all PDF templates
export const commonStyles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 10,
    padding: 40,
    color: '#1a1a1a',
  },
  pageLandscape: {
    fontFamily: 'Roboto',
    fontSize: 10,
    padding: 30,
    color: '#1a1a1a',
  },
  headerLine: {
    height: 2,
    backgroundColor: VIOLET,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row' as const,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  footer: {
    position: 'absolute' as const,
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#6b7280',
    borderTopWidth: 0.5,
    borderTopColor: '#d1d5db',
    paddingTop: 8,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
})

// -----------------------------------------------------
// Utility: Format date to Polish dd.MM.yyyy
// -----------------------------------------------------
export function formatDatePL(date: string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

// -----------------------------------------------------
// Utility: Format currency to Polish "1 500,00 PLN"
// -----------------------------------------------------
export function formatPLN(amount: number | null | undefined): string {
  if (amount == null) return '0,00 PLN'
  const fixed = amount.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  // Add space as thousands separator
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted},${decPart} PLN`
}

// -----------------------------------------------------
// Utility: Sanitize file name (remove diacritics, special chars)
// -----------------------------------------------------
export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/\u0142/g, 'l')        // ł → l
    .replace(/\u0141/g, 'L')        // Ł → L
    .replace(/[^a-zA-Z0-9_\-. ]/g, '') // keep only safe chars
    .replace(/\s+/g, '_')           // spaces → underscores
    .trim()
}
