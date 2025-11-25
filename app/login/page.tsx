'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginAction } from './actions'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import { LanguageSelector } from '@/components/ui/LanguageSelector'

export default function LoginPage() {
  const { t, lang } = useTranslation()

  const loginSchema = z.object({
    email: z.string().email(t('auth', 'invalidEmail')),
    password: z.string().min(6, t('auth', 'passwordMinLength', { min: 6 })),
  })

  type LoginFormData = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    const loadingToast = toast.loading(t('auth', 'loggingIn'))

    try {
      const result = await loginAction(data.email, data.password)

      toast.dismiss(loadingToast)

      if (result?.error) {
        toast.error(t('auth', 'loginFailed') + ': ' + result.error)
        return
      }

      toast.success(t('auth', 'loginSuccess'))
      // loginAction will redirect automatically
    } catch (error: any) {
      toast.dismiss(loadingToast)
      // Server Action redirect throws NEXT_REDIRECT - this is normal
      if (error?.message?.includes('NEXT_REDIRECT')) {
        toast.success(t('auth', 'loginSuccess'))
      } else {
        toast.error(t('auth', 'loginFailed') + ': ' + (error?.message || 'Unknown error'))
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-md w-full">
        {/* Language Selector - Top Right */}
        <div className="flex justify-end mb-4">
          <LanguageSelector variant="flags" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('common', 'appName')}</h1>
          <p className="text-slate-400">{t('common', 'tagline')}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">{t('auth', 'login')}</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-slate-300 mb-2">{t('auth', 'email')}</label>
              <input
                {...register('email')}
                type="email"
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder={t('auth', 'emailPlaceholder')}
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-slate-300 mb-2">{t('auth', 'password')}</label>
              <input
                {...register('password')}
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white focus:border-blue-500 focus:outline-none"
                placeholder={t('auth', 'passwordPlaceholder')}
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
              {isSubmitting ? t('auth', 'loggingIn') : t('auth', 'loginBtn')}
            </button>
          </form>

          {/* Forgot Password */}
          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-slate-400 hover:text-slate-300 text-sm">
              {t('auth', 'forgotPassword')}
            </Link>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center text-slate-400">
            {t('auth', 'noAccount')}{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              {t('auth', 'registerBtn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
