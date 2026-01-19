'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import NotificationSettings from '@/components/settings/NotificationSettings';
import { logger } from '@/lib/logger';

const companySchema = z.object({
  name: z.string().min(2, 'Nazwa firmy musi mieć co najmniej 2 znaki'),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  logo_url: z.string().url('Nieprawidłowy URL logo').optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface Company {
  id: string
  name: string
  address: string | null
  phone: string | null
  timezone: string | null
  logo_url: string | null
}

interface EmailDomain {
  id: string
  domain: string
  created_at: string
}

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

interface Props {
  company: Company;
  emailDomains: EmailDomain[];
  userRole: string;
  canManagePermissions: boolean;
  userId: number;
  notificationPreferences?: NotificationPreferences;
}

export default function SettingsClient({ company, emailDomains, userRole, canManagePermissions, userId, notificationPreferences }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      address: company?.address || '',
      phone: company?.phone || '',
      timezone: company?.timezone || 'Europe/Warsaw',
      logo_url: company?.logo_url || '',
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    const loadingToast = toast.loading('Zapisywanie ustawień...');

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: data.name,
          address: data.address || null,
          phone: data.phone || null,
          timezone: data.timezone || 'Europe/Warsaw',
          logo_url: data.logo_url || null,
        })
        .eq('id', company.id);

      toast.dismiss(loadingToast);

      if (error) {
        toast.error('Nie udało się zapisać ustawień: ' + error.message);
        return;
      }

      toast.success('Ustawienia zapisane pomyślnie!');
      router.refresh();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Wystąpił błąd podczas zapisywania');
      logger.error('Error updating company settings', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Links */}
      {(canManagePermissions || userRole === 'owner') && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Szybkie linki</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {canManagePermissions && (
              <a
                href="/settings/permissions"
                className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔐</span>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Zarządzanie uprawnieniami
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-400">
                      Konfiguruj dostęp i uprawnienia użytkowników
                    </p>
                  </div>
                </div>
              </a>
            )}
            <a
              href="/users"
              className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition group"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">👥</span>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Zarządzanie użytkownikami
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-400">
                    Dodawaj i edytuj użytkowników firmy
                  </p>
                </div>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* ABC Pricing Settings */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Wycena ABC (Activity-Based Costing)</h2>
        <p className="text-slate-700 dark:text-slate-400 mb-4">
          Konfiguruj koszty maszyn, marże i usługi kooperacyjne dla dokładnych wycen produkcji.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/settings/machines"
            className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏭</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Koszty maszyn
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-400">
                  Stawki godzinowe, OEE, energia
                </p>
              </div>
            </div>
          </a>
          <a
            href="/settings/pricing"
            className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Konfiguracja wyceny
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-400">
                  Marże, rabaty ilościowe
                </p>
              </div>
            </div>
          </a>
          <a
            href="/settings/services"
            className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition group"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔗</span>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  Usługi kooperacyjne
                </h3>
                <p className="text-sm text-slate-700 dark:text-slate-400">
                  Anodowanie, hartowanie, malowanie
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Company Information Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Informacje o firmie</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company Name */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
              Nazwa firmy *
            </label>
            <input
              {...register('name')}
              type="text"
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Np. MetalTech Sp. z o.o."
            />
            {errors.name && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
              Adres
            </label>
            <textarea
              {...register('address')}
              rows={3}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Np. ul. Przemysłowa 15, 00-100 Warszawa"
            />
            {errors.address && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.address.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
              Telefon
            </label>
            <input
              {...register('phone')}
              type="tel"
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="Np. +48 123 456 789"
            />
            {errors.phone && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
              Strefa czasowa
            </label>
            <select
              {...register('timezone')}
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="Europe/Warsaw">Europa/Warszawa (CET/CEST)</option>
              <option value="Europe/London">Europa/Londyn (GMT/BST)</option>
              <option value="America/New_York">Ameryka/Nowy Jork (EST/EDT)</option>
              <option value="Asia/Tokyo">Azja/Tokio (JST)</option>
            </select>
            {errors.timezone && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.timezone.message}</p>
            )}
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 text-sm font-semibold mb-2">
              URL Logo
            </label>
            <input
              {...register('logo_url')}
              type="url"
              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              placeholder="https://example.com/logo.png"
            />
            {errors.logo_url && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.logo_url.message}</p>
            )}
            <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
              Możesz wkleić URL swojego logo lub przesłać plik do serwisu typu Imgur
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

      {/* Email Domains Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Domeny email</h2>
        <p className="text-slate-700 dark:text-slate-400 mb-4">
          Użytkownicy z tymi domenami email mogą automatycznie dołączyć do Twojej firmy.
        </p>

        {emailDomains.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-700 dark:text-slate-400">Brak skonfigurowanych domen email</p>
          </div>
        ) : (
          <div className="space-y-2">
            {emailDomains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <span className="text-slate-900 dark:text-white font-mono">{domain.domain}</span>
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  Dodano:{' '}
                  {new Date(domain.created_at).toLocaleDateString('pl-PL')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg">
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            ℹ️ Aby dodać nową domenę, skontaktuj się z administratorem systemu.
          </p>
        </div>
      </div>

      {/* Notification Settings */}
      <NotificationSettings
        userId={userId}
        initialPreferences={notificationPreferences || {
          email_enabled: true,
          order_created: true,
          order_status_changed: true,
          deadline_approaching: true,
          deadline_days_before: 3,
          low_stock_alert: true,
          team_changes: true,
          daily_summary: false,
          weekly_report: false,
        }}
      />

      {/* Danger Zone (Owner only) */}
      {userRole === 'owner' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-700 p-6">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Strefa niebezpieczna</h2>
          <p className="text-slate-700 dark:text-slate-400 mb-4">
            Działania w tej sekcji są nieodwracalne. Zachowaj ostrożność.
          </p>

          <button
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
            onClick={() => toast.error('Ta funkcja nie jest jeszcze dostępna')}
          >
            Usuń firmę
          </button>
        </div>
      )}
    </div>
  );
}
