-- =====================================================
-- SYNC_VIEWS_TO_TEST.sql
-- Synchronizacja 6 widoków do bazy TEST
-- =====================================================
-- Data: 2026-01-19
-- Cel: Wyrównanie schematów TEST i PROD dla CNC-Pilot
-- UWAGA: Kolumny zweryfikowane bezpośrednio z bazy TEST!
-- =====================================================

-- =====================================================
-- 1. audit_logs_with_users - Logi audytu z danymi użytkownika
-- =====================================================
-- Kolumny audit_logs: id, description, changed_fields, table_name, user_agent,
--   entity_id, entity_type, action, new_data, old_data, record_id, created_at,
--   ip_address, changes, company_id, user_id

CREATE OR REPLACE VIEW audit_logs_with_users AS
SELECT
    a.id,
    a.entity_type,
    a.entity_id,
    a.table_name,
    a.record_id,
    a.action,
    a.old_data,
    a.new_data,
    a.changes,
    a.changed_fields,
    a.description,
    a.ip_address,
    a.user_agent,
    a.user_id,
    u.full_name AS user_name,
    u.email AS user_email,
    a.company_id,
    a.created_at
FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id;

-- =====================================================
-- 2. email_statistics - Statystyki emaili (grupowanie po dniu)
-- =====================================================
-- Kolumny email_logs: id, company_id, sent_by, email_type, recipients,
--   subject, success, error_message, metadata, created_at

CREATE OR REPLACE VIEW email_statistics AS
SELECT
    company_id,
    email_type,
    DATE(created_at) AS date,
    COUNT(*) AS total_sent,
    COUNT(*) FILTER (WHERE success = true) AS successful,
    COUNT(*) FILTER (WHERE success = false) AS failed
FROM email_logs
GROUP BY company_id, email_type, DATE(created_at);

-- =====================================================
-- 3. machines_needing_maintenance - Maszyny wymagające przeglądu
-- =====================================================
-- Kolumny machines: id, company_id, name, code, serial_number, manufacturer,
--   model, location, purchase_date, warranty_until, last_maintenance_date,
--   next_maintenance_date, maintenance_interval_days, status, notes,
--   specifications, hourly_rate, created_by, created_at, updated_at

CREATE OR REPLACE VIEW machines_needing_maintenance AS
SELECT
    m.id,
    m.company_id,
    m.name,
    m.code,
    m.serial_number,
    m.manufacturer,
    m.model,
    m.location,
    m.status,
    m.last_maintenance_date,
    m.next_maintenance_date,
    m.maintenance_interval_days,
    (m.next_maintenance_date - CURRENT_DATE) AS days_until_maintenance,
    CASE
        WHEN m.next_maintenance_date IS NULL THEN 'unknown'
        WHEN m.next_maintenance_date < CURRENT_DATE THEN 'overdue'
        WHEN m.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming'
        ELSE 'ok'
    END AS maintenance_urgency
FROM machines m
WHERE m.status != 'retired'
  AND m.status IS DISTINCT FROM 'inactive'
  AND (
    m.next_maintenance_date IS NULL
    OR m.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days'
  );

-- =====================================================
-- 4. operations_summary - Podsumowanie operacji z JOIN-ami
-- =====================================================
-- Kolumny operations: id, production_plan_id, operation_number, operation_type,
--   operation_name, description, machine_id, setup_time_minutes,
--   run_time_per_unit_minutes, hourly_rate, total_setup_cost, total_run_cost,
--   total_operation_cost, status, assigned_operator_id, started_at,
--   completed_at, created_at, updated_at
-- Kolumny production_plans: id, company_id, plan_number, order_id, part_name,
--   quantity, status, is_active, ...

CREATE OR REPLACE VIEW operations_summary AS
SELECT
    o.id,
    o.production_plan_id,
    o.operation_number,
    o.operation_type,
    o.operation_name,
    o.description,
    o.machine_id,
    o.setup_time_minutes,
    o.run_time_per_unit_minutes,
    o.hourly_rate,
    o.total_setup_cost,
    o.total_run_cost,
    o.total_operation_cost,
    o.status,
    o.assigned_operator_id,
    o.started_at,
    o.completed_at,
    o.created_at,
    o.updated_at,
    pp.company_id,
    pp.plan_number,
    pp.order_id,
    pp.part_name,
    pp.quantity,
    pp.status AS plan_status,
    m.name AS machine_name,
    m.model AS machine_model,
    u.full_name AS operator_name,
    -- Calculated fields
    (o.run_time_per_unit_minutes * pp.quantity) AS total_run_time_minutes,
    (o.setup_time_minutes + (o.run_time_per_unit_minutes * pp.quantity)) AS total_time_minutes,
    CASE
        WHEN o.started_at IS NOT NULL AND o.completed_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (o.completed_at - o.started_at)) / 60
        ELSE NULL
    END AS actual_duration_minutes
