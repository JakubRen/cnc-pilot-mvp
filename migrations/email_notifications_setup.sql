-- ============================================
-- MIGRACJA: EMAIL NOTIFICATIONS - CNC-Pilot
-- ============================================
-- Data: 2024-12-02
-- Opis: Tabele dla systemu powiadomień email
-- ============================================

-- ============================================
-- 1. PREFERENCJE POWIADOMIEŃ UŻYTKOWNIKA
-- ============================================

-- Dodaj kolumnę preferencji powiadomień do users (jeśli nie istnieje)
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "email_enabled": true,
  "order_created": true,
  "order_status_changed": true,
  "deadline_approaching": true,
  "deadline_days_before": 3,
  "low_stock_alert": true,
  "team_changes": true,
  "daily_summary": false,
  "weekly_report": false
}'::jsonb;

COMMENT ON COLUMN users.notification_preferences IS 'Preferencje powiadomień email użytkownika';

-- ============================================
-- 2. LOGI WYSŁANYCH EMAILI
-- ============================================

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  sent_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_email_logs_company ON email_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);

-- RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_logs_select_own_company" ON email_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "email_logs_insert_own_company" ON email_logs
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

COMMENT ON TABLE email_logs IS 'Historia wysłanych powiadomień email';

-- ============================================
-- 3. KOLEJKA ZAPLANOWANYCH POWIADOMIEŃ
-- ============================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_company ON email_queue(company_id);

-- RLS
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_queue_company_access" ON email_queue
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

COMMENT ON TABLE email_queue IS 'Kolejka zaplanowanych powiadomień email';

-- ============================================
-- 4. FUNKCJA: POBIERZ UŻYTKOWNIKÓW DO POWIADOMIENIA
-- ============================================

CREATE OR REPLACE FUNCTION get_notification_recipients(
  p_company_id UUID,
  p_notification_type TEXT,
  p_exclude_user_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  user_id BIGINT,
  email TEXT,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.full_name
  FROM users u
  WHERE u.company_id = p_company_id
    AND u.role NOT IN ('pending', 'viewer')
    AND (p_exclude_user_id IS NULL OR u.id != p_exclude_user_id)
    AND (u.notification_preferences->>'email_enabled')::boolean = true
    AND COALESCE((u.notification_preferences->>p_notification_type)::boolean, true) = true;
END;
$$;

COMMENT ON FUNCTION get_notification_recipients IS 'Pobiera listę użytkowników do powiadomienia na podstawie typu i preferencji';

-- ============================================
-- 5. FUNKCJA: SPRAWDŹ ZBLIŻAJĄCE SIĘ DEADLINY
-- ============================================

CREATE OR REPLACE FUNCTION check_approaching_deadlines()
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  customer_name TEXT,
  deadline DATE,
  days_remaining INTEGER,
  company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.customer_name,
    o.deadline,
    (o.deadline - CURRENT_DATE)::INTEGER as days_remaining,
    o.company_id
  FROM orders o
  WHERE o.deadline IS NOT NULL
    AND o.status NOT IN ('completed', 'cancelled')
    AND o.deadline >= CURRENT_DATE
    AND o.deadline <= CURRENT_DATE + INTERVAL '7 days'
  ORDER BY o.deadline ASC;
END;
$$;

COMMENT ON FUNCTION check_approaching_deadlines IS 'Zwraca zamówienia z deadline w ciągu 7 dni';

-- ============================================
-- 6. FUNKCJA: SPRAWDŹ NISKIE STANY MAGAZYNOWE
-- ============================================

CREATE OR REPLACE FUNCTION check_low_stock_items()
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  current_quantity NUMERIC,
  threshold NUMERIC,
  unit TEXT,
  company_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.quantity,
    i.low_stock_threshold,
    i.unit,
    i.company_id
  FROM inventory i
  WHERE i.low_stock_threshold IS NOT NULL
    AND i.quantity <= i.low_stock_threshold
  ORDER BY (i.quantity / NULLIF(i.low_stock_threshold, 0)) ASC;
END;
$$;

COMMENT ON FUNCTION check_low_stock_items IS 'Zwraca pozycje magazynowe poniżej progu minimalnego';

-- ============================================
-- 7. TRIGGER: POWIADOMIENIE O ZMIANIE STATUSU
-- ============================================

-- Funkcja do zapisu do kolejki powiadomień przy zmianie statusu
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recipient RECORD;
BEGIN
  -- Tylko przy zmianie statusu
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Dodaj do kolejki dla każdego odbiorcy
    FOR v_recipient IN
      SELECT * FROM get_notification_recipients(NEW.company_id, 'order_status_changed', NULL)
    LOOP
      INSERT INTO email_queue (
        company_id,
        email_type,
        recipient_email,
        recipient_user_id,
        payload,
        scheduled_for
      ) VALUES (
        NEW.company_id,
        'order_status_changed',
        v_recipient.email,
        v_recipient.user_id,
        jsonb_build_object(
          'orderNumber', NEW.order_number,
          'customerName', NEW.customer_name,
          'oldStatus', OLD.status,
          'newStatus', NEW.status
        ),
        NOW() -- natychmiast
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Utwórz trigger (tylko jeśli nie istnieje)
DROP TRIGGER IF EXISTS order_status_change_notification ON orders;
CREATE TRIGGER order_status_change_notification
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_order_status_change();

-- ============================================
-- 8. WIDOK: STATYSTYKI POWIADOMIEŃ
-- ============================================

CREATE OR REPLACE VIEW email_statistics AS
SELECT
  company_id,
  email_type,
  DATE(created_at) as date,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as failed
FROM email_logs
GROUP BY company_id, email_type, DATE(created_at);

COMMENT ON VIEW email_statistics IS 'Statystyki wysyłki emaili per firma i typ';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON email_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_recipients TO authenticated;
GRANT EXECUTE ON FUNCTION check_approaching_deadlines TO authenticated;
GRANT EXECUTE ON FUNCTION check_low_stock_items TO authenticated;

-- ============================================
-- KONIEC MIGRACJI
-- ============================================
