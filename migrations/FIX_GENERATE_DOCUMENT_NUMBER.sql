-- ============================================
-- FIX: Ensure generate_document_number function exists in TEST database
-- Run this in Supabase Studio → SQL Editor (TEST database)
-- ============================================

-- 1. Create document_type ENUM if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM ('PW', 'RW', 'WZ');
    END IF;
END$$;

-- 2. Create or replace the function
CREATE OR REPLACE FUNCTION public.generate_document_number(p_company_id uuid, p_document_type document_type)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
  DECLARE
    v_year TEXT;
    v_counter INTEGER;
    v_document_number TEXT;
  BEGIN
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;

    -- Znajdź ostatni numer dla tego typu i roku
    SELECT COUNT(*) + 1 INTO v_counter
    FROM warehouse_documents
    WHERE company_id = p_company_id
      AND document_type = p_document_type
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

    -- Format: PW/001/2025
    v_document_number := p_document_type::TEXT || '/' || LPAD(v_counter::TEXT, 3, '0') || '/' || v_year;

    RETURN v_document_number;
  END;
$function$;

-- 3. Test the function
SELECT generate_document_number('00000000-0000-0000-0000-000000000000'::uuid, 'PW'::document_type);
