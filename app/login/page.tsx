'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginAction } from './actions'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'
import { LanguageSelector } from '@/components/ui/LanguageSelector'
import { Starfield } from '@/components/ui/Starfield'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const { t } = useTranslation()

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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black text-white selection:bg-blue-500/30">
      {/* Cosmic Background */}
      <Starfield starCount={400} speed={0.05} className="opacity-60" />
      
      {/* Ambient Glow (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-t from-blue-900/20 via-transparent to-transparent pointer-events-none z-0" />

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full relative z-10 p-6"
      >
        {/* Language Selector - Top Right */}
        <div className="flex justify-end mb-6 opacity-70 hover:opacity-100 transition-opacity">
          <LanguageSelector variant="flags" />
        </div>

        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="relative inline-block"
          >
            {/* Logo Glow Effect */}
            <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full opacity-50 animate-pulse" />
            <h1 className="relative text-5xl font-extralight tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {t('common', 'appName') || 'CNC Pilot'}
            </h1>
          </motion.div>
          <p className="text-blue-200/50 tracking-widest text-sm uppercase font-medium mt-2">
            {t('common', 'tagline') || 'Precision Manufacturing OS'}
          </p>
        </div>

        {/* Glassmorphic Card */}
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-2xl ring-1 ring-white/5">
          <h2 className="text-xl font-medium text-white/90 mb-6 text-center tracking-wide">
            {t('auth', 'login')}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-blue-200/70 uppercase tracking-wider ml-1">
                {t('auth', 'email')}
              </label>
              <input
                {...register('email')}
                type="email"
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white",
                  "placeholder:text-white/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:bg-black/40 focus:outline-none",
                  "transition-all duration-300"
                )}
                placeholder={t('auth', 'emailPlaceholder')}
              />
              {errors.email && (
                <p className="text-red-400 text-xs ml-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="block text-xs font-medium text-blue-200/70 uppercase tracking-wider">
                  {t('auth', 'password')}
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-blue-400/70 hover:text-blue-300 hover:underline transition-colors"
                >
                  {t('auth', 'forgotPassword')}
                </Link>
              </div>
              <input
                {...register('password')}
                type="password"
                className={cn(
                  "w-full px-4 py-3.5 rounded-xl bg-black/20 border border-white/10 text-white",
                  "placeholder:text-white/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:bg-black/40 focus:outline-none",
                  "transition-all duration-300"
                )}
                placeholder={t('auth', 'passwordPlaceholder')}
              />
              {errors.password && (
                <p className="text-red-400 text-xs ml-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full py-3.5 mt-2 rounded-xl font-medium tracking-wide transition-all duration-300",
                "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none border border-blue-500/50"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('auth', 'loggingIn')}
                </span>
              ) : (
                t('auth', 'loginBtn')
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center text-sm text-blue-200/40">
            {t('auth', 'noAccount')}{' '}
            <Link href="/register" className="text-white hover:text-blue-300 font-medium transition-colors border-b border-transparent hover:border-blue-300">
              {t('auth', 'registerBtn')}
            </Link>
          </div>
        </div>
        
        {/* Footer Quote or Info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="text-center text-white/10 text-xs mt-8 font-light"
        >
          System v2.0 • Secure Connection • 2025
        </motion.p>
      </motion.div>
    </div>
  )
}
