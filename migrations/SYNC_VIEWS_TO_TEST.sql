-- =====================================================
-- SYNC_VIEWS_TO_TEST.sql
-- Synchronizacja 6 widoków z PROD do TEST
-- =====================================================
-- Data: 2026-01-19
-- Cel: Wyrównanie schematów TEST i PROD dla CNC-Pilot
-- =====================================================

-- =====================================================
-- 1. audit_logs_with_users - Logi audytu z danymi użytkownika
-- =====================================================

CREATE OR REPLACE VIEW audit_logs_with_users AS
SELECT
    al.id,
    al.table_name,
    al.record_id,
    al.action,
    al.old_values,
    al.new_values,
    al.changed_at,
    al.company_id,
    al.user_id,
    u.full_name AS user_name,
    u.email AS user_email
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id;

-- =====================================================
-- 2. email_statistics - Statystyki emaili (grupowanie po dniu)
-- =====================================================

CREATE OR REPLACE VIEW email_statistics AS
SELECT
    company_id,
    DATE(created_at) AS send_date,
    COUNT(*) AS total_emails,
    COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened_count
FROM email_logs
GROUP BY company_id, DATE(created_at);

-- =====================================================
-- 3. machines_needing_maintenance - Maszyny wymagające przeglądu
-- =====================================================

CREATE OR REPLACE VIEW machines_needing_maintenance AS
SELECT
    m.id,
    m.name,
    m.model,
    m.serial_number,
    m.status,
    m.last_maintenance_date,
    m.next_maintenance_date,
    m.company_id,
    CASE
        WHEN m.next_maintenance_date IS NULL THEN 'unknown'
        WHEN m.next_maintenance_date < CURRENT_DATE THEN 'overdue'
        WHEN m.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'ok'
    END AS maintenance_status,
    CASE
        WHEN m.next_maintenance_date IS NOT NULL
        THEN m.next_maintenance_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_maintenance
FROM machines m
WHERE m.status != 'retired'
  AND (
    m.next_maintenance_date IS NULL
    OR m.next_maintenance_date <= CURRENT_DATE + INTERVAL '30 days'
  );

-- =====================================================
-- 4. operations_summary - Podsumowanie operacji z JOIN-ami
-- =====================================================

CREATE OR REPLACE VIEW operations_summary AS
SELECT
    o.id,
    o.name AS operation_name,
    o.sequence_number,
    o.status,
    o.estimated_duration_minutes,
    o.actual_duration_minutes,
    o.started_at,
    o.completed_at,
    o.notes,
    o.company_id,
    o.production_plan_id,
    o.external_operation_id,
    pp.name AS plan_name,
    pp.status AS plan_status,
    m.name AS machine_name,
    m.model AS machine_model,
    u.full_name AS operator_name,
    CASE
        WHEN o.estimated_duration_minutes > 0 AND o.actual_duration_minutes > 0
        THEN ROUND((o.actual_duration_minutes::NUMERIC / o.estimated_duration_minutes) * 100, 1)
        ELSE NULL
    END AS efficiency_percent
FROM operations o
LEFT JOIN production_plans pp ON o.production_plan_id = pp.id
LEFT JOIN machines m ON o.machine_id = m.id
LEFT JOIN users u ON o.operator_id = u.id;

-- =====================================================
-- 5. order_profitability - Rentowność zleceń (kalkulacja marży)
-- =====================================================

CREATE OR REPLACE VIEW order_profitability AS
SELECT
    o.id,
    o.order_number,
    o.customer_name,
    o.part_name,
    o.quantity,
    o.status,
    o.deadline,
    o.company_id,
    o.selling_price,
    o.material_cost,
    o.labor_cost,
    o.overhead_cost,
    (COALESCE(o.material_cost, 0) + COALESCE(o.labor_cost, 0) + COALESCE(o.overhead_cost, 0)) AS total_cost,
    COALESCE(o.selling_price, 0) - (COALESCE(o.material_cost, 0) + COALESCE(o.labor_cost, 0) + COALESCE(o.overhead_cost, 0)) AS profit,
    CASE
        WHEN COALESCE(o.selling_price, 0) > 0
        THEN ROUND(
            ((COALESCE(o.selling_price, 0) - (COALESCE(o.material_cost, 0) + COALESCE(o.labor_cost, 0) + COALESCE(o.overhead_cost, 0)))
            / COALESCE(o.selling_price, 1)) * 100,
            2
        )
        ELSE 0
    END AS margin_percent
FROM orders o
WHERE o.selling_price IS NOT NULL OR o.material_cost IS NOT NULL;

-- =====================================================
-- 6. overdue_external_operations - Przeterminowane operacje zewnętrzne
-- =====================================================

CREATE OR REPLACE VIEW overdue_external_operations AS
SELECT
    eo.id,
    eo.name AS operation_name,
    eo.vendor_name,
    eo.vendor_contact,
    eo.status,
    eo.sent_date,
    eo.expected_return_date,
    eo.actual_return_date,
    eo.cost,
    eo.notes,
    eo.company_id,
    eo.order_id,
    o.order_number,
    o.customer_name,
    CASE
        WHEN eo.status = 'completed' THEN 'completed'
        WHEN eo.expected_return_date < CURRENT_DATE THEN 'overdue'
        WHEN eo.expected_return_date <= CURRENT_DATE + INTERVAL '3 days' THEN 'due_soon'
        ELSE 'on_track'
    END AS urgency_status,
    CASE
        WHEN eo.expected_return_date IS NOT NULL AND eo.status != 'completed'
        THEN eo.expected_return_date - CURRENT_DATE
        ELSE NULL
    END AS days_remaining
FROM external_operations eo
LEFT JOIN orders o ON eo.order_id = o.id
WHERE eo.status NOT IN ('completed', 'cancelled')
ORDER BY eo.expected_return_date ASC NULLS LAST;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Sprawdź czy widoki zostały utworzone
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
