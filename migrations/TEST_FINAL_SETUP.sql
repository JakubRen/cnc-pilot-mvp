-- =========================================
-- FINAL SETUP: TRIGGERY + TEST USER
-- =========================================
-- Uruchom to w TEST SQL Editor - WSZYSTKO NARAZ
-- =========================================

-- =====================================
-- CZĘŚĆ 1: KLUCZOWE TRIGGERY
-- =====================================

-- TRIGGER 1: handle_new_user (KRYTYCZNY!)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- TRIGGER 2: calculate_time_log_cost
DROP TRIGGER IF EXISTS calculate_cost_trigger ON public.time_logs;
CREATE TRIGGER calculate_cost_trigger
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_time_log_cost();

-- TRIGGER 3: check_single_active_timer
DROP TRIGGER IF EXISTS check_active_timer ON public.time_logs;
CREATE TRIGGER check_active_timer
  BEFORE INSERT OR UPDATE ON public.time_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.check_single_active_timer();

-- TRIGGER 4: update timestamps (orders)
DROP TRIGGER IF EXISTS update_orders_timestamp ON public.orders;
CREATE TRIGGER update_orders_timestamp
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- TRIGGER 5: update timestamps (inventory)
DROP TRIGGER IF EXISTS update_inventory_timestamp ON public.inventory;
CREATE TRIGGER update_inventory_timestamp
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- TRIGGER 6: update timestamps (users)
DROP TRIGGER IF EXISTS update_users_timestamp ON public.users;
CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =====================================
-- CZĘŚĆ 2: TEST COMPANY + USER
-- =====================================

-- Utwórz test company
INSERT INTO public.companies (id, name, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Test Company',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Whitelist domeny cnc-pilot.pl
INSERT INTO public.company_email_domains (company_id, email_domain, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'cnc-pilot.pl',
  NOW()
)
ON CONFLICT DO NOTHING;

-- Jeśli user test@cnc-pilot.pl już istnieje w auth.users, dodaj do public.users
INSERT INTO public.users (auth_id, email, full_name, role, company_id, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Test User'),
  'owner',
  '00000000-0000-0000-0000-000000000001'::UUID,
  NOW()
FROM auth.users au
WHERE au.email = 'test@cnc-pilot.pl'
ON CONFLICT (auth_id) DO UPDATE
SET
  company_id = '00000000-0000-0000-0000-000000000001'::UUID,
  role = 'owner';

-- =====================================
-- GOTOWE! ✅
-- =====================================
-- Teraz możesz:
-- 1. Zalogować się jako test@cnc-pilot.pl / test123456
-- 2. Uruchomić testy E2E
-- =====================================
