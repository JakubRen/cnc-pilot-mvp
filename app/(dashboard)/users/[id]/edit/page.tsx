'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitization'

// Validation schema
const userSchema = z.object({
  email: z.string().email('Nieprawidłowy format email'),
  full_name: z.string().min(2, 'Imię i nazwisko musi mieć minimum 2 znaki'),
  role: z.enum(['pending', 'operator', 'admin', 'owner']),
})

type UserFormData = z.infer<typeof userSchema>

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  })

  // Load existing user data
  useEffect(() => {
    const fetchUser = async () => {
      // Await params in Next.js 15+
      const resolvedParams = await params
      const id = resolvedParams.id
      setUserId(id)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        toast.error('Błąd ładowania użytkownika: ' + error.message)
        router.push('/users')
        return
      }

      if (data) {
        // Pre-fill form with existing data
        setValue('email', data.email)
        setValue('full_name', data.full_name)
        setValue('role', data.role)
      }

      setLoading(false)
    }

    fetchUser()
  }, [params, setValue, router])

  const onSubmit = async (data: UserFormData) => {
    const loadingToast = toast.loading('Aktualizowanie użytkownika...')

    // Sanitize user inputs to prevent XSS attacks
    const sanitizedData = {
      ...data,
      email: sanitizeEmail(data.email),
      full_name: sanitizeText(data.full_name),
    }

    const { error } = await supabase
      .from('users')
      .update(sanitizedData)
      .eq('id', userId)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Nie udało się zaktualizować użytkownika: ' + error.message)
      return
    }

    toast.success('Użytkownik zaktualizowany pomyślnie!')
    router.push('/users')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground text-xl">Ładowanie danych użytkownika...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-8">Edytuj Użytkownika</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="edit_email" className="block text-foreground mb-2 font-medium">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="edit_email"
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Full Name Field */}
          <div>
            <label htmlFor="edit_full_name" className="block text-foreground mb-2 font-medium">
              Imię i Nazwisko <span className="text-red-400">*</span>
            </label>
            <input
              id="edit_full_name"
              {...register('full_name')}
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
              placeholder="Jan Kowalski"
            />
            {errors.full_name && (
              <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label htmlFor="edit_role" className="block text-foreground mb-2 font-medium">
              Rola <span className="text-red-400">*</span>
            </label>
            <select
              id="edit_role"
              {...register('role')}
              className="w-full px-4 py-3 rounded-lg bg-card border border-border text-foreground focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:outline-none transition"
            >
              <option value="pending">⏳ Oczekujący</option>
              <option value="operator">⚙️ Operator</option>
              <option value="admin">🔑 Administrator</option>
              <option value="owner">👑 Właściciel</option>
            </select>
            {errors.role && (
              <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Aktualizowanie...' : 'Zaktualizuj Użytkownika'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/users')}
              className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-accent font-semibold transition"
            >
              Anuluj
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
