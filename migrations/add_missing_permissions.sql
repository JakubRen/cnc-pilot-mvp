-- ============================================
-- UZUPEŁNIENIE BRAKUJĄCYCH UPRAWNIEŃ
-- Data: 2025-12-02
-- Opis: Dodaje uprawnienia dla modułów:
--       quality-control, cooperation, machines,
--       carbon, costs, calendar
-- ============================================

-- 1. DODAJ BRAKUJĄCE DEFINICJE UPRAWNIEŃ
-- ============================================

INSERT INTO permission_definitions (code, module, action, name_pl, description_pl) VALUES
-- Quality Control (Kontrola Jakości)
('quality-control:access', 'quality-control', 'access', 'Dostęp do Kontroli Jakości', 'Przeglądanie planów QC i wyników kontroli'),
('quality-control:create', 'quality-control', 'create', 'Tworzenie w Kontroli Jakości', 'Dodawanie planów kontroli i wyników'),
('quality-control:edit', 'quality-control', 'edit', 'Edycja Kontroli Jakości', 'Edycja planów i wyników kontroli'),
('quality-control:delete', 'quality-control', 'delete', 'Usuwanie w Kontroli Jakości', 'Usuwanie planów i wyników'),

-- Cooperation (Kooperacja)
('cooperation:access', 'cooperation', 'access', 'Dostęp do Kooperacji', 'Przeglądanie zleceń kooperacyjnych'),
('cooperation:create', 'cooperation', 'create', 'Tworzenie Kooperacji', 'Dodawanie zleceń kooperacyjnych'),
('cooperation:edit', 'cooperation', 'edit', 'Edycja Kooperacji', 'Edycja zleceń kooperacyjnych'),
('cooperation:delete', 'cooperation', 'delete', 'Usuwanie Kooperacji', 'Usuwanie zleceń kooperacyjnych'),
('cooperation:prices', 'cooperation', 'prices', 'Ceny w Kooperacji', 'Widok kosztów kooperacji'),

-- Machines (Maszyny/CMMS)
('machines:access', 'machines', 'access', 'Dostęp do Maszyn', 'Przeglądanie maszyn i ich statusu'),
('machines:create', 'machines', 'create', 'Dodawanie Maszyn', 'Dodawanie nowych maszyn'),
('machines:edit', 'machines', 'edit', 'Edycja Maszyn', 'Edycja danych maszyn'),
('machines:delete', 'machines', 'delete', 'Usuwanie Maszyn', 'Usuwanie maszyn'),

-- Carbon (Ślad węglowy)
('carbon:access', 'carbon', 'access', 'Dostęp do Śladu Węglowego', 'Przeglądanie raportów CO2'),
('carbon:create', 'carbon', 'create', 'Dodawanie Danych CO2', 'Wprowadzanie danych emisji'),
('carbon:edit', 'carbon', 'edit', 'Edycja Danych CO2', 'Edycja danych emisji'),
('carbon:export', 'carbon', 'export', 'Eksport Raportów CO2', 'Eksportowanie raportów CBAM'),

-- Costs (Koszty)
('costs:access', 'costs', 'access', 'Dostęp do Kosztów', 'Przeglądanie analizy kosztów'),
('costs:prices', 'costs', 'prices', 'Szczegóły Kosztów', 'Dostęp do szczegółowych danych finansowych'),
('costs:edit', 'costs', 'edit', 'Edycja Kosztów', 'Modyfikacja danych kosztowych'),
('costs:export', 'costs', 'export', 'Eksport Kosztów', 'Eksport raportów kosztowych'),

-- Calendar (Kalendarz)
('calendar:access', 'calendar', 'access', 'Dostęp do Kalendarza', 'Przeglądanie kalendarza produkcji'),
('calendar:create', 'calendar', 'create', 'Tworzenie w Kalendarzu', 'Dodawanie wydarzeń do kalendarza'),
('calendar:edit', 'calendar', 'edit', 'Edycja Kalendarza', 'Edycja wydarzeń w kalendarzu')

ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. DODAJ UPRAWNIENIA DO RÓL
-- ============================================

-- OWNER - pełny dostęp do wszystkich nowych modułów
INSERT INTO role_permissions (role, permission_code)
SELECT 'owner', code FROM permission_definitions
WHERE module IN ('quality-control', 'cooperation', 'machines', 'carbon', 'costs', 'calendar')
ON CONFLICT (role, permission_code) DO NOTHING;

-- ADMIN - wszystko oprócz delete w niektórych
INSERT INTO role_permissions (role, permission_code)
SELECT 'admin', code FROM permission_definitions
WHERE module IN ('quality-control', 'cooperation', 'machines', 'carbon', 'costs', 'calendar')
ON CONFLICT (role, permission_code) DO NOTHING;

-- MANAGER - zarządzanie operacjami (pełny dostęp do nowych modułów)
INSERT INTO role_permissions (role, permission_code)
SELECT 'manager', code FROM permission_definitions
WHERE module IN ('quality-control', 'cooperation', 'machines', 'carbon', 'costs', 'calendar')
ON CONFLICT (role, permission_code) DO NOTHING;

-- OPERATOR - podstawowy dostęp do nowych modułów (bez cen, bez delete)
INSERT INTO role_permissions (role, permission_code) VALUES
-- Quality Control
('operator', 'quality-control:access'),
('operator', 'quality-control:create'),
('operator', 'quality-control:edit'),
-- Cooperation (tylko podgląd)
('operator', 'cooperation:access'),
-- Machines
('operator', 'machines:access'),
-- Calendar
('operator', 'calendar:access')
ON CONFLICT (role, permission_code) DO NOTHING;

-- VIEWER - tylko podgląd nowych modułów
INSERT INTO role_permissions (role, permission_code) VALUES
('viewer', 'quality-control:access'),
('viewer', 'cooperation:access'),
('viewer', 'machines:access'),
('viewer', 'calendar:access')
ON CONFLICT (role, permission_code) DO NOTHING;

-- ============================================
-- 3. WERYFIKACJA
-- ============================================
-- Sprawdź czy dodano poprawnie:
-- SELECT module, COUNT(*) as count FROM permission_definitions GROUP BY module ORDER BY module;
-- SELECT role, COUNT(*) as permissions_count FROM role_permissions GROUP BY role ORDER BY role;
