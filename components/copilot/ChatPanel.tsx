'use client'

import { useState, useRef, useEffect } from 'react'
import { useCopilotChat } from '@/hooks/useCopilotChat'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { XMarkIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'

export default function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, input, setInput, sendMessage, status, stop, error } = useCopilotChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isLoading = status === 'submitted' || status === 'streaming'

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Keyboard shortcut: Ctrl+Shift+K to toggle (NOT Ctrl+K — that's CommandPalette)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSend = (text: string) => {
    sendMessage({ text })
  }

  return (
    <>
      {/* Floating toggle button */}
      {!isOpen && (
        <button
          data-testid="copilot-toggle"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 lg:bottom-6 w-14 h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg flex items-center justify-center transition z-40"
          aria-label="Otwórz CNC Copilot (Ctrl+Shift+K)"
          title="CNC Copilot (Ctrl+Shift+K)"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          data-testid="copilot-panel"
          className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 w-full sm:w-[400px] h-[80vh] sm:h-[600px] bg-card border border-border sm:rounded-xl shadow-2xl flex flex-col z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-violet-500" />
              <h3 className="font-semibold text-sm text-foreground">CNC Copilot</h3>
            </div>
            <button
              data-testid="copilot-close"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div data-testid="copilot-welcome" className="text-center text-muted-foreground text-sm mt-8">
                <ChatBubbleLeftRightIcon className="w-10 h-10 mx-auto mb-3 text-violet-400" />
                <p className="font-medium">Cześć! Jestem CNC Copilot.</p>
                <p className="mt-1">Zapytaj mnie o zamówienia, klientów, magazyn lub wyceny.</p>
                <div className="mt-4 text-xs space-y-1">
                  <p>&quot;Pokaż opóźnione zamówienia&quot;</p>
                  <p>&quot;Ile mamy aluminium w magazynie?&quot;</p>
                  <p>&quot;Wycena tulei stalowej 100x50mm&quot;</p>
                </div>
              </div>
            )}
            {messages.map(m => (
              <ChatMessage key={m.id} message={m} />
            ))}
            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded">
                Wystąpił błąd: {error.message}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            onStop={stop}
          />
        </div>
      )}
    </>
  )
}
