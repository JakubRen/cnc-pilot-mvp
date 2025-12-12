'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { 
  t as translateFunc, 
  TranslationKey, 
  TranslationSection, 
  Language, 
  getStoredLanguage,
  setStoredLanguage
} from '@/lib/translations'

interface TranslationContextType {
  lang: Language
  setLanguage: (lang: Language) => void
  t: <K extends TranslationKey, S extends TranslationSection<K>>(
    section: K, 
    key: S, 
    params?: Record<string, string | number>
  ) => string
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

interface TranslationProviderProps {
  children: ReactNode
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  // Initialize with stored language immediately (no flash)
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'pl'
    return getStoredLanguage()
  })

  useEffect(() => {
    // Double-check and sync on mount
    const stored = getStoredLanguage()
    if (stored !== lang) {
      setLang(stored)
    }
  }, [])

  const handleSetLanguage = useCallback((newLang: Language) => {
    setStoredLanguage(newLang)
    setLang(newLang)
  }, [])

  const t = useCallback(<K extends TranslationKey, S extends TranslationSection<K>>(
    section: K, 
    key: S, 
    params?: Record<string, string | number>
  ) => {
    return translateFunc(section, key, lang, params)
  }, [lang])

  const value = {
    lang,
    setLanguage: handleSetLanguage,
    t
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    // Fallback if used outside provider (e.g. in some edge cases), 
    // though ideally it should throw or be used within provider.
    // For safety/migration, let's return a standalone instance or throw.
    // Let's throw to ensure correct usage structure.
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}