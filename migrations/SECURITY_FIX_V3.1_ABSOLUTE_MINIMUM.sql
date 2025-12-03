-- ============================================
-- SECURITY FIX V3.1 - ABSOLUTE MINIMUM
-- No fancy features. Just the bare minimum.
-- ============================================

-- Enable RLS on tables
ALTER TABLE company_email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Public can read blocked domains" ON blocked_email_domains;
DROP POLICY IF EXISTS "Only admins can manage blocked domains" ON blocked_email_domains;

-- Create policies
CREATE POLICY "Public can read blocked domains"
ON blocked_email_domains
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage blocked domains"
ON blocked_email_domains
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM users
    WHERE auth_id = auth.uid()
      AND role = 'admin'
  )
);

-- Done.
-- Check results with:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('company_email_domains', 'blocked_email_domains');
