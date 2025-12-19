'use client'

import { useState, useEffect, createContext, useContext, ReactNode } from 'react'

interface LiveRegionContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

const LiveRegionContext = createContext<LiveRegionContextType | null>(null)

interface LiveRegionProviderProps {
  children: ReactNode
}

export function LiveRegionProvider({ children }: LiveRegionProviderProps) {
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite')

  const announce = (newMessage: string, newPriority: 'polite' | 'assertive' = 'polite') => {
    // Clear message first to ensure screen reader picks up changes
    setMessage('')
    setPriority(newPriority)

    // Small delay to ensure screen reader picks up the change
    setTimeout(() => setMessage(newMessage), 100)

    // Auto-clear after 5 seconds to prevent message buildup
    setTimeout(() => setMessage(''), 5000)
  }

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      {/* Screen reader announcement region */}
      <div
        role="status"
        aria-live={priority}
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </LiveRegionContext.Provider>
  )
}

export function useLiveRegion() {
  const context = useContext(LiveRegionContext)
  if (!context) {
    throw new Error('useLiveRegion must be used within LiveRegionProvider')
  }
  return context
}
