'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { logger } from '@/lib/logger'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitization'

// Walidacja formularza
const userSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
  full_name: z.string().min(2, 'Imię i nazwisko musi mieć minimum 2 znaki'),
  role: z.enum(['operator', 'manager', 'admin', 'viewer']),
  sendInvite: z.boolean().optional(),
})

type UserFormData = z.infer<typeof userSchema>

export default function AddUserPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'operator',
      sendInvite: false,
    },
  })

  const onSubmit = async (data: UserFormData) => {
    const loadingToast = toast.loading('Tworzenie użytkownika...')

    try {
      // Sanitize user inputs to prevent XSS attacks
      const sanitizedData = {
        ...data,
        email: sanitizeEmail(data.email),
        full_name: sanitizeText(data.full_name),
      }

      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      })

      const result = await response.json()
      toast.dismiss(loadingToast)

      if (!response.ok) {
        toast.error(result.error || 'Błąd tworzenia użytkownika')
        return
      }

      toast.success('Użytkownik utworzony pomyślnie!')
      router.push('/users')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error('Wystąpił błąd podczas tworzenia użytkownika')
      logger.error('Create user error', { error })
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    // Ustaw hasło w formularzu
    const passwordInput = document.getElementById('password') as HTMLInputElement
    if (passwordInput) {
      passwordInput.value = password
      // Trigger change event
      const event = new Event('input', { bubbles: true })
      passwordInput.dispatchEvent(event)
    }
    // Skopiuj do schowka
    navigator.clipboard.writeText(password)
    toast.success('Hasło wygenerowane i skopiowane do schowka!')
  }

  return (
<div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dodaj Użytkownika</h1>
          <p className="text-muted-foreground">
            Utwórz nowe konto dla pracownika. Podaj email, hasło początkowe i rolę.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-foreground mb-2 font-semibold">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                autoFocus
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                placeholder="jan.kowalski@firma.pl"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-foreground mb-2 font-semibold">
                Imię i Nazwisko <span className="text-red-400">*</span>
              </label>
              <input
                id="full_name"
                {...register('full_name')}
                type="text"
                className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
                placeholder="Jan Kowalski"
              />
              {errors.full_name && (
                <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-foreground mb-2 font-semibold">
                Hasło początkowe <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="password"
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none transition pr-12"
                    placeholder="Minimum 8 znaków"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-accent transition whitespace-nowrap"
                >
                  🎲 Generuj
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
              <p className="text-slate-500 dark:text-muted-foreground text-sm mt-1">
                Użytkownik może zmienić hasło po pierwszym logowaniu
              </p>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-foreground mb-2 font-semibold">
                Rola <span className="text-red-400">*</span>
              </label>
              <select
                id="role"
                {...register('role')}
                className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
              >
                <option value="operator">Operator - wykonuje zlecenia, śledzi czas</option>
                <option value="viewer">Przeglądający - tylko podgląd</option>
                <option value="manager">Manager - zarządza zamówieniami i magazynem</option>
                <option value="admin">Administrator - pełne uprawnienia (bez usuwania firmy)</option>
              </select>
              {errors.role && (
                <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>

            {/* Role descriptions */}
            <div className="p-4 bg-violet-900/20 border border-violet-700/30 rounded-lg">
              <h3 className="font-semibold text-violet-300 mb-2">Opis ról:</h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li><span className="text-green-400">Operator</span> - Wykonuje zlecenia, śledzi czas pracy</li>
                <li><span className="text-slate-400">Przeglądający</span> - Tylko podgląd danych</li>
                <li><span className="text-yellow-400">Manager</span> - Zarządza zamówieniami, magazynem, raportami</li>
                <li><span className="text-violet-400">Admin</span> - Pełne uprawnienia, zarządzanie użytkownikami</li>
              </ul>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button type="submit" isLoading={isSubmitting} loadingText="Tworzenie..." variant="primary" className="flex-1">
              Utwórz Użytkownika
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/users')}
            >
              Anuluj
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-card border border-border rounded-lg">
          <h3 className="font-semibold text-foreground mb-2">💡 Co dalej?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Przekaż nowego użytkownikowi email i hasło</li>
            <li>• Użytkownik loguje się na stronie /login</li>
            <li>• Może zmienić hasło w ustawieniach profilu</li>
            <li>• Uprawnienia możesz zmienić w Ustawienia → Uprawnienia</li>
          </ul>
        </div>
      </div>
    </div>
)
}
