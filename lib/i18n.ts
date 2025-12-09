// Simple i18n implementation

export type Locale = 'pl' | 'en'

type TranslationKeys = {
  common: {
    save: string
    cancel: string
    delete: string
    edit: string
    add: string
    search: string
    loading: string
    error: string
    success: string
  }
  orders: {
    title: string
    addNew: string
    orderNumber: string
    customer: string
    status: string
    deadline: string
  }
  // Add more as needed
}

const translations: Record<Locale, TranslationKeys> = {
  pl: {
    common: {
      save: 'Zapisz',
      cancel: 'Anuluj',
      delete: 'Usuń',
      edit: 'Edytuj',
      add: 'Dodaj',
      search: 'Szukaj',
      loading: 'Ładowanie...',
      error: 'Błąd',
      success: 'Sukces',
    },
    orders: {
      title: 'Zamówienia',
      addNew: 'Dodaj zamówienie',
      orderNumber: 'Numer zamówienia',
      customer: 'Klient',
      status: 'Status',
      deadline: 'Termin',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    orders: {
      title: 'Orders',
      addNew: 'Add order',
      orderNumber: 'Order number',
      customer: 'Customer',
      status: 'Status',
      deadline: 'Deadline',
    },
  },
}

let currentLocale: Locale = 'pl'

export function setLocale(locale: Locale) {
  currentLocale = locale
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale)
    document.documentElement.lang = locale
  }
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('locale') as Locale
    if (stored) return stored
  }
  return currentLocale
}

export function t(key: string): string {
  const keys = key.split('.')
  let value: any = translations[getLocale()]

  for (const k of keys) {
    value = value?.[k]
  }

  return value || key
}

// React hook
import { useState, useEffect } from 'react'

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(getLocale())

  const changeLocale = (newLocale: Locale) => {
    setLocale(newLocale)
    setLocaleState(newLocale)
  }

  return {
    t,
    locale,
    setLocale: changeLocale,
  }
}
