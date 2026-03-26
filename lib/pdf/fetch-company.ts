import { createClient } from '@/lib/supabase-server'
import type { CompanyBranding } from './types'

export async function fetchCompanyBranding(companyId: string): Promise<CompanyBranding> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('name, address, phone, email, logo_url, nip, bank_account, website, currency')
    .eq('id', companyId)
    .single()

  return {
    name: data?.name || 'Firma',
    address: data?.address,
    phone: data?.phone,
    email: data?.email,
    logo_url: data?.logo_url,
    nip: data?.nip,
    bank_account: data?.bank_account,
    website: data?.website,
    currency: data?.currency || 'PLN',
  }
}
