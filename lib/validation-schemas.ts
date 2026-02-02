import { z } from 'zod'

// Reusable field validators for Polish business forms
export const validators = {
  name: z.string()
    .min(2, 'Nazwa musi mieć przynajmniej 2 znaki')
    .max(100, 'Nazwa nie może przekraczać 100 znaków'),

  email: z.string()
    .email('Nieprawidłowy adres email')
    .optional()
    .or(z.literal('')),

  emailRequired: z.string()
    .email('Nieprawidłowy adres email'),

  phone: z.string()
    .min(9, 'Numer telefonu musi mieć przynajmniej 9 cyfr')
    .max(15, 'Numer telefonu nie może przekraczać 15 cyfr')
    .optional()
    .or(z.literal('')),

  nip: z.string()
    .length(10, 'NIP musi składać się z 10 cyfr')
    .regex(/^\d+$/, 'NIP może zawierać tylko cyfry')
    .optional()
    .or(z.literal('')),

  postalCode: z.string()
    .regex(/^\d{2}-\d{3}$/, 'Kod pocztowy musi być w formacie XX-XXX')
    .optional()
    .or(z.literal('')),

  street: z.string()
    .max(200, 'Ulica nie może przekraczać 200 znaków')
    .optional()
    .or(z.literal('')),

  city: z.string()
    .max(100, 'Miasto nie może przekraczać 100 znaków')
    .optional()
    .or(z.literal('')),

  country: z.string()
    .max(100, 'Kraj nie może przekraczać 100 znaków')
    .optional(),

  notes: z.string()
    .max(1000, 'Notatki nie mogą przekraczać 1000 znaków')
    .optional()
    .or(z.literal('')),

  customerType: z.enum(['client', 'supplier', 'cooperator'], {
    message: 'Musisz wybrać typ kontrahenta',
  }),
} as const

// Pre-built composite schemas
export const customerSchema = z.object({
  type: validators.customerType,
  name: validators.name,
  email: validators.email,
  phone: validators.phone,
  nip: validators.nip,
  street: validators.street,
  city: validators.city,
  postal_code: validators.postalCode,
  country: validators.country,
  notes: validators.notes,
})

export type CustomerFormData = z.infer<typeof customerSchema>

export const quickCustomerSchema = z.object({
  name: validators.name,
  email: validators.email,
  phone: validators.phone,
  nip: validators.nip,
})

export type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>
