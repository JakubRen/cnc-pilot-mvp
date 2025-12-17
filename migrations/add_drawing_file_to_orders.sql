-- ============================================
-- Migration: Dodaj obsługę rysunków technicznych w zleceniach
-- Data: 2025-01-XX
-- Autor: CNC Pilot MVP
-- ============================================

-- Dodaj kolumnę drawing_file_id do tabeli orders
ALTER TABLE orders
ADD COLUMN drawing_file_id UUID REFERENCES files(id);

-- Dodaj indeks dla szybszego wyszukiwania
CREATE INDEX idx_orders_drawing_file ON orders(drawing_file_id);

-- Dodaj komentarz do kolumny
COMMENT ON COLUMN orders.drawing_file_id IS 'Plik rysunku technicznego (PDF/DXF) dla zlecenia';

-- Aktualizuj RLS policies jeśli potrzebne
-- (drawing_file_id jest opcjonalne, więc nie wymaga zmian w policies)
