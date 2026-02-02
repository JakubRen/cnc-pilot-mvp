import { commonTranslations } from './common'
import { ordersTranslations } from './orders'
import { productionTranslations } from './production'
import { customersTranslations } from './customers'
import { authTranslations } from './auth'

export type Language = 'pl' | 'en'

export const translations = {
  ...commonTranslations,
  ...ordersTranslations,
  ...productionTranslations,
  ...customersTranslations,
  ...authTranslations,
} as const

// Type for translation keys
export type TranslationKey = keyof typeof translations
export type TranslationSection<K extends TranslationKey> = keyof typeof translations[K]

// Helper function to get translation
export function t<K extends TranslationKey, S extends TranslationSection<K>>(
  section: K, key: S, lang: Language, params?: Record<string, string | number>
): string {
  const sectionData = translations[section] as Record<string, Record<Language, string>>
  const translation = sectionData?.[key as string]?.[lang] || sectionData?.[key as string]?.['en'] || String(key)
  if (params) {
    return Object.entries(params).reduce(
      (text, [param, value]) => text.replace(new RegExp(`{${param}}`, 'g'), String(value)),
      translation
    )
  }
  return translation
}

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'pl'
  return (localStorage.getItem('language') as Language) || 'pl'
}

export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('language', lang)
}
