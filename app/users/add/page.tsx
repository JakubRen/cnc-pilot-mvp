'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Validation schema - defines rules for form fields
const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['operator', 'manager', 'admin']),
})

type UserFormData = z.infer<typeof userSchema>

export default function AddUserPage() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'operator', // Default role
    },
  })

  const onSubmit = async (data: UserFormData) => {
    const loadingToast = toast.loading('Adding user...')

    const { error } = await supabase
      .from('users')
      .insert([data])

    toast.dismiss(loadingToast)

    if (error) {
      toast.error('Failed to add user: ' + error.message)
      return
    }

    toast.success('User added successfully!')
    router.push('/users')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Add New User</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-slate-300 mb-2 font-medium">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              {...register('email')}
              type="email"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Full Name Field */}
          <div>
            <label htmlFor="full_name" className="block text-slate-300 mb-2 font-medium">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              id="full_name"
              {...register('full_name')}
              type="text"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              placeholder="Jan Kowalski"
            />
            {errors.full_name && (
              <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
            )}
          </div>

          {/* Role Field */}
          <div>
            <label htmlFor="role" className="block text-slate-300 mb-2 font-medium">
              Role <span className="text-red-400">*</span>
            </label>
            <select
              id="role"
              {...register('role')}
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            >
              <option value="operator">Operator</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
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
              {isSubmitting ? 'Adding...' : 'Add User'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/users')}
              className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
