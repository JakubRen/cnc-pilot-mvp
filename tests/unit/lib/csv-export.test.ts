import { describe, it, expect } from 'vitest'
import { convertOrdersToCSV, OrderExportData } from '@/lib/csv-export'

// ============================================
// convertOrdersToCSV - main export function
// ============================================
describe('convertOrdersToCSV', () => {
  describe('basic functionality', () => {
    it('should return message for empty array', () => {
      const result = convertOrdersToCSV([])
      expect(result).toBe('Brak danych do eksportu')
    })

    it('should include Polish headers', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Test Klient',
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      const firstLine = result.split('\n')[0]

      expect(firstLine).toContain('Numer zamówienia')
      expect(firstLine).toContain('Klient')
      expect(firstLine).toContain('Nazwa części')
      expect(firstLine).toContain('Ilość')
      expect(firstLine).toContain('Materiał')
      expect(firstLine).toContain('Termin')
      expect(firstLine).toContain('Status')
      expect(firstLine).toContain('Koszt (PLN)')
      expect(firstLine).toContain('Data utworzenia')
      expect(firstLine).toContain('Notatki')
    })

    it('should convert single order to CSV', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Jan Kowalski',
          part_name: 'Tuleja',
          quantity: 100,
          material: 'Aluminium',
          deadline: '2024-01-20',
          status: 'pending',
          total_cost: 1500.50,
          created_at: '2024-01-15',
          notes: 'Priorytet',
        },
      ]

      const result = convertOrdersToCSV(orders)
      const lines = result.split('\n')

      expect(lines).toHaveLength(2) // header + 1 data row
      expect(lines[1]).toContain('ZAM-001')
      expect(lines[1]).toContain('Jan Kowalski')
      expect(lines[1]).toContain('Tuleja')
      expect(lines[1]).toContain('100')
      expect(lines[1]).toContain('Aluminium')
    })

    it('should convert multiple orders', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient A',
          deadline: '2024-01-20',
          status: 'pending',
        },
        {
          order_number: 'ZAM-002',
          customer_name: 'Klient B',
          deadline: '2024-01-21',
          status: 'in_progress',
        },
        {
          order_number: 'ZAM-003',
          customer_name: 'Klient C',
          deadline: '2024-01-22',
          status: 'completed',
        },
      ]

      const result = convertOrdersToCSV(orders)
      const lines = result.split('\n')

      expect(lines).toHaveLength(4) // header + 3 data rows
      expect(lines[1]).toContain('ZAM-001')
      expect(lines[2]).toContain('ZAM-002')
      expect(lines[3]).toContain('ZAM-003')
    })
  })

  describe('null/undefined handling', () => {
    it('should handle null part_name', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          part_name: null,
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('-') // null replaced with dash
    })

    it('should handle undefined quantity', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          quantity: undefined,
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).not.toContain('undefined')
    })

    it('should handle null material', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          material: null,
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).not.toContain('null')
    })

    it('should handle null total_cost', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          total_cost: null,
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('-')
    })

    it('should handle undefined created_at', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          created_at: undefined,
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).not.toContain('undefined')
    })
  })

  describe('CSV escaping', () => {
    it('should escape values with commas', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Firma A, Sp. z o.o.',
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      // Value with comma should be wrapped in quotes
      expect(result).toContain('"Firma A, Sp. z o.o."')
    })

    it('should escape values with double quotes', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Firma "Najlepsza"',
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      // Quotes should be escaped by doubling
      expect(result).toContain('""Najlepsza""')
    })

    it('should escape values with newlines', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          notes: 'Linia 1\nLinia 2',
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      // Value with newline should be wrapped in quotes
      expect(result).toContain('"Linia 1\nLinia 2"')
    })

    it('should handle values with comma, quote, and newline', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          notes: 'Uwaga: "ważne", pilne\nDodatkowe info',
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      // Complex value should be properly escaped
      expect(result).toContain('""ważne""')
    })
  })

  describe('status translation', () => {
    it('should translate pending status', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('Oczekujące')
    })

    it('should translate in_progress status', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'in_progress',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('W realizacji')
    })

    it('should translate completed status', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'completed',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('Ukończone')
    })

    it('should translate delayed status', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'delayed',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('Opóźnione')
    })

    it('should translate cancelled status', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'cancelled',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('Anulowane')
    })

    it('should keep unknown status as-is', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'custom_status',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('custom_status')
    })
  })

  describe('date formatting', () => {
    it('should format deadline in DD.MM.YYYY format', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('20.01.2024')
    })

    it('should format created_at in DD.MM.YYYY format', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          created_at: '2024-01-15',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('15.01.2024')
    })

    it('should handle ISO date strings with time', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-12-25T10:30:00Z',
          status: 'pending',
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('25.12.2024')
    })
  })

  describe('cost formatting', () => {
    it('should format cost with 2 decimal places', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'pending',
          total_cost: 1500.50,
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('1500.50')
    })

    it('should format whole number with decimals', () => {
      const orders: OrderExportData[] = [
        {
          order_number: 'ZAM-001',
          customer_name: 'Klient',
          deadline: '2024-01-20',
          status: 'pending',
          total_cost: 2000,
        },
      ]

      const result = convertOrdersToCSV(orders)
      expect(result).toContain('2000.00')
    })
  })
})
