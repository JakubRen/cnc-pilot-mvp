-- DAY 12: Sample Orders with Realistic Costs
-- This file contains sample data to demonstrate revenue tracking

-- STEP 1: Find your company_id and user_id
-- Run this query first and copy the results
SELECT
  u.id as user_id,
  u.company_id,
  u.email,
  c.name as company_name
FROM users u
JOIN companies c ON c.id = u.company_id
WHERE u.email = 'YOUR_EMAIL@DOMAIN.COM';  -- <-- CHANGE THIS TO YOUR EMAIL!

-- STEP 2: Insert sample orders
-- IMPORTANT: Replace 'YOUR_COMPANY_ID' and YOUR_USER_ID with values from the query above!

INSERT INTO orders (
  order_number,
  customer_name,
  part_name,
  quantity,
  material,
  deadline,
  status,
  material_cost,
  labor_cost,
  overhead_cost,
  total_cost,
  company_id,
  created_by,
  notes
) VALUES
-- ORDER 1: Completed order (shows in revenue)
(
  'ORD-2025-001',
  'Metal-Tech Sp. z o.o.',
  'Flansze stalowe 150mm',
  50,
  'Stal nierdzewna 304',
  '2025-11-10',
  'completed',
  2500.00,
  1800.00,
  450.00,
  4750.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'Zlecenie standardowe - flansze produkcyjne dla klienta Metal-Tech'
),

-- ORDER 2: In progress (high cost)
(
  'ORD-2025-002',
  'Fabryka Maszyn "Precyzja"',
  'Osie obrotowe CNC',
  100,
  'Aluminium 7075',
  '2025-11-25',
  'in_progress',
  3200.00,
  2400.00,
  600.00,
  6200.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'Osie o wysokiej precyzji - wymaga dodatkowej obróbki wykończeniowej'
),

-- ORDER 3: Completed order (big revenue)
(
  'ORD-2025-003',
  'Automotive Parts Polska',
  'Kołnierze tłoków 50mm',
  200,
  'Stal węglowa C45',
  '2025-11-05',
  'completed',
  4500.00,
  3200.00,
  800.00,
  8500.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'Duże zlecenie dla branży automotive - seria produkcyjna'
),

-- ORDER 4: Pending (low cost)
(
  'ORD-2025-004',
  'Warsztat "Kowalski i Syn"',
  'Uchwyty mocujące',
  30,
  'Stal zwykła',
  '2025-11-30',
  'pending',
  800.00,
  600.00,
  150.00,
  1550.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'Małe zlecenie - proste uchwyty'
),

-- ORDER 5: Completed this month (revenue shows)
(
  'ORD-2025-005',
  'Metal-Precyzja Sp. z o.o.',
  'Tuleje dystansowe',
  80,
  'Brąz',
  CURRENT_DATE - INTERVAL '5 days',
  'completed',
  1900.00,
  1400.00,
  350.00,
  3650.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'Tuleje z brązu - standardowa obróbka'
),

-- ORDER 6: Overdue (has cost)
(
  'ORD-2025-006',
  'Zakład Metalurgiczny "Huta"',
  'Elementy konstrukcyjne',
  15,
  'Stal konstrukcyjna S235',
  CURRENT_DATE - INTERVAL '3 days',
  'in_progress',
  1200.00,
  900.00,
  225.00,
  2325.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'UWAGA: Po terminie - priorytet wysoki!'
),

-- ORDER 7: Future order (high value)
(
  'ORD-2025-007',
  'Przemysł Maszynowy SA',
  'Wały napędowe 800mm',
  40,
  'Stal narzędziowa NC6',
  CURRENT_DATE + INTERVAL '14 days',
  'pending',
  5600.00,
  4200.00,
  1050.00,
  10850.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'Duże zlecenie - wały o długości 800mm, wymaga precyzyjnej obróbki'
),

-- ORDER 8: Completed recently (revenue)
(
  'ORD-2025-008',
  'Tech-Metal Innovations',
  'Adaptery przemysłowe',
  120,
  'Aluminium 6082',
  CURRENT_DATE - INTERVAL '2 days',
  'completed',
  2800.00,
  2100.00,
  525.00,
  5425.00,
  'YOUR_COMPANY_ID',  -- <-- CHANGE THIS!
  YOUR_USER_ID,       -- <-- CHANGE THIS!
  'Adaptery dla klienta Tech-Metal - seria produkcyjna zakończona'
);

-- SUMMARY:
-- 8 sample orders total
-- 4 completed (total revenue this month: 22,325 PLN)
-- 2 in_progress
-- 2 pending
-- 1 overdue
--
-- Dashboard will show:
-- 💰 Revenue (Month): 22,325 PLN
-- 📦 Total Orders: 8
-- ⚠️ Overdue: 1
-- 🔄 Active: 2
