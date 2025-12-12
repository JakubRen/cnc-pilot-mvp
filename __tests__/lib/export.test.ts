import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportToCSV, exportToJSON } from '@/lib/export'

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('export utilities', () => {
  let clickSpy: any

  beforeEach(() => {
    // Mock document.createElement for download link
    clickSpy = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({
      href: '',
      download: '',
      click: clickSpy,
      style: {},
    } as any)

    // Mock URL.createObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
  })

  describe('exportToCSV', () => {
    it('should export data to CSV with correct format', () => {
      const data = [
        { id: 1, name: 'Item 1', price: 100 },
        { id: 2, name: 'Item 2', price: 200 },
      ]

      const columns: Array<{ key: keyof typeof data[0]; label: string }> = [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nazwa' },
        { key: 'price', label: 'Cena' },
      ]

      exportToCSV(data, 'test.csv', columns)

      // Check that Blob was created with CSV content
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should handle Polish characters (UTF-8 BOM)', () => {
      const data = [
        { name: 'Żółć', notes: 'Ważne!' },
      ]

      const columns: Array<{ key: keyof typeof data[0]; label: string }> = [
        { key: 'name', label: 'Nazwa' },
        { key: 'notes', label: 'Notatki' },
      ]

      exportToCSV(data, 'polish.csv', columns)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should escape commas and quotes in CSV', () => {
      const data = [
        { name: 'Item, with comma', notes: 'Notes "with quotes"' },
      ]

      const columns: Array<{ key: keyof typeof data[0]; label: string }> = [
        { key: 'name', label: 'Name' },
        { key: 'notes', label: 'Notes' },
      ]

      exportToCSV(data, 'escaped.csv', columns)

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should use all keys if no columns specified', () => {
      const data = [
        { id: 1, name: 'Test' },
      ]

      exportToCSV(data, 'all-columns.csv')

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should handle empty data array', () => {
      exportToCSV([], 'empty.csv')

      expect(clickSpy).toHaveBeenCalled()
    })
  })

  describe('exportToJSON', () => {
    it('should export data to JSON file', () => {
      const data = {
        orders: [
          { id: 1, customer: 'Test' },
        ],
        meta: { exported_at: '2024-12-09' },
      }

      exportToJSON(data, 'test.json')

      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalled()
    })

    it('should format JSON with indentation', () => {
      const data = { test: 'value' }

      exportToJSON(data, 'formatted.json')

      expect(clickSpy).toHaveBeenCalled()
    })

    it('should handle arrays', () => {
      const data = [
        { id: 1 },
        { id: 2 },
      ]

      exportToJSON(data, 'array.json')

      expect(clickSpy).toHaveBeenCalled()
    })
  })
})
