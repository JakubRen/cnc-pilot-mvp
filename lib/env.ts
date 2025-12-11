// ============================================
// lib/env.ts
// Environment variables validation using Zod
// ============================================

import { z } from 'zod'

/**
 * Environment variables schema
 * Validates all required environment variables on application startup
 */
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // App Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),

  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),

  // AI/OpenAI (optional)
  OPENAI_API_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validated environment variables
 * Throws error on startup if validation fails
 */
export const env = envSchema.parse(process.env)
