// lib/email-utils.ts
// Day 10: Multi-Tenancy - Email Domain Helpers

import { supabase } from '@/lib/supabase';

/**
 * Ekstraktuje domenę z adresu email
 * @param email - Adres email (np. "jan.kowalski@firma.pl")
 * @returns Domena (np. "firma.pl") lub null jeśli nieprawidłowy format
 */
export function extractEmailDomain(email: string): string | null {
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  return parts[1].toLowerCase().trim();
}

/**
 * Sprawdza czy domena jest publiczną domeną email (gmail, wp, itp.)
 * @param domain - Domena do sprawdzenia
 * @returns true jeśli domena jest publiczna
 */
export function isPublicEmailDomain(domain: string): boolean {
  const publicDomains = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.uk',
    'hotmail.com',
    'hotmail.co.uk',
    'outlook.com',
    'live.com',
    'wp.pl',
    'o2.pl',
    'interia.pl',
    'onet.pl',
    'interia.eu',
    'icloud.com',
    'me.com',
    'proton.me',
    'protonmail.com',
    'protonmail.ch',
    'aol.com',
    'mail.com',
    'yandex.com',
    'zoho.com',
  ];

  return publicDomains.includes(domain.toLowerCase());
}

/**
 * Pobiera company_id na podstawie domeny email
 * @param email - Adres email użytkownika
 * @returns Object z company_id lub błędem
 */
export async function getCompanyIdByEmailDomain(
  email: string
): Promise<{ company_id: string | null; error: string | null }> {
  // Ekstrakcja domeny
  const domain = extractEmailDomain(email);

  if (!domain) {
    return {
      company_id: null,
      error: 'Nieprawidłowy format adresu email',
    };
  }

  // Sprawdź czy to publiczna domena
  if (isPublicEmailDomain(domain)) {
    return {
      company_id: null,
      error: `Użyj firmowego adresu email, a nie publicznego (${domain}). Publiczne domeny takie jak gmail, wp, onet nie są dozwolone.`,
    };
  }

  // Sprawdź czy domena istnieje w bazie
  const { data, error } = await supabase
    .from('company_email_domains')
    .select('company_id')
    .eq('email_domain', domain)
    .single();

  if (error || !data) {
    return {
      company_id: null,
      error: `Domena "${domain}" nie jest zarejestrowana w systemie. Skontaktuj się z administratorem, aby dodać Twoją firmę.`,
    };
  }

  return {
    company_id: data.company_id,
    error: null,
  };
}

/**
 * Sprawdza czy domena jest zablokowana w bazie
 * @param domain - Domena do sprawdzenia
 * @returns true jeśli domena jest zablokowana
 */
export async function isDomainBlocked(domain: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('blocked_email_domains')
    .select('domain')
    .eq('domain', domain.toLowerCase())
    .single();

  return !!data && !error;
}

/**
 * Waliduje email przed rejestracją
 * @param email - Adres email do walidacji
 * @returns Object z rezultatem walidacji
 */
export async function validateEmailForRegistration(
  email: string
): Promise<{
  isValid: boolean;
  company_id: string | null;
  error: string | null;
}> {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      company_id: null,
      error: 'Nieprawidłowy format adresu email',
    };
  }

  // Get company ID by domain
  const { company_id, error } = await getCompanyIdByEmailDomain(email);

  if (error || !company_id) {
    return {
      isValid: false,
      company_id: null,
      error: error || 'Nie można zidentyfikować firmy',
    };
  }

  return {
    isValid: true,
    company_id,
    error: null,
  };
}

/**
 * Pobiera wszystkie domeny przypisane do firmy
 * @param companyId - ID firmy
 * @returns Array domen email
 */
export async function getCompanyEmailDomains(
  companyId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('company_email_domains')
    .select('email_domain')
    .eq('company_id', companyId);

  if (error || !data) {
    return [];
  }

  return data.map((row) => row.email_domain);
}

/**
 * Dodaje nową domenę email do firmy (tylko admin)
 * @param companyId - ID firmy
 * @param emailDomain - Domena email (np. "firma.pl")
 * @param createdBy - ID użytkownika dodającego
 * @returns Success/error
 */
export async function addCompanyEmailDomain(
  companyId: string,
  emailDomain: string,
  createdBy?: string
): Promise<{ success: boolean; error: string | null }> {
  // Sprawdź czy to publiczna domena
  if (isPublicEmailDomain(emailDomain)) {
    return {
      success: false,
      error: 'Nie można dodać publicznej domeny email (gmail, wp, itp.)',
    };
  }

  const { error } = await supabase.from('company_email_domains').insert({
    company_id: companyId,
    email_domain: emailDomain.toLowerCase().trim(),
    created_by: createdBy || null,
  });

  if (error) {
    // Check if it's a unique constraint violation
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Ta domena jest już przypisana do innej firmy',
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    error: null,
  };
}

/**
 * Usuwa domenę email z firmy (tylko admin)
 * @param emailDomain - Domena do usunięcia
 * @returns Success/error
 */
export async function removeCompanyEmailDomain(
  emailDomain: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('company_email_domains')
    .delete()
    .eq('email_domain', emailDomain.toLowerCase().trim());

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    error: null,
  };
}
