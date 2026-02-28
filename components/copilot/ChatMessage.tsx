'use client'

import type { UIMessage } from 'ai'
import ReportCard from './ReportCard'

interface ChatMessageProps {
  message: UIMessage
}

const TOOL_LABELS: Record<string, string> = {
  search_orders: 'Wyszukuję zamówienia...',
  search_inventory: 'Przeszukuję magazyn...',
  get_customer: 'Pobieram profil klienta...',
  check_deadlines: 'Sprawdzam terminy...',
  generate_quote: 'Generuję wycenę...',
  get_production_plan: 'Generuję plan produkcji...',
  generate_orders_report: 'Generuję raport zamówień...',
  generate_inventory_report: 'Generuję raport magazynu...',
  generate_costs_report: 'Generuję raport kosztów...',
  generate_customer_report: 'Generuję raport klienta...',
  generate_deadlines_report: 'Generuję raport terminów...',
}

const REPORT_TOOLS = new Set([
  'generate_orders_report',
  'generate_inventory_report',
  'generate_costs_report',
  'generate_customer_report',
  'generate_deadlines_report',
])

interface ReportOutput {
  type: 'report'
  reportName: string
  rowCount: number
  summary: string
  csvUrl: string
  reportPageUrl: string
}

function isReportOutput(output: unknown): output is ReportOutput {
  return (
    typeof output === 'object' &&
    output !== null &&
    (output as ReportOutput).type === 'report' &&
    typeof (output as ReportOutput).csvUrl === 'string'
  )
}

function renderToolPart(part: Record<string, unknown>, toolName: string, key: number) {
  const state = part.state as string | undefined

  // Report tool with output → render ReportCard
  if (REPORT_TOOLS.has(toolName) && state === 'output-available' && isReportOutput(part.output)) {
    const r = part.output
    return (
      <ReportCard
        key={key}
        reportName={r.reportName}
        rowCount={r.rowCount}
        summary={r.summary}
        csvUrl={r.csvUrl}
        reportPageUrl={r.reportPageUrl}
      />
    )
  }

  // Report tool still loading
  if (REPORT_TOOLS.has(toolName) && state !== 'output-available') {
    return (
      <div
        key={key}
        className="text-xs bg-background/50 rounded px-2 py-1 mb-2 border border-border"
      >
        <span className="font-mono text-muted-foreground">
          {TOOL_LABELS[toolName] || `Generuję raport...`}
        </span>
      </div>
    )
  }

  // Non-report tool — show label badge (loading or done, same visual)
  return (
    <div
      key={key}
      className="text-xs bg-background/50 rounded px-2 py-1 mb-2 border border-border"
    >
      <span className="font-mono text-muted-foreground">
        {TOOL_LABELS[toolName] || `Wywołuję ${toolName}...`}
      </span>
    </div>
  )
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isUser
            ? 'bg-violet-600 text-white'
            : 'bg-muted text-foreground'
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === 'text') {
            return (
              <div key={i} className="whitespace-pre-wrap">
                {part.text}
              </div>
            )
          }

          // Tool invocation parts (type starts with "tool-")
          if (part.type.startsWith('tool-') && part.type !== 'tool-') {
            const toolName = part.type.replace('tool-', '')
            return renderToolPart(part as unknown as Record<string, unknown>, toolName, i)
          }

          // Dynamic tool parts
          if (part.type === 'dynamic-tool') {
            const p = part as unknown as { type: 'dynamic-tool'; toolName: string; state?: string; output?: unknown }
            return renderToolPart(p as unknown as Record<string, unknown>, p.toolName, i)
          }

          return null
        })}
      </div>
    </div>
  )
}
