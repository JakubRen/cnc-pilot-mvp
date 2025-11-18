'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
      <button
        onClick={() => setTheme('light')}
        className={`px-3 py-1.5 rounded text-sm transition ${
          theme === 'light'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Light theme"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`px-3 py-1.5 rounded text-sm transition ${
          theme === 'dark'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Dark theme"
      >
        🌙
      </button>
      <button
        onClick={() => setTheme('auto')}
        className={`px-3 py-1.5 rounded text-sm transition ${
          theme === 'auto'
            ? 'bg-blue-600 text-white'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Auto theme"
      >
        ⚙️
      </button>
    </div>
  )
}
