-- migrations/create_blocked_email_domains.sql
-- Day 10: Multi-Tenancy - Blocked Public Email Domains

-- Tabela z publicznymi domenami email, które są zablokowane
-- (użytkownicy muszą używać firmowych adresów email)
CREATE TABLE IF NOT EXISTS blocked_email_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT DEFAULT 'Public email provider',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Najpopularniejsze publiczne domeny w Polsce i na świecie
INSERT INTO blocked_email_domains (domain, reason) VALUES
  ('gmail.com', 'Public email provider - Google'),
  ('googlemail.com', 'Public email provider - Google'),
  ('yahoo.com', 'Public email provider - Yahoo'),
  ('yahoo.co.uk', 'Public email provider - Yahoo'),
  ('hotmail.com', 'Public email provider - Microsoft'),
  ('hotmail.co.uk', 'Public email provider - Microsoft'),
  ('outlook.com', 'Public email provider - Microsoft'),
  ('live.com', 'Public email provider - Microsoft'),
  ('wp.pl', 'Public email provider - Polska'),
  ('o2.pl', 'Public email provider - Polska'),
  ('interia.pl', 'Public email provider - Polska'),
  ('onet.pl', 'Public email provider - Polska'),
  ('interia.eu', 'Public email provider - Polska'),
  ('icloud.com', 'Public email provider - Apple'),
  ('me.com', 'Public email provider - Apple'),
  ('proton.me', 'Public email provider - Proton'),
  ('protonmail.com', 'Public email provider - Proton'),
  ('protonmail.ch', 'Public email provider - Proton'),
  ('aol.com', 'Public email provider - AOL'),
  ('mail.com', 'Public email provider - Mail.com'),
  ('yandex.com', 'Public email provider - Yandex'),
  ('zoho.com', 'Public email provider - Zoho')
ON CONFLICT (domain) DO NOTHING;

-- Komentarze
COMMENT ON TABLE blocked_email_domains IS 'Lista zablokowanych publicznych domen email - użytkownicy muszą używać firmowych adresów';
COMMENT ON COLUMN blocked_email_domains.domain IS 'Zablokowana domena (np. "gmail.com")';
COMMENT ON COLUMN blocked_email_domains.reason IS 'Powód blokady';
