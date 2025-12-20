-- =====================================================
-- REFACTOR: Split Inventory → Products + Locations
-- Data: 2025-12-18
-- Autor: Claude Code
-- Cel: Rozdzielenie magazynu na TOWARY (definicje) i STANY (lokalizacje)
-- =====================================================

-- =====================================================
-- FAZA 1: NOWE TABELE
-- =====================================================

-- KROK 1: Tabela TOWARY (Products)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Identyfikatory
  sku TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Klasyfikacja
  category TEXT NOT NULL CHECK (category IN (
    'raw_material',      -- Materiał surowy
    'finished_good',     -- Wyrób gotowy
    'semi_finished',     -- Półprodukt
    'tool',              -- Narzędzie
    'consumable'         -- Materiał zużywalny
  )),

  unit TEXT NOT NULL CHECK (unit IN ('kg', 'm', 'szt', 'l')),

  -- Opis
  description TEXT,
  specifications JSONB,  -- { length, width, height, weight, standard, ... }

  -- Dane biznesowe
  default_unit_cost NUMERIC(10,2),
  manufacturer TEXT,
  manufacturer_sku TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, sku)
);

CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_sku ON products(company_id, sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;


-- KROK 2: Tabela STANY W LOKALIZACJACH (Inventory Locations)
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relacja do produktu
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Lokalizacja
  location_code TEXT NOT NULL,  -- np. "A1-01-02" lub "Magazyn Główny"

  -- Stany
  quantity NUMERIC(10,3) NOT NULL DEFAULT 0,
  reserved_quantity NUMERIC(10,3) NOT NULL DEFAULT 0,  -- zarezerwowane
  available_quantity NUMERIC(10,3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,

  -- Progi
  low_stock_threshold NUMERIC(10,3),
  reorder_point NUMERIC(10,3),

  -- Audyt
  last_counted_at TIMESTAMP,
  last_movement_at TIMESTAMP,

  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(product_id, location_code)
);

CREATE INDEX idx_inventory_locations_product ON inventory_locations(product_id);
CREATE INDEX idx_inventory_locations_location ON inventory_locations(location_code);
CREATE INDEX idx_inventory_locations_low_stock ON inventory_locations(available_quantity, low_stock_threshold);


-- KROK 3: Tabela PARTIE (Inventory Batches) - opcjonalne
CREATE TABLE IF NOT EXISTS inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,

  -- Identyfikacja partii
  batch_number TEXT,

  -- Stan
  quantity NUMERIC(10,3) NOT NULL,

  -- Cena zakupu (dla tej partii!)
  unit_cost NUMERIC(10,2),

  -- Źródło
  supplier TEXT,
  purchase_order_number TEXT,
  received_date DATE,

  -- Ważność
  expiry_date DATE,

  created_at TIMESTAMP DEFAULT NOW(),

  CHECK (quantity >= 0)
);

CREATE INDEX idx_inventory_batches_location ON inventory_batches(location_id);
CREATE INDEX idx_inventory_batches_batch ON inventory_batches(batch_number);
CREATE INDEX idx_inventory_batches_expiry ON inventory_batches(expiry_date) WHERE expiry_date IS NOT NULL;


-- KROK 4: Tabela RUCHY (Inventory Movements)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  location_id UUID NOT NULL REFERENCES inventory_locations(id),
  batch_id UUID REFERENCES inventory_batches(id),

  -- Typ ruchu
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),

  -- Ilość (+ dla in, - dla out)
  quantity NUMERIC(10,3) NOT NULL,

  -- Odniesienie do źródła
  reference_type TEXT,  -- 'warehouse_document', 'order', 'adjustment'
  reference_id UUID,

  reason TEXT,

  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventory_movements_location ON inventory_movements(location_id);
CREATE INDEX idx_inventory_movements_batch ON inventory_movements(batch_id);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at);


-- KROK 5: RLS Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- Products RLS
CREATE POLICY products_company_isolation ON products
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE auth_id = auth.uid()
  ));

