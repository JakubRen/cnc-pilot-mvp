-- DAY 23: LOCAL INTELLIGENCE (SQL Functions)
-- Enables "Smart Suggestions" based on historical order data

-- 1. Function to get statistics (avg price, time) from similar past orders
CREATE OR REPLACE FUNCTION get_similar_orders_stats(
  p_company_id UUID,
  p_part_name TEXT,
  p_material TEXT
)
RETURNS TABLE (
  avg_price NUMERIC,
  min_price NUMERIC,
  max_price NUMERIC,
  avg_duration_hours NUMERIC,
  order_count INTEGER,
  last_order_date TIMESTAMP WITH TIME ZONE
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get the actual list of recent similar orders (for sidebar widget)
CREATE OR REPLACE FUNCTION get_similar_orders(
  p_company_id UUID,
  p_part_name TEXT,
  p_material TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  part_name TEXT,
  material TEXT,
  quantity INTEGER,
  total_cost NUMERIC,
  actual_hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  status TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions (just in case, though RLS handles data access)
GRANT EXECUTE ON FUNCTION get_similar_orders_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_similar_orders TO authenticated;
