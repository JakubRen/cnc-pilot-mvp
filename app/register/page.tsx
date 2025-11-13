'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { validateEmailForRegistration } from '@/lib/email-utils'
import toast from 'react-hot-toast'
import Link from 'next/link'

const registerSchema = z.object({
  email: z.string().email('Nieprawidłowy format adresu email'),
  password: z.string().min(8, 'Hasło musi mieć minimum 8 znaków'),
  fullName: z.string().min(2, 'Imię i nazwisko musi mieć minimum 2 znaki'),
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    const loadingToast = toast.loading('Sprawdzanie domeny email...')

    try {
      // KROK 1: Walidacja email domain
      const validation = await validateEmailForRegistration(data.email)

      if (!validation.isValid || !validation.company_id) {
        toast.dismiss(loadingToast)
        toast.error(validation.error || 'Nie można zidentyfikować firmy')
        return
      }

      toast.dismiss(loadingToast)
      const registeringToast = toast.loading('Tworzenie konta...')

      // KROK 2: Rejestracja użytkownika w Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            company_id: validation.company_id,
          },
        },
      })

      if (authError) {
        toast.dismiss(registeringToast)
        toast.error('Błąd rejestracji: ' + authError.message)
        return
      }

      toast.dismiss(registeringToast)

      // KROK 3: Sukces - przekieruj do dashboardu
      toast.success('Konto utworzone pomyślnie!')

      // Wait a moment for trigger to create user profile
      await new Promise(resolve => setTimeout(resolve, 1000))

      router.push('/')

    } catch (err: any) {
      toast.dismiss(loadingToast)
      toast.error(err.message || 'Wystąpił błąd. Spróbuj ponownie.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">CNC-Pilot</h1>
          <p className="text-slate-400">Production Management System</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-slate-300 mb-2">Full Name</label>
              <input
                {...register('fullName')}
                type="text"
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="Magda Kowalska"
              />
              {errors.fullName && (
                <p className="text-red-400 text-sm mt-1">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-300 mb-2">Email (firmowy)</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="jan.kowalski@twojafirma.pl"
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
              <p className="text-slate-400 text-xs mt-1">
                Użyj firmowego adresu email (nie gmail, wp, itp.)
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-300 mb-2">Password</label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold transition"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
