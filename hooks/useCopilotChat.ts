'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { usePathname } from 'next/navigation'
import { useState, useRef, useMemo, useCallback } from 'react'
import type { CopilotContext } from '@/types/copilot'
import type { UIMessage } from 'ai'

// Helper: extract text content from UIMessage parts
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

export function useCopilotChat() {
  const pathname = usePathname()
  const conversationIdRef = useRef<string | null>(null)
  const [input, setInput] = useState('')

  // Extract context from current page
  const context: CopilotContext = useMemo(() => ({
    currentPage: pathname,
    ...(pathname.match(/^\/orders\/([^/]+)$/) && {
      selectedOrderId: pathname.split('/')[2],
    }),
    ...(pathname.match(/^\/customers\/([^/]+)$/) && {
      selectedCustomerName: decodeURIComponent(pathname.split('/')[2]),
    }),
  }), [pathname])

  // Transport sends context as extra body
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/ai/stream',
    body: { context },
  }), [context])

  const chat = useChat({
    transport,
    onFinish: useCallback(async ({ messages }: { messages: UIMessage[] }) => {
      try {
        const response = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversationIdRef.current,
            messages,
            context,
            title: (messages[0] ? getMessageText(messages[0]) : '').slice(0, 50) || 'Nowa rozmowa',
          }),
        })
        const data = await response.json()
        if (data.conversationId && !conversationIdRef.current) {
          conversationIdRef.current = data.conversationId
        }
      } catch {
        // Silent fail — conversation save is not critical
      }
    }, [context]),
  })

  return {
    ...chat,
    input,
    setInput,
    context,
    conversationId: conversationIdRef.current,
  }
}
