-- migrations/create_company_email_domains.sql
-- Day 10: Multi-Tenancy - Email Domain-Based Identification

-- Tabela do przechowywania domen email przypisanych do firm
CREATE TABLE IF NOT EXISTS company_email_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email_domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Index dla szybkiego wyszukiwania domeny (najczęstsze zapytanie)
CREATE INDEX idx_company_email_domains_domain ON company_email_domains(email_domain);

-- Index dla wyszukiwania wszystkich domen firmy
CREATE INDEX idx_company_email_domains_company ON company_email_domains(company_id);

-- RLS (Row Level Security)
ALTER TABLE company_email_domains ENABLE ROW LEVEL SECURITY;

-- Policy: Users mogą tylko czytać domeny swojej firmy
CREATE POLICY "Users can view their company domains"
  ON company_email_domains FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Policy: Tylko admin może dodawać/usuwać domeny
CREATE POLICY "Only admins can manage domains"
  ON company_email_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE auth_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Komentarze do tabeli
COMMENT ON TABLE company_email_domains IS 'Domeny email przypisane do firm - używane do automatycznego przypisywania użytkowników';
COMMENT ON COLUMN company_email_domains.email_domain IS 'Domena email (np. "firma.pl")';
COMMENT ON COLUMN company_email_domains.company_id IS 'ID firmy do której przypisana jest domena';
