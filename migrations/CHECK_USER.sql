-- Sprawdź czy user test@cnc-pilot.pl ma wpis w public.users z company_id

SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.company_id,
  u.auth_id,
  c.name as company_name
FROM public.users u
LEFT JOIN public.companies c ON u.company_id = c.id
WHERE u.email = 'test@cnc-pilot.pl';