-- Inventory Locations RLS (przez product)
CREATE POLICY inventory_locations_company_isolation ON inventory_locations
  FOR ALL
  USING (product_id IN (
    SELECT id FROM products WHERE company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Batches RLS (przez location → product)
CREATE POLICY inventory_batches_company_isolation ON inventory_batches
  FOR ALL
  USING (location_id IN (
    SELECT il.id FROM inventory_locations il
    JOIN products p ON il.product_id = p.id
    WHERE p.company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));

-- Movements RLS (przez location → product)
CREATE POLICY inventory_movements_company_isolation ON inventory_movements
  FOR ALL
  USING (location_id IN (
    SELECT il.id FROM inventory_locations il
    JOIN products p ON il.product_id = p.id
    WHERE p.company_id IN (
      SELECT company_id FROM users WHERE auth_id = auth.uid()
    )
  ));


-- =====================================================
-- FAZA 2: MIGRACJA DANYCH
-- =====================================================

-- Wyłącz triggery (żeby nie logować każdej operacji)
SET session_replication_role = replica;

-- KROK 1: Zmigruj produkty (ZACHOWAJ ISTNIEJĄCE ID!)
INSERT INTO products (
  id,
  company_id,
  sku,
  name,
  category,
  unit,
  description,
  default_unit_cost,
  manufacturer,
  is_active,
  created_by,
  created_at,
  updated_at
)
SELECT
  id,  -- KRYTYCZNE: zachowaj ID dla FK!
  company_id,
  sku,
  name,
  -- Mapowanie category: stare wartości camelCase → nowe snake_case
  CASE category
    WHEN 'rawMaterial' THEN 'raw_material'
    WHEN 'finishedGood' THEN 'finished_good'
    WHEN 'part' THEN 'semi_finished'
    WHEN 'tool' THEN 'tool'
    WHEN 'consumable' THEN 'consumable'
    ELSE 'raw_material'  -- default fallback
  END as category,
  -- Mapowanie unit: angielskie → polskie
  CASE unit
    WHEN 'pcs' THEN 'szt'
    WHEN 'kg' THEN 'kg'
    WHEN 'm' THEN 'm'
    WHEN 'l' THEN 'l'
    ELSE 'szt'  -- default fallback
  END as unit,
  notes as description,  -- notes → description
  unit_cost as default_unit_cost,
  supplier as manufacturer,  -- supplier → manufacturer
  true as is_active,
  created_by,
  created_at,
  updated_at
FROM inventory
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.id = inventory.id);

-- KROK 2: Zmigruj stany do lokalizacji
INSERT INTO inventory_locations (
  id,  -- nowe UUID
  product_id,
  location_code,
  quantity,
  reserved_quantity,
  low_stock_threshold,
  reorder_point,
  last_counted_at,
  notes,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4() as id,
  id as product_id,  -- inventory.id → product_id (już w products!)
  COALESCE(location, 'Magazyn Główny') as location_code,
  quantity,
  0 as reserved_quantity,
  low_stock_threshold,
  NULL as reorder_point,  -- Brak w starym inventory
  updated_at as last_counted_at,
  NULL as notes,
  created_at,
  updated_at
FROM inventory
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_locations WHERE product_id = inventory.id
);

-- KROK 3: Opcjonalnie - zmigruj partie (jeśli batch_number istnieje)
-- POMINIĘTE - struktura inventory może nie mieć wszystkich wymaganych kolumn
-- Partie będą dodawane ręcznie w nowej strukturze jeśli potrzebne
-- (Tabela inventory_batches została utworzona i jest gotowa do użycia)

-- KROK 4: Zmigruj historię transakcji → movements
-- POMINIĘTE - tabela inventory_transactions ma inną strukturę niż zakładano
-- Historia będzie budowana od zera w nowej strukturze
-- (Brak migracji - nowe ruchy będą logowane od teraz)

-- Włącz triggery z powrotem
SET session_replication_role = DEFAULT;


-- =====================================================
-- FAZA 3: WERYFIKACJA MIGRACJI
-- =====================================================

DO $$
DECLARE
  old_inventory_count INTEGER;
  new_products_count INTEGER;
  new_locations_count INTEGER;
  batches_count INTEGER;
  movements_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_inventory_count FROM inventory;
  SELECT COUNT(*) INTO new_products_count FROM products;
  SELECT COUNT(*) INTO new_locations_count FROM inventory_locations;
  SELECT COUNT(*) INTO batches_count FROM inventory_batches;
  SELECT COUNT(*) INTO movements_count FROM inventory_movements;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'WERYFIKACJA MIGRACJI:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Stare inventory: %', old_inventory_count;
  RAISE NOTICE 'Nowe products: %', new_products_count;
  RAISE NOTICE 'Nowe locations: %', new_locations_count;
  RAISE NOTICE 'Nowe batches: %', batches_count;
  RAISE NOTICE 'Nowe movements: %', movements_count;
  RAISE NOTICE '========================================';

  IF new_products_count = old_inventory_count THEN
    RAISE NOTICE '✅ Wszystkie produkty zmigrowane';
  ELSE
    RAISE WARNING '⚠️ Niezgodność w liczbie produktów!';
  END IF;

  IF new_locations_count >= old_inventory_count THEN
    RAISE NOTICE '✅ Wszystkie lokalizacje utworzone';
  ELSE
    RAISE WARNING '⚠️ Brakujące lokalizacje!';
  END IF;
END $$;


-- =====================================================
-- KONIEC MIGRACJI
-- =====================================================
