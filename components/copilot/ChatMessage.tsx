'use client'

import type { UIMessage } from 'ai'

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
            return (
              <div
                key={i}
                className="text-xs bg-background/50 rounded px-2 py-1 mb-2 border border-border"
              >
                <span className="font-mono text-muted-foreground">
                  {TOOL_LABELS[toolName] || `Wywołuję ${toolName}...`}
                </span>
              </div>
            )
          }

          // Dynamic tool parts
          if (part.type === 'dynamic-tool') {
            const p = part as { type: 'dynamic-tool'; toolName: string }
            return (
              <div
                key={i}
                className="text-xs bg-background/50 rounded px-2 py-1 mb-2 border border-border"
              >
                <span className="font-mono text-muted-foreground">
                  {TOOL_LABELS[p.toolName] || `Wywołuję ${p.toolName}...`}
                </span>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
