import { describe, it, expect, beforeEach } from 'vitest'
import { setLocale, getLocale, t, useTranslation } from '@/lib/i18n'
import { renderHook, act } from '@testing-library/react'

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('pl') // Reset to default
  })

  describe('setLocale / getLocale', () => {
    it('should set and get locale', () => {
      setLocale('en')
      expect(getLocale()).toBe('en')
    })

    it('should persist locale to localStorage', () => {
      setLocale('en')
      expect(localStorage.getItem('locale')).toBe('en')
    })

    it('should set document.documentElement.lang', () => {
      setLocale('en')
      expect(document.documentElement.lang).toBe('en')
    })

    it('should retrieve locale from localStorage on getLocale', () => {
      localStorage.setItem('locale', 'en')
      expect(getLocale()).toBe('en')
    })

    it('should default to pl if no localStorage value', () => {
      expect(getLocale()).toBe('pl')
    })
  })

  describe('t (translate function)', () => {
    it('should translate Polish keys', () => {
      setLocale('pl')
      expect(t('common.save')).toBe('Zapisz')
      expect(t('common.cancel')).toBe('Anuluj')
      expect(t('common.delete')).toBe('Usuń')
    })

    it('should translate English keys', () => {
      setLocale('en')
      expect(t('common.save')).toBe('Save')
      expect(t('common.cancel')).toBe('Cancel')
      expect(t('common.delete')).toBe('Delete')
    })

    it('should translate nested keys', () => {
      setLocale('pl')
      expect(t('orders.title')).toBe('Zamówienia')
      expect(t('orders.addNew')).toBe('Dodaj zamówienie')
    })

    it('should return key if translation not found', () => {
      expect(t('nonexistent.key')).toBe('nonexistent.key')
    })

    it('should handle deep nesting', () => {
      setLocale('pl')
      expect(t('orders.customer')).toBe('Klient')
    })
  })

  describe('useTranslation hook', () => {
    it('should provide t, locale, and setLocale', () => {
      const { result } = renderHook(() => useTranslation())

      expect(result.current.t).toBeDefined()
      expect(result.current.locale).toBeDefined()
      expect(result.current.setLocale).toBeDefined()
    })

    it('should return current locale', () => {
      setLocale('pl')
      const { result } = renderHook(() => useTranslation())

      expect(result.current.locale).toBe('pl')
    })

    it('should change locale', () => {
      const { result } = renderHook(() => useTranslation())

      act(() => {
        result.current.setLocale('en')
      })

      expect(result.current.locale).toBe('en')
      expect(getLocale()).toBe('en')
    })

    it('should translate using t from hook', () => {
      setLocale('pl')
      const { result } = renderHook(() => useTranslation())

      expect(result.current.t('common.save')).toBe('Zapisz')
    })

    it('should update translations when locale changes', () => {
      const { result } = renderHook(() => useTranslation())

      // Initially Polish
      expect(result.current.t('common.save')).toBe('Zapisz')

      // Change to English
      act(() => {
        result.current.setLocale('en')
      })

      expect(result.current.t('common.save')).toBe('Save')
    })
  })

  describe('all translation keys', () => {
    it('should have matching keys in both locales', () => {
      const plKeys = ['common.save', 'common.cancel', 'common.delete', 'orders.title']

      plKeys.forEach(key => {
        setLocale('pl')
        const plValue = t(key)

        setLocale('en')
        const enValue = t(key)

        // Both should exist (not return the key)
        expect(plValue).not.toBe(key)
        expect(enValue).not.toBe(key)
      })
    })
  })
})
