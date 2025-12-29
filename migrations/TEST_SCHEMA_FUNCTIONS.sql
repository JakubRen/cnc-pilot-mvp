-- =========================================
-- CUSTOM FUNCTIONS FROM PROD
-- =========================================
-- 56 custom PL/pgSQL functions
-- Pominięte: 10 funkcji z pg_trgm extension (LANGUAGE c)
-- =========================================

CREATE OR REPLACE FUNCTION public.calculate_order_labor_cost(p_order_id uuid)
 RETURNS TABLE(total_hours numeric, total_cost numeric, log_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_hours NUMERIC := 0;
  v_cost NUMERIC := 0;
  v_count INTEGER := 0;
BEGIN
  SELECT
    COALESCE(SUM(
      EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600
    ), 0),
    COALESCE(SUM(
      (EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)) / 3600) * COALESCE(hourly_rate, 150)
    ), 0),
    COUNT(*)::INTEGER
  INTO v_hours, v_cost, v_count
  FROM time_logs
  WHERE order_id = p_order_id
    AND status IN ('completed', 'running');

  RETURN QUERY SELECT v_hours, v_cost, v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_quote_price_per_unit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.quantity > 0 THEN
    NEW.price_per_unit = NEW.total_price / NEW.quantity;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_time_log_cost()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
    -- If end_time is set, calculate duration
    IF NEW.end_time IS NOT NULL AND NEW.start_time IS NOT NULL THEN
      NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time))::INT;
    END IF;

    -- Calculate cost based on duration and rate
    IF NEW.duration_seconds > 0 AND NEW.hourly_rate > 0 THEN
      NEW.total_cost := (NEW.duration_seconds::NUMERIC / 3600) * NEW.hourly_rate;
    END IF;

    -- Update timestamp
    NEW.updated_at := NOW();

    RETURN NEW;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.check_approaching_deadlines()
 RETURNS TABLE(order_id uuid, order_number text, customer_name text, deadline date, days_remaining integer, company_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_low_stock_alerts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    item RECORD;
    user_rec RECORD;
  BEGIN
    -- Znajdź produkty z niskim stanem
    FOR item IN
      SELECT i.*, c.id as company_id
      FROM inventory i
      JOIN companies c ON i.company_id = c.id
      WHERE i.quantity < i.low_stock_threshold
    LOOP
      -- Dla każdego managera/admina/ownera w firmie
      FOR user_rec IN
        SELECT id FROM users
        WHERE company_id = item.company_id
        AND role IN ('owner', 'admin', 'manager')
      LOOP
        -- Sprawdź czy nie wysłaliśmy już powiadomienia w ciągu ostatnich 24h
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
            'Niski stan magazynowy',
            'Produkt "' || item.name || '" (SKU: ' || item.sku || ') ma niski stan: ' || item.quantity || ' ' || item.unit,
            '/inventory/' || item.id::TEXT
          );
        END IF;
      END LOOP;
    END LOOP;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.check_low_stock_items()
 RETURNS TABLE(item_id uuid, item_name text, current_quantity numeric, threshold numeric, unit text, company_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_overdue_alerts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    order_rec RECORD;
    user_rec RECORD;
  BEGIN
    -- Znajdź zaległe zamówienia
    FOR order_rec IN
      SELECT o.*, c.id as company_id
      FROM orders o
      JOIN companies c ON o.company_id = c.id
      WHERE o.deadline < NOW()
      AND o.status NOT IN ('completed', 'cancelled')
    LOOP
      -- Powiadom osobę która stworzyła zamówienie + managerów
      FOR user_rec IN
        SELECT DISTINCT id FROM users
        WHERE company_id = order_rec.company_id
        AND (
          id = order_rec.created_by
          OR role IN ('owner', 'admin', 'manager')
        )
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM notifications
          WHERE user_id = user_rec.id
          AND type = 'error'
          AND title LIKE '%Zaległe zamówienie%'
          AND link = '/orders/' || order_rec.id::TEXT
          AND created_at > NOW() - INTERVAL '24 hours'
        ) THEN
          PERFORM create_notification(
            user_rec.id,
            order_rec.company_id,
            'error',
            'Zaległe zamówienie',
            'Zamówienie #' || order_rec.order_number || ' dla klienta "' || order_rec.customer_name || '" jest po deadline!',
            '/orders/' || order_rec.id::TEXT
          );
        END IF;
      END LOOP;
    END LOOP;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.check_single_active_timer()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
    active_count INT;
  BEGIN
    -- Only check if status is running or paused
    IF NEW.status IN ('running', 'paused') THEN
      SELECT COUNT(*) INTO active_count
      FROM time_logs
      WHERE user_id = NEW.user_id
        AND company_id = NEW.company_id
        AND status IN ('running', 'paused')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

      IF active_count > 0 THEN
        RAISE EXCEPTION 'User already has an active timer. Please stop the current timer first.';
      END IF;
    END IF;

    RETURN NEW;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.check_stale_timer_alerts()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    timer_rec RECORD;
  BEGIN
    -- Znajdź timery aktywne ponad 12h
    FOR timer_rec IN
      SELECT t.*, u.id as user_id, u.company_id
      FROM time_logs t
      JOIN users u ON t.user_id = u.id
      WHERE t.status = 'running'
      AND t.start_time < NOW() - INTERVAL '12 hours'
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = timer_rec.user_id
        AND type = 'warning'
        AND title LIKE '%Timer aktywny%'
        AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM create_notification(
          timer_rec.user_id,
          timer_rec.company_id,
          'warning',
          'Timer aktywny ponad 12h',
          'Masz aktywny timer od ' ||
          EXTRACT(EPOCH FROM (NOW() - timer_rec.start_time))/3600 || ' godzin. Czy zapomniałeś go zatrzymać?',
          '/time-tracking'
        );
      END IF;
    END LOOP;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id bigint, p_company_id uuid, p_type text, p_title text, p_message text DEFAULT NULL::text, p_link text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    new_notification_id UUID;
  BEGIN
    INSERT INTO notifications (user_id, company_id, type, title, message, link)
    VALUES (p_user_id, p_company_id, p_type, p_title, p_message, p_link)
    RETURNING id INTO new_notification_id;

    RETURN new_notification_id;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.estimate_operation_times(p_operation_type text, p_complexity text, p_material text DEFAULT 'steel'::text)
 RETURNS TABLE(setup_time_minutes integer, run_time_per_unit_minutes numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Bazowe czasy dla różnych operacji
  -- To są PRZYKŁADOWE wartości - powinny być dostosowane do rzeczywistych danych

  RETURN QUERY
  SELECT
    CASE
      -- MILLING (Frezowanie)
      WHEN p_operation_type = 'milling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 15    -- 15 min setup
          WHEN 'medium' THEN 30    -- 30 min setup
          WHEN 'complex' THEN 60   -- 60 min setup
          ELSE 30
        END

      -- TURNING (Toczenie)
      WHEN p_operation_type = 'turning' THEN
        CASE p_complexity
          WHEN 'simple' THEN 10
          WHEN 'medium' THEN 20
          WHEN 'complex' THEN 45
          ELSE 20
        END

      -- DRILLING (Wiercenie)
      WHEN p_operation_type = 'drilling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 5
          WHEN 'medium' THEN 10
          WHEN 'complex' THEN 20
          ELSE 10
        END

      -- GRINDING (Szlifowanie)
      WHEN p_operation_type = 'grinding' THEN
        CASE p_complexity
          WHEN 'simple' THEN 20
          WHEN 'medium' THEN 35
          WHEN 'complex' THEN 50
          ELSE 35
        END

      -- CUTTING (Cięcie)
      WHEN p_operation_type = 'cutting' THEN
        CASE p_complexity
          WHEN 'simple' THEN 5
          WHEN 'medium' THEN 10
          WHEN 'complex' THEN 15
          ELSE 10
        END

      -- Domyślnie
      ELSE 15
    END AS setup_time_minutes,

    CASE
      -- MILLING (Frezowanie)
      WHEN p_operation_type = 'milling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 3.0::NUMERIC    -- 3 min/szt
          WHEN 'medium' THEN 8.0::NUMERIC    -- 8 min/szt
          WHEN 'complex' THEN 20.0::NUMERIC  -- 20 min/szt
          ELSE 8.0::NUMERIC
        END

      -- TURNING (Toczenie)
      WHEN p_operation_type = 'turning' THEN
        CASE p_complexity
          WHEN 'simple' THEN 2.0::NUMERIC
          WHEN 'medium' THEN 6.0::NUMERIC
          WHEN 'complex' THEN 15.0::NUMERIC
          ELSE 6.0::NUMERIC
        END

      -- DRILLING (Wiercenie)
      WHEN p_operation_type = 'drilling' THEN
        CASE p_complexity
          WHEN 'simple' THEN 1.0::NUMERIC
          WHEN 'medium' THEN 2.5::NUMERIC
          WHEN 'complex' THEN 5.0::NUMERIC
          ELSE 2.5::NUMERIC
        END

      -- GRINDING (Szlifowanie)
      WHEN p_operation_type = 'grinding' THEN
        CASE p_complexity
          WHEN 'simple' THEN 5.0::NUMERIC
          WHEN 'medium' THEN 12.0::NUMERIC
          WHEN 'complex' THEN 25.0::NUMERIC
          ELSE 12.0::NUMERIC
        END

      -- CUTTING (Cięcie)
      WHEN p_operation_type = 'cutting' THEN
        CASE p_complexity
          WHEN 'simple' THEN 0.5::NUMERIC
          WHEN 'medium' THEN 1.5::NUMERIC
          WHEN 'complex' THEN 3.0::NUMERIC
          ELSE 1.5::NUMERIC
        END

      -- Domyślnie
      ELSE 5.0::NUMERIC
    END AS run_time_per_unit_minutes;
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_stale_timers(hours_threshold integer DEFAULT 12)
 RETURNS TABLE(timer_id uuid, user_name text, order_number text, hours_running numeric, company_id uuid)
 LANGUAGE plpgsql
AS $function$
  BEGIN
    RETURN QUERY
    SELECT
      tl.id,
      u.full_name,
      o.order_number,
      ROUND(EXTRACT(EPOCH FROM (NOW() - tl.start_time)) / 3600, 2) AS hours_running,
      tl.company_id
    FROM time_logs tl
    JOIN users u ON tl.user_id = u.id
    JOIN orders o ON tl.order_id = o.id
    WHERE tl.status = 'running'
      AND tl.start_time < NOW() - (hours_threshold || ' hours')::INTERVAL
    ORDER BY tl.start_time ASC;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.generate_audit_description(p_table_name text, p_action text, p_old_data jsonb, p_new_data jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
  DECLARE
    v_description TEXT;
    v_identifier TEXT;
  BEGIN
    v_identifier := COALESCE(
      p_new_data->>'order_number',
      p_new_data->>'name',
      p_new_data->>'sku',
      p_old_data->>'order_number',
      p_old_data->>'name',
      p_old_data->>'sku',
      'rekord'
    );

    CASE p_action
      WHEN 'INSERT' THEN
        v_description := 'Utworzono ' || p_table_name || ': ' || v_identifier;
      WHEN 'UPDATE' THEN
        v_description := 'Zaktualizowano ' || p_table_name || ': ' || v_identifier;
      WHEN 'DELETE' THEN
        v_description := 'Usunięto ' || p_table_name || ': ' || v_identifier;
      ELSE
        v_description := p_action || ' na ' || p_table_name;
    END CASE;

    RETURN v_description;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.generate_carbon_report_number(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM carbon_reports
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'CO2-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_customer_number(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_customer_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count customers for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM customers
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into customer number: CUS-2025-0001
  v_customer_number := 'CUS-' || v_year || '-' || v_number;

  RETURN v_customer_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_document_number(p_company_id uuid, p_document_type document_type)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
  DECLARE
    v_year TEXT;
    v_counter INTEGER;
    v_document_number TEXT;
  BEGIN
    v_year := EXTRACT(YEAR FROM NOW())::TEXT;

    -- Znajdź ostatni numer dla tego typu i roku
    SELECT COUNT(*) + 1 INTO v_counter
    FROM warehouse_documents
    WHERE company_id = p_company_id
      AND document_type = p_document_type
      AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

    -- Format: PW/001/2025
    v_document_number := p_document_type::TEXT || '/' || LPAD(v_counter::TEXT, 3, '0') || '/' || v_year;

    RETURN v_document_number;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.generate_inventory_sku(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_sku TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count inventory items for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM inventory
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number (0001, 0002, etc.)
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into SKU: SKU-2025-0001
  v_sku := 'SKU-' || v_year || '-' || v_number;

  RETURN v_sku;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_operation_number(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_year TEXT;
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM external_operations
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  RETURN 'EXT-' || v_year || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_order_number(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_order_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count orders for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM orders
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number (0001, 0002, etc.)
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into order number: ORD-2025-0001
  v_order_number := 'ORD-' || v_year || '-' || v_number;

  RETURN v_order_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_production_plan_number(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_plan_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count production plans for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM production_plans
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into plan number: PP-2025-0001
  v_plan_number := 'PP-' || v_year || '-' || v_number;

  RETURN v_plan_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_qc_report_number(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_qc_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count QC reports for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM quality_inspections
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into QC number: QC-2025-0001
  v_qc_number := 'QC-' || v_year || '-' || v_number;

  RETURN v_qc_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_quote_number(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count INTEGER;
  v_year TEXT;
  v_number TEXT;
  v_quote_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Count quotes for this company in current year
  SELECT COUNT(*) INTO v_count
  FROM quotes
  WHERE company_id = p_company_id
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  -- Generate padded number (0001, 0002, etc.)
  v_number := LPAD((v_count + 1)::TEXT, 4, '0');

  -- Combine into quote number
  v_quote_number := 'QT-' || v_year || '-' || v_number;

  RETURN v_quote_number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_quote_token()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_audit_statistics(p_company_id uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(table_name text, insert_count bigint, update_count bigint, delete_count bigint, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
    RETURN QUERY
    SELECT
      a.table_name,
      COUNT(*) FILTER (WHERE a.action = 'INSERT'),
      COUNT(*) FILTER (WHERE a.action = 'UPDATE'),
      COUNT(*) FILTER (WHERE a.action = 'DELETE'),
      COUNT(*)
    FROM audit_logs a
    WHERE a.company_id = p_company_id
      AND a.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY a.table_name
    ORDER BY COUNT(*) DESC;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.get_changed_fields(p_old_data jsonb, p_new_data jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
  DECLARE
    v_changed_fields TEXT[] := ARRAY[]::TEXT[];
    v_key TEXT;
  BEGIN
    IF p_old_data IS NULL OR p_new_data IS NULL THEN
      RETURN v_changed_fields;
    END IF;

    FOR v_key IN SELECT jsonb_object_keys(p_new_data)
    LOOP
      IF p_old_data->v_key IS DISTINCT FROM p_new_data->v_key THEN
        v_changed_fields := array_append(v_changed_fields, v_key);
      END IF;
    END LOOP;

    RETURN v_changed_fields;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.get_customer_name(customer_uuid uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT name FROM customers WHERE id = customer_uuid;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
  today DATE := CURRENT_DATE;
  week_ago TIMESTAMP := NOW() - INTERVAL '7 days';
  month_start TIMESTAMP := DATE_TRUNC('month', NOW());
BEGIN
  -- All statistics in ONE query (no network latency between queries)
  SELECT json_build_object(
    -- Total orders (all time)
    'total_orders', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE company_id = p_company_id
    ),

    -- Active orders (in_progress)
    'active_orders', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE company_id = p_company_id
        AND status = 'in_progress'
    ),

    -- Completed this week
    'completed_this_week', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE company_id = p_company_id
        AND status = 'completed'
        AND created_at >= week_ago
    ),

    -- Overdue orders (deadline passed, not completed)
    'overdue_orders', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE company_id = p_company_id
        AND status NOT IN ('completed', 'cancelled')
        AND deadline < today
    ),

    -- Low stock items (quantity below threshold)
    'low_stock_items', (
      SELECT COUNT(*)::INTEGER
      FROM inventory
      WHERE company_id = p_company_id
        AND quantity <= low_stock_threshold
    ),

    -- Active timers (running)
    'active_timers', (
      SELECT COUNT(*)::INTEGER
      FROM time_logs
      WHERE company_id = p_company_id
        AND status = 'running'
    ),

    -- Orders due today
    'orders_due_today', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE company_id = p_company_id
        AND status NOT IN ('completed', 'cancelled')
        AND deadline = today
    ),

    -- Revenue this month (sum of total_cost for completed orders)
    'revenue_this_month', (
      SELECT COALESCE(SUM(total_cost), 0)::NUMERIC
      FROM orders
      WHERE company_id = p_company_id
        AND status = 'completed'
        AND created_at >= month_start
    ),

    -- Pending orders count
    'pending_orders', (
      SELECT COUNT(*)::INTEGER
      FROM orders
      WHERE company_id = p_company_id
        AND status = 'pending'
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_company_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT company_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
  $function$;

CREATE OR REPLACE FUNCTION public.get_notification_recipients(p_company_id uuid, p_notification_type text, p_exclude_user_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(user_id bigint, email text, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_profitability_stats(p_company_id uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(total_orders integer, total_revenue numeric, total_cost numeric, total_profit numeric, avg_margin_percent numeric, profitable_orders integer, unprofitable_orders integer, avg_cost_per_order numeric, total_labor_hours numeric, avg_labor_cost_per_hour numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_orders,
    COALESCE(SUM(selling_price), 0) as total_revenue,
    COALESCE(SUM(actual_total_cost), 0) as total_cost,
    COALESCE(SUM(profit_amount), 0) as total_profit,
    COALESCE(AVG(profit_margin_percent), 0) as avg_margin_percent,
    COUNT(*) FILTER (WHERE profit_amount > 0)::INTEGER as profitable_orders,
    COUNT(*) FILTER (WHERE profit_amount < 0)::INTEGER as unprofitable_orders,
    COALESCE(AVG(actual_total_cost), 0) as avg_cost_per_order,
    COALESCE(SUM(actual_labor_hours), 0) as total_labor_hours,
    CASE
      WHEN SUM(actual_labor_hours) > 0 THEN SUM(actual_labor_cost) / SUM(actual_labor_hours)
      ELSE 0
    END as avg_labor_cost_per_hour
  FROM order_profitability
  WHERE company_id = p_company_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND status != 'cancelled';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_quote_stats(p_company_id uuid)
 RETURNS TABLE(total_quotes bigint, draft_quotes bigint, sent_quotes bigint, accepted_quotes bigint, expired_quotes bigint, total_value numeric, acceptance_rate numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_quotes,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT as draft_quotes,
    COUNT(*) FILTER (WHERE status = 'sent' OR status = 'viewed')::BIGINT as sent_quotes,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT as accepted_quotes,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as expired_quotes,
    COALESCE(SUM(total_price), 0) as total_value,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('sent', 'viewed', 'accepted', 'rejected')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'accepted')::NUMERIC /
        COUNT(*) FILTER (WHERE status IN ('sent', 'viewed', 'accepted', 'rejected'))::NUMERIC * 100,
        2
      )
      ELSE 0
    END as acceptance_rate
  FROM quotes
  WHERE company_id = p_company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_record_history(p_table_name text, p_record_id uuid, p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, action text, old_data jsonb, new_data jsonb, changed_fields text[], description text, user_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
    RETURN QUERY
    SELECT
      a.id,
      a.action,
      a.old_data,
      a.new_data,
      a.changed_fields,
      a.description,
      u.full_name,
      a.created_at
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.table_name = p_table_name
      AND a.record_id = p_record_id
    ORDER BY a.created_at DESC
    LIMIT p_limit;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.get_similar_orders(p_company_id uuid, p_part_name text, p_material text, p_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, order_number text, part_name text, material text, quantity integer, total_cost numeric, actual_hours numeric, created_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.part_name,
    o.material,
    o.quantity,
    o.total_cost,
    o.actual_hours,
    o.created_at,
    o.status
  FROM orders o
  WHERE
    o.company_id = p_company_id
    AND (
        (p_part_name IS NOT NULL AND p_part_name <> '' AND o.part_name ILIKE '%' || p_part_name || '%')
        OR
        (p_material IS NOT NULL AND p_material <> '' AND o.material ILIKE '%' || p_material || '%')
    )
  ORDER BY o.created_at DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_similar_orders_stats(p_company_id uuid, p_part_name text, p_material text)
 RETURNS TABLE(avg_price numeric, min_price numeric, max_price numeric, avg_duration_hours numeric, order_count integer, last_order_date timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(total_cost), 2) as avg_price,
    MIN(total_cost) as min_price,
    MAX(total_cost) as max_price,
    ROUND(AVG(actual_hours), 1) as avg_duration_hours,
    COUNT(*)::INTEGER as order_count,
    MAX(created_at) as last_order_date
  FROM orders
  WHERE
    company_id = p_company_id
    AND status = 'completed' -- Only finished orders count for reliable stats
    AND total_cost > 0       -- Only orders with calculated costs
    AND (
        -- Search logic: If input is provided, match loosely (fuzzy)
        (p_part_name IS NOT NULL AND p_part_name <> '' AND part_name ILIKE '%' || p_part_name || '%')
        OR
        (p_material IS NOT NULL AND p_material <> '' AND material ILIKE '%' || p_material || '%')
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    user_company_id UUID;
    user_email_domain TEXT;
    existing_users_count INT;
    assigned_role TEXT;
  BEGIN
    -- Extract email domain
    user_email_domain := split_part(NEW.email, '@', 2);

    -- Find company_id by email domain
    BEGIN
      SELECT company_id INTO user_company_id
      FROM company_email_domains
      WHERE email_domain = user_email_domain
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      user_company_id := NULL;
    END;

    -- Fallback: If no domain found, try metadata
    IF user_company_id IS NULL THEN
      BEGIN
        user_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
      EXCEPTION WHEN OTHERS THEN
        user_company_id := NULL;
      END;
    END IF;

    -- Determine role: First user in company = 'owner', others = 'pending'
    assigned_role := 'pending';

    IF user_company_id IS NOT NULL THEN
      BEGIN
        SELECT COUNT(*) INTO existing_users_count
        FROM public.users
        WHERE company_id = user_company_id;

        -- If no users exist in this company, make first user 'owner'
        IF existing_users_count = 0 THEN
          assigned_role := 'owner';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        assigned_role := 'pending';
      END;
    END IF;

    -- Insert new user
    BEGIN
      INSERT INTO public.users (
        auth_id,
        email,
        full_name,
        role,
        company_id
      )
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        assigned_role,
        user_company_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    END;

    RETURN NEW;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.has_permission(p_user_id bigint, p_permission_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_role TEXT;
  v_override BOOLEAN;
  v_role_has BOOLEAN;
BEGIN
  -- Pobierz rolę użytkownika
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;

  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Sprawdź nadpisanie dla użytkownika
  SELECT granted INTO v_override
  FROM user_permissions
  WHERE user_id = p_user_id AND permission_code = p_permission_code;

  IF v_override IS NOT NULL THEN
    RETURN v_override;
  END IF;

  -- Sprawdź domyślne uprawnienie roli
  SELECT EXISTS(
    SELECT 1 FROM role_permissions
    WHERE role = v_user_role AND permission_code = p_permission_code
  ) INTO v_role_has;

  RETURN v_role_has;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_inventory_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
    doc_item RECORD;
    inv_item RECORD;
  BEGIN
    -- Tylko dla dokumentów zatwierdzonych (draft -> confirmed)
    IF NEW.status = 'confirmed' AND OLD.status = 'draft' THEN

      -- Dla każdego itemu w dokumencie
      FOR doc_item IN
        SELECT * FROM warehouse_document_items WHERE document_id = NEW.id
      LOOP
        -- Pobierz aktualny stan magazynu (przed zmianą)
        SELECT * INTO inv_item FROM inventory WHERE id = doc_item.inventory_id;

        IF FOUND THEN
          -- Oblicz zmianę w zależności od typu dokumentu
          DECLARE
            quantity_change NUMERIC;
            quantity_after NUMERIC;
          BEGIN
            IF NEW.document_type = 'PW' THEN
              -- Przyjęcie - dodajemy
              quantity_change := doc_item.quantity;
              quantity_after := inv_item.quantity + doc_item.quantity;
            ELSIF NEW.document_type IN ('RW', 'WZ') THEN
              -- Rozchód/Wydanie - odejmujemy
              quantity_change := -doc_item.quantity;
              quantity_after := inv_item.quantity - doc_item.quantity;
            END IF;

            -- Loguj zmianę
            INSERT INTO inventory_history (
              inventory_id,
              company_id,
              document_id,
              document_type,
              document_number,
              quantity_change,
              quantity_before,
              quantity_after,
              changed_by,
              changed_at,
              notes
            ) VALUES (
              doc_item.inventory_id,
              NEW.company_id,
              NEW.id,
              NEW.document_type,
              NEW.document_number,
              quantity_change,
              inv_item.quantity,
              quantity_after,
              NEW.created_by,
              NOW(),
              doc_item.notes
            );
          END;
        END IF;
      END LOOP;
    END IF;

    RETURN NEW;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.log_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_record_id UUID;
    v_company_id UUID;
    v_user_id BIGINT;
    v_action TEXT;
    v_changed_fields TEXT[];
    v_description TEXT;
  BEGIN
    v_action := TG_OP;

    IF TG_OP = 'DELETE' THEN
      v_old_data := to_jsonb(OLD);
      v_new_data := NULL;
      v_record_id := OLD.id;
      v_company_id := OLD.company_id;
    ELSIF TG_OP = 'INSERT' THEN
      v_old_data := NULL;
      v_new_data := to_jsonb(NEW);
      v_record_id := NEW.id;
      v_company_id := NEW.company_id;
    ELSE
      v_old_data := to_jsonb(OLD);
      v_new_data := to_jsonb(NEW);
      v_record_id := NEW.id;
      v_company_id := NEW.company_id;
    END IF;

    SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid() LIMIT 1;

    v_changed_fields := get_changed_fields(v_old_data, v_new_data);
    v_description := generate_audit_description(TG_TABLE_NAME, v_action, v_old_data, v_new_data);

    INSERT INTO audit_logs (
      table_name, record_id, action, old_data, new_data,
      changed_fields, description, user_id, company_id
    ) VALUES (
      TG_TABLE_NAME, v_record_id, v_action, v_old_data, v_new_data,
      v_changed_fields, v_description, v_user_id, v_company_id
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.log_user_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_company_id UUID;
    v_user_id BIGINT;
    v_action TEXT;
  BEGIN
    v_action := TG_OP;

    IF TG_OP = 'DELETE' THEN
      v_old_data := to_jsonb(OLD) - 'password' - 'password_hash' - 'reset_token';
      v_new_data := NULL;
      v_company_id := OLD.company_id;
    ELSIF TG_OP = 'INSERT' THEN
      v_old_data := NULL;
      v_new_data := to_jsonb(NEW) - 'password' - 'password_hash' - 'reset_token';
      v_company_id := NEW.company_id;
    ELSE
      v_old_data := to_jsonb(OLD) - 'password' - 'password_hash' - 'reset_token';
      v_new_data := to_jsonb(NEW) - 'password' - 'password_hash' - 'reset_token';
      v_company_id := NEW.company_id;
    END IF;

    SELECT id INTO v_user_id FROM users WHERE auth_id = auth.uid() LIMIT 1;

    INSERT INTO audit_logs (
      table_name, record_id, action, old_data, new_data,
      description, user_id, company_id
    ) VALUES (
      'users',
      COALESCE(NEW.id, OLD.id)::UUID,
      v_action,
      v_old_data,
      v_new_data,
      generate_audit_description('users', v_action, v_old_data, v_new_data),
      v_user_id,
      v_company_id
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reset_dashboard_preferences(user_id_param bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  $function$;

CREATE OR REPLACE FUNCTION public.run_alert_checks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
    PERFORM check_low_stock_alerts();
    PERFORM check_overdue_alerts();
    PERFORM check_stale_timer_alerts();
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.search_customers(p_company_id uuid, p_search_term text)
 RETURNS TABLE(id uuid, name text, email text, phone text, nip text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.nip
  FROM customers c
  WHERE c.company_id = p_company_id
    AND (
      c.name ILIKE '%' || p_search_term || '%'
      OR c.email ILIKE '%' || p_search_term || '%'
      OR c.nip ILIKE '%' || p_search_term || '%'
    )
  ORDER BY c.name
  LIMIT 50;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_quote_expiry()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '14 days';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_update_order_costs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Aktualizuj koszty dla zamówienia (nowego lub starego)
  IF TG_OP = 'DELETE' THEN
    IF OLD.order_id IS NOT NULL THEN
      PERFORM update_order_actual_costs(OLD.order_id);
    END IF;
  ELSE
    IF NEW.order_id IS NOT NULL THEN
      PERFORM update_order_actual_costs(NEW.order_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ai_conversations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_external_ops_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_inventory_on_document_confirm()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  DECLARE
    item RECORD;
  BEGIN
    -- Tylko gdy dokument zostaje potwierdzony (draft → confirmed)
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN

      -- Iteruj przez wszystkie pozycje dokumentu
      FOR item IN
        SELECT inventory_id, quantity
        FROM warehouse_document_items
        WHERE document_id = NEW.id
      LOOP
        -- PW (Przyjęcie Wewnętrzne) → dodaj do magazynu
        IF NEW.document_type = 'PW' THEN
          UPDATE inventory
          SET quantity = quantity + item.quantity,
              updated_at = NOW()
          WHERE id = item.inventory_id;

        -- RW (Rozchód Wewnętrzny) lub WZ (Wydanie Zewnętrzne) → odejmij z magazynu
        ELSIF NEW.document_type IN ('RW', 'WZ') THEN
          UPDATE inventory
          SET quantity = quantity - item.quantity,
              updated_at = NOW()
          WHERE id = item.inventory_id;

          -- Opcjonalnie: sprawdź czy stan nie jest ujemny
          IF (SELECT quantity FROM inventory WHERE id = item.inventory_id) < 0 THEN
            RAISE EXCEPTION 'Insufficient inventory for item %', item.inventory_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    RETURN NEW;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.update_next_maintenance()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Gdy konserwacja jest ukończona, zaktualizuj datę następnego przeglądu
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE machines
    SET
      last_maintenance_date = CURRENT_DATE,
      next_maintenance_date = CURRENT_DATE + (maintenance_interval_days || ' days')::INTERVAL,
      status = CASE WHEN status = 'maintenance' THEN 'active' ELSE status END
    WHERE id = NEW.machine_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_operation_costs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_quantity INTEGER;
BEGIN
  -- Pobierz ilość z order_item
  SELECT quantity INTO v_quantity
  FROM order_items
  WHERE id = NEW.order_item_id;

  -- Oblicz total_run_cost
  NEW.total_run_cost := (NEW.run_time_per_unit_minutes * v_quantity / 60.0) * NEW.hourly_rate;

  -- Oblicz total_operation_cost (setup + run)
  NEW.total_operation_cost := NEW.total_setup_cost + NEW.total_run_cost;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_actual_costs(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_hours NUMERIC;
  v_cost NUMERIC;
  v_material_cost NUMERIC;
  v_overhead_cost NUMERIC;
  v_total_cost NUMERIC;
  v_quantity NUMERIC;
BEGIN
  -- Pobierz koszty pracy z time_logs
  SELECT total_hours, total_cost
  INTO v_hours, v_cost
  FROM calculate_order_labor_cost(p_order_id);

  -- Pobierz inne koszty z zamówienia
  SELECT
    COALESCE(material_cost, 0),
    COALESCE(overhead_cost, 0),
    COALESCE(quantity, 1)
  INTO v_material_cost, v_overhead_cost, v_quantity
  FROM orders
  WHERE id = p_order_id;

  -- Oblicz total
  v_total_cost := v_material_cost + v_cost + v_overhead_cost;

  -- Aktualizuj zamówienie
  UPDATE orders
  SET
    actual_labor_cost = v_cost,
    actual_labor_hours = v_hours,
    total_cost = v_total_cost,
    cost_per_unit = CASE WHEN v_quantity > 0 THEN v_total_cost / v_quantity ELSE 0 END,
    margin_amount = CASE WHEN selling_price > 0 THEN selling_price - v_total_cost ELSE 0 END,
    margin_percent = CASE WHEN selling_price > 0 AND v_total_cost > 0 THEN ((selling_price - v_total_cost) / selling_price) * 100 ELSE 0 END,
    updated_at = NOW()
  WHERE id = p_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_item_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Zaktualizuj sumy w order_item po dodaniu/edycji/usunięciu operacji
  UPDATE order_items
  SET
    total_setup_time_minutes = (
      SELECT COALESCE(SUM(setup_time_minutes), 0)
      FROM operations
      WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id)
    ),
    total_run_time_minutes = (
      SELECT COALESCE(SUM(run_time_per_unit_minutes * (SELECT quantity FROM order_items WHERE id = COALESCE(NEW.order_item_id, OLD.order_item_id))), 0)
      FROM operations
      WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id)
    ),
    total_cost = (
      SELECT COALESCE(SUM(total_operation_cost), 0)
      FROM operations
      WHERE order_item_id = COALESCE(NEW.order_item_id, OLD.order_item_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_item_id, OLD.order_item_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Zaktualizuj całkowity koszt zlecenia
  UPDATE orders
  SET
    total_cost = (
      SELECT COALESCE(SUM(total_cost), 0)
      FROM order_items
      WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_quotes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
