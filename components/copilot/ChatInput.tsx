'use client'

interface ChatInputProps {
  input: string
  onInputChange: (value: string) => void
  onSend: (text: string) => void
  isLoading: boolean
  onStop: () => void
}

export default function ChatInput({ input, onInputChange, onSend, isLoading, onStop }: ChatInputProps) {
  const handleSubmit = () => {
    const text = input.trim()
    if (text) {
      onSend(text)
      onInputChange('')
    }
  }

  return (
    <div className="border-t border-border p-3 flex gap-2 items-end">
      <textarea
        data-testid="copilot-input"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Zapytaj CNC Copilot..."
        className="flex-1 resize-none bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[40px] max-h-[120px]"
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
          }
        }}
      />
      {isLoading ? (
        <button
          type="button"
          onClick={onStop}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
          title="Zatrzymaj"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="p-2 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 rounded-lg disabled:opacity-30 transition"
          title="Wyślij"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      )}
    </div>
  )
}
