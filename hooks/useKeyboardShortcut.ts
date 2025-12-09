import { useEffect, useCallback } from 'react'

interface KeyboardShortcutOptions {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  preventDefault?: boolean
  enabled?: boolean
}

export function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: (event: KeyboardEvent) => void
) {
  const {
    key,
    ctrlKey = false,
    shiftKey = false,
    altKey = false,
    metaKey = false,
    preventDefault = true,
    enabled = true,
  } = options

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Check if all modifier keys match
      const modifiersMatch =
        event.ctrlKey === ctrlKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey &&
        event.metaKey === metaKey

      // Check if the key matches (case-insensitive)
      const keyMatches = event.key.toLowerCase() === key.toLowerCase()

      if (modifiersMatch && keyMatches) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback(event)
      }
    },
    [key, ctrlKey, shiftKey, altKey, metaKey, preventDefault, enabled, callback]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

export function useEscapeKey(callback: () => void, enabled: boolean = true) {
  useKeyboardShortcut(
    { key: 'Escape', enabled },
    callback
  )
}

export function useEnterKey(callback: () => void, enabled: boolean = true) {
  useKeyboardShortcut(
    { key: 'Enter', enabled },
    callback
  )
}
