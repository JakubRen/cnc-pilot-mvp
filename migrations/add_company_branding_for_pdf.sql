-- ============================================
-- Migration: Add company branding fields for PDF export
-- ============================================
-- Columns already present (from day19_complete_system.sql):
--   logo_url, address, phone, email, timezone, currency, language
--
-- New columns needed for PDF invoices/quotes:
--   nip          — Polish tax ID (NIP)
--   bank_account — bank account number for payments
--   website      — company website URL

ALTER TABLE companies ADD COLUMN IF NOT EXISTS nip TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
