import { useEffect, useRef, useCallback } from 'react'
import { customToast } from '@/lib/toast'

interface UseAutosaveOptions<T> {
  data: T
  onSave: (data: T) => Promise<void> | void
  interval?: number // milliseconds
  enabled?: boolean
  debounce?: number // milliseconds before saving after change
  showToast?: boolean
  storageKey?: string // For localStorage persistence
}

export function useAutosave<T>({
  data,
  onSave,
  interval = 30000, // 30 seconds default
  enabled = true,
  debounce = 2000, // 2 seconds after last change
  showToast = true,
  storageKey,
}: UseAutosaveOptions<T>) {
  const savedDataRef = useRef<T>(data)
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const isSavingRef = useRef(false)
  const lastSaveTimeRef = useRef<number>(Date.now())

  // Check if data has changed
  const hasChanged = useCallback(() => {
    return JSON.stringify(data) !== JSON.stringify(savedDataRef.current)
  }, [data])

  // Save function
  const save = useCallback(async () => {
    if (isSavingRef.current || !enabled) return

    if (!hasChanged()) return

    isSavingRef.current = true

    try {
      await onSave(data)
      savedDataRef.current = data
      lastSaveTimeRef.current = Date.now()

      // Save to localStorage if key provided
      if (storageKey) {
        localStorage.setItem(storageKey, JSON.stringify(data))
      }

      if (showToast) {
        customToast.success('Zmiany zapisane automatycznie', {
          duration: 2000,
        })
      }
    } catch (error) {
      console.error('Autosave failed:', error)
      if (showToast) {
        customToast.error('Nie udało się zapisać zmian')
      }
    } finally {
      isSavingRef.current = false
    }
  }, [data, onSave, enabled, hasChanged, showToast, storageKey])

  // Debounced save - wait X ms after last change
  useEffect(() => {
    if (!enabled) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout
    if (hasChanged()) {
      saveTimeoutRef.current = setTimeout(() => {
        save()
      }, debounce)
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [data, enabled, debounce, hasChanged, save])

  // Interval save - save every X seconds even if no changes
  useEffect(() => {
    if (!enabled || !interval) return

    intervalRef.current = setInterval(() => {
      if (hasChanged()) {
        save()
      }
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, interval, hasChanged, save])

  // Restore from localStorage on mount
  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          savedDataRef.current = parsed
        } catch (error) {
          console.error('Failed to restore from localStorage:', error)
        }
      }
    }
  }, [storageKey])

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanged() && enabled) {
        e.preventDefault()
        e.returnValue = 'Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?'
        save()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanged, enabled, save])

  // Manual save function
  const saveNow = useCallback(async () => {
    await save()
  }, [save])

  // Clear autosave
  const clearAutosave = useCallback(() => {
    if (storageKey) {
      localStorage.removeItem(storageKey)
    }
    savedDataRef.current = data
  }, [storageKey, data])

  // Get time since last save
  const getTimeSinceLastSave = useCallback(() => {
    return Date.now() - lastSaveTimeRef.current
  }, [])

  return {
    saveNow,
    clearAutosave,
    isSaving: isSavingRef.current,
    hasUnsavedChanges: hasChanged(),
    lastSaveTime: lastSaveTimeRef.current,
    getTimeSinceLastSave,
  }
}

// Simple version for quick use
export function useSimpleAutosave<T>(
  data: T,
  onSave: (data: T) => Promise<void> | void,
  enabled = true
) {
  return useAutosave({
    data,
    onSave,
    enabled,
    interval: 30000,
    debounce: 2000,
    showToast: true,
  })
}