FROM operations o
LEFT JOIN production_plans pp ON o.production_plan_id = pp.id
LEFT JOIN machines m ON o.machine_id = m.id
LEFT JOIN users u ON o.assigned_operator_id = u.id;

-- =====================================================
-- 5. order_profitability - Rentowność zleceń (kalkulacja marży)
-- =====================================================
-- Kolumny orders: id, company_id, order_number, customer_name, quantity,
--   part_name, material, deadline, status, selling_price, material_cost,
--   labor_cost, overhead_cost, total_cost, margin_percent, margin_amount, ...

CREATE OR REPLACE VIEW order_profitability AS
SELECT
    o.id,
    o.company_id,
    o.order_number,
    o.customer_name,
    o.part_name,
    o.quantity,
    o.material,
    o.status,
    o.deadline,
    o.selling_price,
    o.material_cost,
    o.labor_cost,
    o.overhead_cost,
    o.total_cost,
    o.margin_percent,
    o.margin_amount,
    o.cost_per_unit,
    o.price_per_unit,
    -- Calculated profit (if not stored)
    COALESCE(o.selling_price, 0) - COALESCE(o.total_cost, 0) AS calculated_profit,
    -- Calculated margin percent (if selling_price > 0)
    CASE
        WHEN COALESCE(o.selling_price, 0) > 0
        THEN ROUND(
            ((COALESCE(o.selling_price, 0) - COALESCE(o.total_cost, 0))
            / o.selling_price) * 100,
            2
        )
        ELSE 0
    END AS calculated_margin_percent
FROM orders o
WHERE o.selling_price IS NOT NULL OR o.total_cost IS NOT NULL;

-- =====================================================
-- 6. overdue_external_operations - Przeterminowane operacje zewnętrzne
-- =====================================================
-- Kolumny external_operations: id, company_id, cooperant_id, operation_number,
--   operation_type, status, sent_date, expected_return_date, actual_return_date,
--   notes, transport_info, sent_by, received_by, created_at, updated_at
-- Kolumny cooperants: id, company_id, name, service_type, contact_person,
--   phone, email, address, avg_lead_days, notes, is_active, ...

CREATE OR REPLACE VIEW overdue_external_operations AS
SELECT
    eo.id,
    eo.company_id,
    eo.operation_number,
    eo.operation_type,
    eo.status,
    eo.sent_date,
    eo.expected_return_date,
    eo.actual_return_date,
    eo.notes,
    eo.transport_info,
    eo.sent_by,
    eo.received_by,
    eo.created_at,
    eo.cooperant_id,
    c.name AS cooperant_name,
    c.phone AS cooperant_phone,
    c.email AS cooperant_email,
    c.contact_person AS cooperant_contact,
    -- Days calculation
    (CURRENT_DATE - eo.expected_return_date) AS days_overdue,
    CASE
        WHEN eo.status IN ('completed', 'returned') THEN 'completed'
        WHEN eo.expected_return_date < CURRENT_DATE THEN 'overdue'
        WHEN eo.expected_return_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
        ELSE 'on_track'
    END AS urgency_status
FROM external_operations eo
LEFT JOIN cooperants c ON eo.cooperant_id = c.id
WHERE eo.status NOT IN ('completed', 'returned', 'cancelled')
ORDER BY eo.expected_return_date ASC NULLS LAST;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON audit_logs_with_users TO authenticated;
GRANT SELECT ON email_statistics TO authenticated;
GRANT SELECT ON machines_needing_maintenance TO authenticated;
GRANT SELECT ON operations_summary TO authenticated;
GRANT SELECT ON order_profitability TO authenticated;
GRANT SELECT ON overdue_external_operations TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
    table_name AS view_name,
    'view' AS type
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN (
    'audit_logs_with_users',
    'email_statistics',
    'machines_needing_maintenance',
    'operations_summary',
    'order_profitability',
    'overdue_external_operations'
  )
ORDER BY table_name;

-- Oczekiwany wynik: 6 widoków
