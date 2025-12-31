-- Add test company to TEST database
INSERT INTO companies (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Company',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT * FROM companies;
