// Export utilities for Excel and PDF

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return

  const headers = columns
    ? columns.map((col) => col.label)
    : Object.keys(data[0])

  const rows = data.map((row) => {
    const keys = columns ? columns.map((col) => col.key) : Object.keys(row)
    return keys.map((key) => {
      const value = row[key as string]
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
  })

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export function exportToJSON<T>(data: T, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function printToPDF(elementId: string, filename: string) {
  // This requires browser print dialog
  const element = document.getElementById(elementId)
  if (!element) return

  const printWindow = window.open('', '', 'width=800,height=600')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>${filename}</title>
        <style>
          @media print {
            body { margin: 0; }
          }
          ${document.head.innerHTML}
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}
