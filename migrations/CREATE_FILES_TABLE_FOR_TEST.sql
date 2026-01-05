-- =====================================================
-- CREATE FILES TABLE FOR TEST DATABASE
-- =====================================================
-- Date: 2026-01-04
-- Purpose: Production details page fails because it JOINs to files table
--          which doesn't exist in TEST database
-- =====================================================

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view files from their company
CREATE POLICY "Users can view company files"
  ON files FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Policy: Users can create files for their company
CREATE POLICY "Users can create files"
  ON files FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- Add index
CREATE INDEX IF NOT EXISTS idx_files_company ON files(company_id);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'FILES TABLE CREATED FOR TEST DATABASE';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ Table: files';
  RAISE NOTICE '✅ RLS: enabled';
  RAISE NOTICE '✅ Policies: 2 (SELECT, INSERT)';
  RAISE NOTICE '==========================================';
END $$;
