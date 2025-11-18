-- ============================================
-- DASHBOARD PREFERENCES
-- DAY_18 - Dashboard Personalization
-- Preferencje widoczności widgetów na dashboardzie
-- ============================================

-- Dodaj kolumnę dashboard_preferences do tabeli users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{
  "metricCards": true,
  "urgentTasks": true,
  "productionPlan": true,
  "topCustomers": true,
  "ordersChart": true,
  "activityFeed": true
}'::jsonb;

-- Dodaj index dla szybszego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_users_dashboard_preferences
ON users USING GIN (dashboard_preferences);

-- Dodaj comment
COMMENT ON COLUMN users.dashboard_preferences IS 'Preferencje widoczności widgetów na dashboardzie użytkownika';

-- ============================================
-- DOMYŚLNE PREFERENCJE PER ROLA (opcjonalnie)
-- ============================================

-- Możemy ustawić różne domyślne preferencje dla różnych ról
-- Na razie wszystko włączone dla wszystkich

-- Operator (focused na produkcję):
-- UPDATE users SET dashboard_preferences = '{
--   "metricCards": true,
--   "urgentTasks": true,
--   "productionPlan": true,
--   "topCustomers": false,
--   "ordersChart": false,
--   "activityFeed": false
-- }'::jsonb WHERE role = 'operator';

-- Manager (overview):
-- UPDATE users SET dashboard_preferences = '{
--   "metricCards": true,
--   "urgentTasks": true,
--   "productionPlan": true,
--   "topCustomers": true,
--   "ordersChart": true,
--   "activityFeed": true
-- }'::jsonb WHERE role IN ('manager', 'admin', 'owner');

-- ============================================
-- FUNKCJA POMOCNICZA - Reset preferencji
-- ============================================

CREATE OR REPLACE FUNCTION reset_dashboard_preferences(user_id_param BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET dashboard_preferences = '{
    "metricCards": true,
    "urgentTasks": true,
    "productionPlan": true,
    "topCustomers": true,
    "ordersChart": true,
    "activityFeed": true
  }'::jsonb
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_dashboard_preferences IS 'Resetuje preferencje dashboardu użytkownika do domyślnych wartości';
