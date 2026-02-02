 
'use client'

import { useTranslation } from '@/hooks/useTranslation'
import { tCooperation } from '@/lib/translation-helpers'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface CooperantWithStats {
  id: string
  name: string
  service_type: string
  contact_person?: string
  phone?: string
  email?: string
  avg_lead_days: number
  is_active: boolean
  totalOperations: number
  activeOperations: number
}

interface CooperantsPageClientProps {
  cooperants: CooperantWithStats[]
}

export default function CooperantsPageClient({ cooperants }: CooperantsPageClientProps) {
  const { t, lang } = useTranslation()

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/cooperation" className="text-muted-foreground hover:text-foreground">
                ← {t('common', 'back')}
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-foreground">{tCooperation('cooperants', lang)}</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj kooperantami</p>
          </div>
          <Link href="/cooperation/cooperants/add">
            <Button variant="primary">+ Dodaj kooperanta</Button>
          </Link>
        </div>

        {/* Cooperants List */}
        {!cooperants || cooperants.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🏭</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Brak kooperantów
            </h2>
            <p className="text-muted-foreground mb-6">
              Dodaj pierwszego kooperanta, aby rozpocząć współpracę
            </p>
            <Link href="/cooperation/cooperants/add">
              <Button variant="primary">Dodaj pierwszego kooperanta</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cooperants.map((coop) => (
              <div
                key={coop.id}
                className={`bg-card border rounded-lg p-6 ${coop.is_active ? 'border-border' : 'border-border opacity-60'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{coop.name}</h3>
                    <span className="inline-block px-2 py-1 bg-violet-600/20 text-violet-400 text-xs rounded mt-1">
                      {coop.service_type}
                    </span>
                  </div>
                  {!coop.is_active && (
                    <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                      Nieaktywny
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  {coop.contact_person && (
                    <p className="text-muted-foreground">
                      <span className="text-slate-500">Kontakt:</span> {coop.contact_person}
                    </p>
                  )}
                  {coop.phone && (
                    <p className="text-muted-foreground">
                      <span className="text-slate-500">Tel:</span>{' '}
                      <a href={`tel:${coop.phone}`} className="text-violet-400 hover:underline">
                        {coop.phone}
                      </a>
                    </p>
                  )}
                  {coop.email && (
                    <p className="text-muted-foreground">
                      <span className="text-slate-500">Email:</span>{' '}
                      <a href={`mailto:${coop.email}`} className="text-violet-400 hover:underline">
                        {coop.email}
                      </a>
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    <span className="text-slate-500">Średni czas realizacji:</span> {coop.avg_lead_days} dni
                  </p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <div className="flex gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Wszystkie: <span className="text-foreground font-semibold">{coop.totalOperations}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {tCooperation('activeOperations', lang)}: <span className="text-violet-400 font-semibold">{coop.activeOperations}</span>
                    </span>
                  </div>
                  <Link
                    href={`/cooperation/cooperants/${coop.id}/edit`}
                    className="text-muted-foreground hover:text-foreground text-sm"
                  >
                    {t('common', 'edit')}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
