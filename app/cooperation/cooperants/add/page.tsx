'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import AppLayout from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitization'
import { useTranslation } from '@/hooks/useTranslation'

export default function AddCooperantPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [avgLeadDays, setAvgLeadDays] = useState('7')
  const [notes, setNotes] = useState('')

  const serviceTypes = [
    { key: 'opHartowanie', value: 'Hartowanie' },
    { key: 'opAnodowanie', value: 'Anodowanie' },
    { key: 'opCynkowanie', value: 'Cynkowanie' },
    { key: 'opMalowanie', value: 'Malowanie proszkowe' },
    { key: 'opSzlifowanie', value: 'Szlifowanie' },
    { key: 'opChromowanie', value: 'Chromowanie' },
    { key: 'opNiklowanie', value: 'Niklowanie' },
    { key: 'opTrawienie', value: 'Trawienie' },
    { key: 'opPiaskowanie', value: 'Piaskowanie' },
    { key: 'opInne', value: 'Inne' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error(t('cooperation', 'cooperantNameRequired' as any))
      return
    }

    if (!serviceType) {
      toast.error(t('cooperation', 'selectServiceType' as any))
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading(t('cooperation', 'addingCooperant' as any))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('cooperation', 'notLoggedIn' as any))

      const { data: userProfile } = await supabase
        .from('users')
        .select('company_id')
        .eq('auth_id', user.id)
        .single()

      if (!userProfile?.company_id) throw new Error(t('cooperation', 'noCompany' as any))

      // Sanitize user inputs to prevent XSS attacks
      const { error } = await supabase
        .from('cooperants')
        .insert({
          company_id: userProfile.company_id,
          name: sanitizeText(name.trim()),
          service_type: sanitizeText(serviceType),
          contact_person: contactPerson ? sanitizeText(contactPerson) : null,
          phone: phone ? sanitizeText(phone) : null,
          email: email ? sanitizeEmail(email) : null,
          address: address ? sanitizeText(address) : null,
          avg_lead_days: parseInt(avgLeadDays) || 7,
          notes: notes ? sanitizeText(notes) : null
        })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success(t('cooperation', 'cooperantAdded' as any))
      router.push('/cooperation/cooperants')
      router.refresh()
    } catch (error) {
      toast.dismiss(loadingToast)
      logger.error('Error adding cooperant', { error })
      toast.error(t('cooperation', 'cooperantAddError' as any))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link href="/cooperation/cooperants" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              ← {t('common', 'back')}
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('cooperation', 'newCooperant' as any)}</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'basicInfo' as any)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'companyName' as any)} *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('cooperation', 'companyNamePlaceholder' as any)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'serviceType' as any)} *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">{t('cooperation', 'select' as any)}</option>
                    {serviceTypes.map(type => (
                      <option key={type.key} value={type.value}>{t('cooperation', type.key as any)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'avgLeadTimeDays' as any)}</label>
                  <Input
                    type="number"
                    min="1"
                    value={avgLeadDays}
                    onChange={(e) => setAvgLeadDays(e.target.value)}
                    placeholder="7"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t('cooperation', 'contactInfo' as any)}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'contactPerson' as any)}</label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder={t('cooperation', 'contactPersonPlaceholder' as any)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'phone' as any)}</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('cooperation', 'phonePlaceholder' as any)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('common', 'email' as any)}</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('cooperation', 'emailPlaceholder' as any)}
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('cooperation', 'address' as any)}</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('cooperation', 'addressPlaceholder' as any)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 mb-2">{t('common', 'notes')}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('cooperation', 'notesPlaceholder' as any)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="primary"
                className="flex-1"
              >
                {isSubmitting ? t('cooperation', 'adding' as any) : t('cooperation', 'addCooperant' as any)}
              </Button>
              <Link href="/cooperation/cooperants">
                <Button type="button" variant="ghost">
                  {t('common', 'cancel')}
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
