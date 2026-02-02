'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-muted border border-border rounded-lg p-1">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1.5 rounded text-sm transition ${
          theme === 'light'
            ? 'bg-white dark:bg-violet-600 text-violet-600 dark:text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Light theme"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1.5 rounded text-sm transition ${
          theme === 'dark'
            ? 'bg-violet-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Dark theme"
      >
        🌙
      </button>
      <button
        onClick={() => setTheme('auto')}
        className={`px-3 py-1.5 rounded text-sm transition ${
          theme === 'auto'
            ? 'bg-violet-600 text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Auto theme"
      >
        ⚙️
      </button>
    </div>
  )
}
