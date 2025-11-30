'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Imię i nazwisko musi mieć co najmniej 2 znaki'),
  hourly_rate: z.number().min(0, 'Stawka musi być dodatnia').optional(),
});

const passwordSchema = z
  .object({
    new_password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Hasła muszą być identyczne',
    path: ['confirm_password'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface UserProfile {
  id: number
  email: string
  auth_email: string
  full_name: string
  role: string
  hourly_rate?: number | null
}

interface Props {
  user: UserProfile;
}

export default function ProfileClient({ user }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      hourly_rate: user?.hourly_rate || 0,
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    const loadingToast = toast.loading('Zapisywanie profilu...');

    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          hourly_rate: data.hourly_rate || null,
        })
        .eq('id', user.id);

      toast.dismiss(loadingToast);

      if (error) {
        toast.error('Nie udało się zapisać profilu: ' + error.message);
        return;
      }

      toast.success('Profil zapisany pomyślnie!');
      router.refresh();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Wystąpił błąd podczas zapisywania');
      console.error('Error updating profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    setIsChangingPassword(true);
    const loadingToast = toast.loading('Zmienianie hasła...');

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      });

      toast.dismiss(loadingToast);

      if (error) {
        toast.error('Nie udało się zmienić hasła: ' + error.message);
        return;
      }

      toast.success('Hasło zmienione pomyślnie!');
      resetPassword();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Wystąpił błąd podczas zmiany hasła');
      console.error('Error changing password:', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-600 text-white';
      case 'admin':
        return 'bg-blue-600 text-white';
      case 'manager':
        return 'bg-green-600 text-white';
      case 'operator':
        return 'bg-yellow-600 text-white';
      case 'viewer':
        return 'bg-slate-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Właściciel';
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Menedżer';
      case 'operator':
        return 'Operator';
      case 'viewer':
        return 'Obserwator';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information Card */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-3xl flex-shrink-0">
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{user.full_name}</h2>
            <p className="text-slate-400 mt-1">{user.auth_email}</p>
            <div className="mt-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <h3 className="text-xl font-bold text-white mb-4">Edytuj profil</h3>

          {/* Full Name */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Imię i nazwisko *
            </label>
            <input
              {...registerProfile('full_name')}
              type="text"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Jan Kowalski"
            />
            {profileErrors.full_name && (
              <p className="text-red-400 text-sm mt-1">
                {profileErrors.full_name.message}
              </p>
            )}
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Email
            </label>
            <input
              type="email"
              value={user.auth_email}
              disabled
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
            />
            <p className="text-slate-500 text-xs mt-1">
              Email nie może być zmieniony
            </p>
          </div>

          {/* Hourly Rate */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Stawka godzinowa (PLN/h)
            </label>
            <input
              {...registerProfile('hourly_rate', { valueAsNumber: true })}
              type="number"
              step="0.01"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            {profileErrors.hourly_rate && (
              <p className="text-red-400 text-sm mt-1">
                {profileErrors.hourly_rate.message}
              </p>
            )}
            <p className="text-slate-500 text-xs mt-1">
              Używana do obliczania kosztów czasu pracy
            </p>
          </div>

          {/* Role (Read-only) */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Rola
            </label>
            <input
              type="text"
              value={getRoleLabel(user.role)}
              disabled
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
            />
            <p className="text-slate-500 text-xs mt-1">
              Rola może być zmieniona tylko przez administratora
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Zmień hasło</h3>

        <form
          onSubmit={handleSubmitPassword(onSubmitPassword)}
          className="space-y-4"
        >
          {/* New Password */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Nowe hasło *
            </label>
            <input
              {...registerPassword('new_password')}
              type="password"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Wprowadź nowe hasło"
            />
            {passwordErrors.new_password && (
              <p className="text-red-400 text-sm mt-1">
                {passwordErrors.new_password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Potwierdź hasło *
            </label>
            <input
              {...registerPassword('confirm_password')}
              type="password"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Potwierdź nowe hasło"
            />
            {passwordErrors.confirm_password && (
              <p className="text-red-400 text-sm mt-1">
                {passwordErrors.confirm_password.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChangingPassword ? 'Zmienianie...' : 'Zmień hasło'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
