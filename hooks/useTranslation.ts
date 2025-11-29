'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  t as translateFunc, 
  TranslationKey, 
  TranslationSection, 
  Language, 
  getStoredLanguage,
  setStoredLanguage
} from '@/lib/translations'

export function useTranslation() {
  const [lang, setLang] = useState<Language>('pl')

  useEffect(() => {
    setLang(getStoredLanguage())
  }, [])

  const setLanguage = useCallback((newLang: Language) => {
    setStoredLanguage(newLang)
    setLang(newLang)
    // Force refresh to update all components
    window.location.reload() 
  }, [])

  // Wrapper for translation function that injects current language
  const t = useCallback(<K extends TranslationKey, S extends TranslationSection<K>>(
    section: K, 
    key: S, 
    params?: Record<string, string | number>
  ) => {
    return translateFunc(section, key, lang, params)
  }, [lang])

  return { t, lang, setLanguage }
}
