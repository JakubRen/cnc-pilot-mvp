'use client'

import { useState, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/ui/Skeleton'

// ============================================
// TYPES
// ============================================

interface ParsedFileItem {
  part_name: string
  material: string | null
  quantity: number
  unit_price: number | null
  dimensions: string | null
  complexity: 'simple' | 'medium' | 'complex' | null
  notes: string | null
}

export interface FileParseResult {
  items: ParsedFileItem[]
  customer_name: string | null
  customer_email: string | null
  deadline: string | null
  raw_summary: string
}

interface Props {
  onImport: (data: FileParseResult) => void
  onClose: () => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]

const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============================================
// COMPONENT
// ============================================

export default function QuoteFileUpload({ onImport, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<FileParseResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (f: File): boolean => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast.error('Nieobslugiwany format. Dozwolone: PDF, JPG, PNG')
      return false
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error(`Plik za duzy (${formatFileSize(f.size)}). Maksymalnie 10 MB.`)
      return false
    }
    return true
  }

  const handleFile = (f: File) => {
    if (!validateFile(f)) return
    setFile(f)
    setPreview(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFile(droppedFile)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const handleProcess = async () => {
    if (!file) return

    setIsProcessing(true)
    setPreview(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/agents/parse-quote-file', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      if (!result.data?.items || result.data.items.length === 0) {
        toast.error('Nie udalo sie wyciagnac pozycji z pliku. Sprobuj inny format.')
        return
      }

      setPreview(result.data)
      toast.success(`Rozpoznano ${result.data.items.length} pozycji z pliku`)
    } catch (err) {
      console.error('[QuoteFileUpload] Error:', err)
      toast.error(err instanceof Error ? err.message : 'Blad przetwarzania pliku')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmImport = () => {
    if (!preview) return
    onImport(preview)
    toast.success(`Zaimportowano ${preview.items.length} pozycji z pliku`)
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Processing state ──
  if (isProcessing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-semibold text-foreground">
            AI analizuje plik: {file?.name}...
          </span>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  // ── Preview state ──
  if (preview) {
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
          <p className="text-sm text-violet-800 dark:text-violet-300 font-medium">
            {preview.raw_summary}
          </p>
          {preview.customer_name && (
            <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
              Klient: {preview.customer_name}
              {preview.deadline && ` | Termin: ${preview.deadline}`}
            </p>
          )}
        </div>

        {/* Items table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 text-muted-foreground">#</th>
                <th className="text-left p-3 text-muted-foreground">Nazwa</th>
                <th className="text-left p-3 text-muted-foreground">Material</th>
                <th className="text-right p-3 text-muted-foreground">Ilosc</th>
                <th className="text-left p-3 text-muted-foreground">Wymiary</th>
              </tr>
            </thead>
            <tbody>
              {preview.items.map((item, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3 text-muted-foreground">{i + 1}</td>
                  <td className="p-3 font-medium text-foreground">{item.part_name}</td>
                  <td className="p-3 text-muted-foreground">{item.material || '---'}</td>
                  <td className="p-3 text-right text-foreground">{item.quantity}</td>
                  <td className="p-3 text-muted-foreground text-xs">{item.dimensions || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent transition font-medium text-sm"
          >
            Wybierz inny plik
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition font-semibold text-sm"
          >
            Importuj {preview.items.length} pozycji
          </button>
        </div>
      </div>
    )
  }

  // ── Upload state ──
  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition
          ${dragActive
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : file
              ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
              : 'border-border hover:border-violet-400 bg-muted'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileInput}
          className="hidden"
        />

        {file ? (
          <div className="space-y-2">
            <span className="text-3xl block">
              {file.type === 'application/pdf' ? '\u{1F4C4}' : '\u{1F5BC}'}
            </span>
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleReset() }}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Zmien plik
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-4xl block">{'\u{1F4CE}'}</span>
            <p className="text-sm font-medium text-foreground">
              {dragActive ? 'Upusc plik tutaj' : 'Kliknij lub przeciagnij plik'}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, JPG, PNG — maks. 10 MB
            </p>
          </div>
        )}
      </div>

      {/* Format badges */}
      <div className="flex items-center justify-center gap-2">
        {['PDF', 'JPG', 'PNG'].map((fmt) => (
          <span
            key={fmt}
            className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border"
          >
            {fmt}
          </span>
        ))}
      </div>

      {/* Process button */}
      {file && (
        <button
          type="button"
          onClick={handleProcess}
          className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition font-semibold text-sm"
        >
          Analizuj plik z AI
        </button>
      )}
    </div>
  )
}
