-- ============================================
-- DAY_19 COMPLETE SYSTEM MIGRATIONS
-- Notifications, Audit Logs, Company Settings
-- ============================================

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,

  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company_id ON notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- ============================================
-- 2. AUDIT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'login', 'logout'
  entity_type TEXT NOT NULL, -- 'order', 'inventory', 'user', 'document', etc.
  entity_id TEXT,

  changes JSONB, -- old vs new values: {"old": {...}, "new": {...}}
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's audit logs"
  ON audit_logs
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- ============================================
-- 3. COMPANY SETTINGS (extend companies table)
-- ============================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Warsaw';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PLN';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pl';

-- ============================================
-- 4. ADD total_cost TO orders (if missing)
-- ============================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id BIGINT,
  p_company_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, company_id, type, title, message, link)
  VALUES (p_user_id, p_company_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all user notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE user_id = p_user_id AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id BIGINT,
  p_company_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, changes, ip_address, user_agent)
  VALUES (p_user_id, p_company_id, p_action, p_entity_type, p_entity_id, p_changes, p_ip_address, p_user_agent)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. ALERT RULES (automatically create notifications)
-- ============================================

-- Check for low stock items
CREATE OR REPLACE FUNCTION check_low_stock_alerts()
RETURNS void AS $$
DECLARE
  item RECORD;
  user_rec RECORD;
BEGIN
  -- For each company's low stock items
  FOR item IN
    SELECT i.*, c.id as company_id
    FROM inventory i
    JOIN companies c ON i.company_id = c.id
    WHERE i.quantity < i.low_stock_threshold
  LOOP
    -- Create notification for all managers/owners in that company
    FOR user_rec IN
      SELECT id FROM users
      WHERE company_id = item.company_id
      AND role IN ('owner', 'admin', 'manager')
    LOOP
      -- Check if notification already exists (don't spam)
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = user_rec.id
        AND type = 'warning'
        AND title LIKE '%Niski stan%'
        AND link = '/inventory/' || item.id::TEXT
        AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM create_notification(
          user_rec.id,
          item.company_id,
          'warning',
          'Niski stan magazynowy: ' || item.name,
          'Stan: ' || item.quantity || ' ' || item.unit || ' (próg: ' || item.low_stock_threshold || ')',
          '/inventory/' || item.id::TEXT
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check for overdue orders
CREATE OR REPLACE FUNCTION check_overdue_alerts()
RETURNS void AS $$
DECLARE
  order_rec RECORD;
  user_rec RECORD;
BEGIN
  -- For each overdue order
  FOR order_rec IN
    SELECT *
    FROM orders
    WHERE status != 'completed'
    AND deadline < CURRENT_DATE
  LOOP
    -- Create notification for managers/owners
    FOR user_rec IN
      SELECT id FROM users
      WHERE company_id = order_rec.company_id
      AND role IN ('owner', 'admin', 'manager')
    LOOP
      -- Check if notification already exists
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = user_rec.id
        AND type = 'error'
        AND title LIKE '%Przeterminowane%'
        AND link = '/orders/' || order_rec.id::TEXT
        AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM create_notification(
          user_rec.id,
          order_rec.company_id,
          'error',
          'Przeterminowane zamówienie: ' || order_rec.order_number,
          'Klient: ' || order_rec.customer_name || ' | Deadline: ' || order_rec.deadline::TEXT,
          '/orders/' || order_rec.id::TEXT
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check for stale timers (running > 12 hours)
CREATE OR REPLACE FUNCTION check_stale_timer_alerts()
RETURNS void AS $$
DECLARE
  timer_rec RECORD;
  user_rec RECORD;
BEGIN
  -- For each stale timer
  FOR timer_rec IN
    SELECT *
    FROM time_logs
    WHERE status = 'running'
    AND start_time < NOW() - INTERVAL '12 hours'
  LOOP
    -- Notify the user who owns the timer
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = timer_rec.user_id
      AND type = 'warning'
      AND title LIKE '%Timer%'
      AND created_at > NOW() - INTERVAL '12 hours'
    ) THEN
      PERFORM create_notification(
        timer_rec.user_id,
        timer_rec.company_id,
        'warning',
        'Timer działa od ' || EXTRACT(EPOCH FROM (NOW() - timer_rec.start_time)) / 3600 || ' godzin',
        'Czy zapomniałeś zatrzymać timer?',
        '/time-tracking'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Master function to run all alert checks
CREATE OR REPLACE FUNCTION run_alert_checks()
RETURNS void AS $$
BEGIN
  PERFORM check_low_stock_alerts();
  PERFORM check_overdue_alerts();
  PERFORM check_stale_timer_alerts();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE notifications IS 'User notifications for alerts and system messages';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all user actions';
COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications';
COMMENT ON FUNCTION check_low_stock_alerts IS 'Creates notifications for low stock items (run hourly)';
COMMENT ON FUNCTION check_overdue_alerts IS 'Creates notifications for overdue orders (run daily)';
COMMENT ON FUNCTION check_stale_timer_alerts IS 'Creates notifications for stale timers (run hourly)';
COMMENT ON FUNCTION run_alert_checks IS 'Master function to run all alert checks';

-- ============================================
-- 8. INITIAL DATA (optional)
-- ============================================

-- You can manually test alerts:
-- SELECT run_alert_checks();

-- ============================================
-- DONE!
-- ============================================

-- To test:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Manually trigger alerts: SELECT run_alert_checks();
-- 3. Check notifications table: SELECT * FROM notifications;
-- 4. Set up a cron job (Supabase Edge Functions) to run run_alert_checks() hourly
