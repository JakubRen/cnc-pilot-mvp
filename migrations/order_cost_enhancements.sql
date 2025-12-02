-- ============================================
-- Order Cost Enhancements
-- Rozbudowany system kalkulacji kosztów
-- ============================================

-- 1. Dodaj brakujące kolumny do orders (jeśli nie istnieją)
-- Uwaga: material_cost, labor_cost, overhead_cost, total_cost już istnieją

-- Kolumny dla porównania szacowany vs rzeczywisty
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_material_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_labor_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_overhead_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_total_cost NUMERIC(12,2) DEFAULT 0;

-- Kolumny dla rzeczywistych kosztów (automatycznie obliczane)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_labor_cost NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_labor_hours NUMERIC(10,2) DEFAULT 0;

-- Cena sprzedaży i marża
ALTER TABLE orders ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(5,2) DEFAULT 20;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS margin_amount NUMERIC(12,2) DEFAULT 0;

-- Koszt jednostkowy
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC(12,4) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(12,4) DEFAULT 0;

-- Szacowany czas pracy (w godzinach)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(10,2);

-- 2. Funkcja do obliczania rzeczywistego kosztu pracy z time_logs
CREATE OR REPLACE FUNCTION calculate_order_labor_cost(p_order_id UUID)
RETURNS TABLE(
  total_hours NUMERIC,
  total_cost NUMERIC,
  log_count INTEGER
) AS $$
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
$$ LANGUAGE plpgsql;

-- 3. Funkcja do aktualizacji kosztów rzeczywistych zamówienia
CREATE OR REPLACE FUNCTION update_order_actual_costs(p_order_id UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- 4. Trigger do automatycznej aktualizacji kosztów przy zmianach w time_logs
CREATE OR REPLACE FUNCTION trigger_update_order_costs()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS time_logs_update_order_costs ON time_logs;

-- Utwórz trigger
CREATE TRIGGER time_logs_update_order_costs
AFTER INSERT OR UPDATE OR DELETE ON time_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_update_order_costs();

-- 5. Widok dla analizy rentowności zamówień
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

  -- Koszty szacowane
  COALESCE(o.estimated_material_cost, o.material_cost, 0) as estimated_material_cost,
  COALESCE(o.estimated_labor_cost, o.labor_cost, 0) as estimated_labor_cost,
  COALESCE(o.estimated_overhead_cost, o.overhead_cost, 0) as estimated_overhead_cost,
  COALESCE(o.estimated_total_cost, 0) as estimated_total_cost,
  o.estimated_hours,

  -- Koszty rzeczywiste
  COALESCE(o.material_cost, 0) as actual_material_cost,
  COALESCE(o.actual_labor_cost, o.labor_cost, 0) as actual_labor_cost,
  COALESCE(o.actual_labor_hours, 0) as actual_labor_hours,
  COALESCE(o.overhead_cost, 0) as actual_overhead_cost,
  COALESCE(o.total_cost, 0) as actual_total_cost,

  -- Cena i marża
  COALESCE(o.selling_price, 0) as selling_price,
  COALESCE(o.margin_amount, 0) as margin_amount,
  COALESCE(o.margin_percent, 0) as margin_percent,
  COALESCE(o.cost_per_unit, 0) as cost_per_unit,
  COALESCE(o.price_per_unit, 0) as price_per_unit,

  -- Odchylenia (variance)
  COALESCE(o.material_cost, 0) - COALESCE(o.estimated_material_cost, o.material_cost, 0) as material_variance,
  COALESCE(o.actual_labor_cost, o.labor_cost, 0) - COALESCE(o.estimated_labor_cost, o.labor_cost, 0) as labor_variance,
  COALESCE(o.total_cost, 0) - COALESCE(o.estimated_total_cost, 0) as total_variance,
  COALESCE(o.actual_labor_hours, 0) - COALESCE(o.estimated_hours, 0) as hours_variance,

  -- Rentowność
  CASE
    WHEN COALESCE(o.selling_price, 0) > 0 THEN
      ROUND(((o.selling_price - COALESCE(o.total_cost, 0)) / o.selling_price * 100)::NUMERIC, 2)
    ELSE 0
  END as profit_margin_percent,

  CASE
    WHEN COALESCE(o.selling_price, 0) > 0 THEN
      o.selling_price - COALESCE(o.total_cost, 0)
    ELSE 0
  END as profit_amount,

  -- Metadane
  o.created_at,
  o.updated_at

FROM orders o;

-- 6. Funkcja do pobierania statystyk rentowności
CREATE OR REPLACE FUNCTION get_profitability_stats(p_company_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_orders INTEGER,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  total_profit NUMERIC,
  avg_margin_percent NUMERIC,
  profitable_orders INTEGER,
  unprofitable_orders INTEGER,
  avg_cost_per_order NUMERIC,
  total_labor_hours NUMERIC,
  avg_labor_cost_per_hour NUMERIC
) AS $$
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
$$ LANGUAGE plpgsql;

-- 7. Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_selling_price ON orders(selling_price) WHERE selling_price > 0;
CREATE INDEX IF NOT EXISTS idx_orders_deadline ON orders(deadline);

-- 8. RLS dla widoku (przez bazową tabelę orders)
-- Widok dziedziczy RLS z tabeli orders

-- Komentarze
COMMENT ON COLUMN orders.estimated_material_cost IS 'Szacowany koszt materiału (z formularza)';
COMMENT ON COLUMN orders.estimated_labor_cost IS 'Szacowany koszt pracy (z formularza)';
COMMENT ON COLUMN orders.actual_labor_cost IS 'Rzeczywisty koszt pracy (obliczony z time_logs)';
COMMENT ON COLUMN orders.actual_labor_hours IS 'Rzeczywiste godziny pracy (z time_logs)';
COMMENT ON COLUMN orders.selling_price IS 'Cena sprzedaży dla klienta';
COMMENT ON COLUMN orders.margin_percent IS 'Procent marży ((cena - koszt) / cena * 100)';
COMMENT ON COLUMN orders.margin_amount IS 'Kwota marży (cena - koszt)';
COMMENT ON VIEW order_profitability IS 'Widok analizy rentowności zamówień z porównaniem szacowanych i rzeczywistych kosztów';
