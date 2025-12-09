'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface NotificationPreferences {
  email_enabled: boolean
  order_created: boolean
  order_status_changed: boolean
  deadline_approaching: boolean
  deadline_days_before: number
  low_stock_alert: boolean
  team_changes: boolean
  daily_summary: boolean
  weekly_report: boolean
}

interface NotificationSettingsProps {
  userId: number
  initialPreferences: NotificationPreferences
}

const defaultPreferences: NotificationPreferences = {
  email_enabled: true,
  order_created: true,
  order_status_changed: true,
  deadline_approaching: true,
  deadline_days_before: 3,
  low_stock_alert: true,
  team_changes: true,
  daily_summary: false,
  weekly_report: false,
}

export default function NotificationSettings({ userId, initialPreferences }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    initialPreferences || defaultPreferences
  )
  const [saving, setSaving] = useState(false)

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (key === 'deadline_days_before') return
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleDaysChange = (value: number) => {
    setPreferences((prev) => ({
      ...prev,
      deadline_days_before: value,
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const loadingToast = toast.loading('Zapisywanie preferencji...')

    try {
      const { error } = await supabase
        .from('users')
        .update({ notification_preferences: preferences })
        .eq('id', userId)

      toast.dismiss(loadingToast)

      if (error) throw error

      toast.success('Preferencje zapisane!')
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error('Błąd podczas zapisywania')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const notificationTypes = [
    {
      key: 'order_created' as const,
      label: 'Nowe zamówienia',
      description: 'Powiadomienie gdy zostanie utworzone nowe zamówienie',
      icon: '📦',
    },
    {
      key: 'order_status_changed' as const,
      label: 'Zmiana statusu',
      description: 'Powiadomienie gdy status zamówienia się zmieni',
      icon: '🔄',
    },
    {
      key: 'deadline_approaching' as const,
      label: 'Zbliżające się terminy',
      description: 'Przypomnienie o zbliżających się terminach realizacji',
      icon: '⏰',
    },
    {
      key: 'low_stock_alert' as const,
      label: 'Niskie stany magazynowe',
      description: 'Alert gdy stan magazynowy spadnie poniżej progu',
      icon: '🚨',
    },
    {
      key: 'team_changes' as const,
      label: 'Zmiany w zespole',
      description: 'Powiadomienie o nowych członkach zespołu',
      icon: '👥',
    },
    {
      key: 'daily_summary' as const,
      label: 'Dzienny raport',
      description: 'Codzienne podsumowanie aktywności (rano)',
      icon: '📊',
    },
    {
      key: 'weekly_report' as const,
      label: 'Tygodniowy raport',
      description: 'Raport tygodniowy z podsumowaniem (poniedziałek)',
      icon: '📈',
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <span>🔔</span> Powiadomienia Email
      </h3>

      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg mb-6">
        <div>
          <p className="text-slate-900 dark:text-white font-medium">Włącz powiadomienia email</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Główny przełącznik dla wszystkich powiadomień</p>
        </div>
        <button
          onClick={() => handleToggle('email_enabled')}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            preferences.email_enabled ? 'bg-blue-600' : 'bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
              preferences.email_enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Individual notifications */}
      <div className={`space-y-4 ${!preferences.email_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {notificationTypes.map((type) => (
          <div
            key={type.key}
            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{type.icon}</span>
              <div>
                <p className="text-slate-900 dark:text-white font-medium">{type.label}</p>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{type.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle(type.key)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences[type.key] ? 'bg-blue-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences[type.key] ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}

        {/* Deadline days selector */}
        {preferences.deadline_approaching && (
          <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg ml-8">
            <label className="block text-slate-600 dark:text-slate-300 text-sm mb-2">
              Powiadom o terminie na ile dni przed:
            </label>
            <select
              value={preferences.deadline_days_before}
              onChange={(e) => handleDaysChange(parseInt(e.target.value))}
              className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg px-4 py-2"
            >
              <option value={1}>1 dzień</option>
              <option value={2}>2 dni</option>
              <option value={3}>3 dni</option>
              <option value={5}>5 dni</option>
              <option value={7}>7 dni</option>
            </select>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
        >
          {saving ? 'Zapisywanie...' : 'Zapisz preferencje'}
        </button>
      </div>
    </div>
  )
}
