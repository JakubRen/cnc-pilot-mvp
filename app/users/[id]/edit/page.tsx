'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Validation schema
const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
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
        toast.error('Error loading user: ' + error.message)
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
    const loadingToast = toast.loading('Updating user...')

    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', userId)

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Failed to update user: ' + error.message)
      return
    }

    toast.success('User updated successfully!')
    router.push('/users')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-slate-900 dark:text-white text-xl">Loading user data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-8">Edit User</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="edit_email" className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="edit_email"
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Full Name Field */}
          <div>
            <label htmlFor="edit_full_name" className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              id="edit_full_name"
              {...register('full_name')}
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="Jan Kowalski"
            />
            {errors.full_name && (
              <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label htmlFor="edit_role" className="block text-slate-700 dark:text-slate-300 mb-2 font-medium">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              id="edit_role"
              {...register('role')}
              className="w-full px-4 py-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            >
              <option value="pending">⏳ Oczekujący (Pending)</option>
              <option value="operator">⚙️ Operator</option>
              <option value="admin">🔑 Admin</option>
              <option value="owner">👑 Właściciel (Owner)</option>
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? 'Updating...' : 'Update User'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/users')}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
