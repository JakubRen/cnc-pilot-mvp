-- ============================================
-- MIGRACJA: AUDIT LOG SYSTEM - CNC-Pilot
-- ============================================
-- Data: 2024-12-02
-- Opis: Kompletny system logowania zmian w systemie
-- ============================================

-- ============================================
-- 1. TABELA AUDIT_LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informacje o zmianie
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW', 'EXPORT')),

  -- Szczegóły zmiany
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[], -- lista zmienionych pól

  -- Metadane
  description TEXT, -- czytelny opis zmiany
  ip_address INET,
  user_agent TEXT,

  -- Powiązania
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tylko odczyt dla własnej firmy
CREATE POLICY "audit_logs_select_own_company" ON audit_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Insert - tylko dla systemu (trigger) lub authenticated users
CREATE POLICY "audit_logs_insert_auth" ON audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR
    company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  );

COMMENT ON TABLE audit_logs IS 'Historia wszystkich zmian w systemie';

-- ============================================
-- 2. FUNKCJA GENERUJĄCA OPIS ZMIANY
-- ============================================

CREATE OR REPLACE FUNCTION generate_audit_description(
  p_table_name TEXT,
  p_action TEXT,
  p_old_data JSONB,
  p_new_data JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_description TEXT;
  v_identifier TEXT;
BEGIN
  -- Znajdź identyfikator rekordu
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
$$;

-- ============================================
-- 3. FUNKCJA WYKRYWAJĄCA ZMIENIONE POLA
-- ============================================

CREATE OR REPLACE FUNCTION get_changed_fields(
  p_old_data JSONB,
  p_new_data JSONB
)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
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
$$;

-- ============================================
-- 4. GENERYCZNA FUNKCJA TRIGGER DO LOGOWANIA
-- ============================================

CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  -- Określ akcję
  v_action := TG_OP;

  -- Pobierz dane
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
  ELSE -- UPDATE
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_company_id := NEW.company_id;
  END IF;

  -- Znajdź user_id
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_id = auth.uid()
  LIMIT 1;

  -- Wykryj zmienione pola
  v_changed_fields := get_changed_fields(v_old_data, v_new_data);

  -- Generuj opis
  v_description := generate_audit_description(TG_TABLE_NAME, v_action, v_old_data, v_new_data);

  -- Zapisz log
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    description,
    user_id,
    company_id
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    v_action,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_description,
    v_user_id,
    v_company_id
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ============================================
-- 5. TRIGGER NA TABELI ORDERS
-- ============================================

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_table_changes();

-- ============================================
-- 6. TRIGGER NA TABELI INVENTORY
-- ============================================

DROP TRIGGER IF EXISTS audit_inventory ON inventory;
CREATE TRIGGER audit_inventory
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION log_table_changes();

-- ============================================
-- 7. TRIGGER NA TABELI USERS (bez haseł)
-- ============================================

-- Specjalna funkcja dla users (pomijamy hasło i tokeny)
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_record_id UUID;
  v_company_id UUID;
  v_user_id BIGINT;
  v_action TEXT;
BEGIN
  v_action := TG_OP;

  -- Usuń wrażliwe dane
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
$$;

DROP TRIGGER IF EXISTS audit_users ON users;
CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_changes();

-- ============================================
-- 8. WIDOK: AUDIT LOG Z NAZWAMI UŻYTKOWNIKÓW
-- ============================================

CREATE OR REPLACE VIEW audit_logs_with_users AS
SELECT
  a.id,
  a.table_name,
  a.record_id,
  a.action,
  a.old_data,
  a.new_data,
  a.changed_fields,
  a.description,
  a.ip_address,
  a.user_agent,
  a.user_id,
  u.full_name as user_name,
  u.email as user_email,
  a.company_id,
  a.created_at
FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id;

COMMENT ON VIEW audit_logs_with_users IS 'Audit log z dołączonymi danymi użytkowników';

-- ============================================
-- 9. FUNKCJA: POBIERZ HISTORIĘ REKORDU
-- ============================================

CREATE OR REPLACE FUNCTION get_record_history(
  p_table_name TEXT,
  p_record_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  description TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================
-- 10. FUNKCJA: STATYSTYKI AUDYTU
-- ============================================

CREATE OR REPLACE FUNCTION get_audit_statistics(
  p_company_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  table_name TEXT,
  insert_count BIGINT,
  update_count BIGINT,
  delete_count BIGINT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT SELECT ON audit_logs_with_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_record_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_statistics TO authenticated;

-- ============================================
-- KONIEC MIGRACJI
-- ============================================
