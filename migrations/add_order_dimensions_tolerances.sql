-- Migration: Add dimensions with tolerances to orders table
-- Purpose: Store L×W×H + tolerances for QC auto-generation

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS length NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS width NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tolerance_length NUMERIC(6,3) DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS tolerance_width NUMERIC(6,3) DEFAULT 0.1,
  ADD COLUMN IF NOT EXISTS tolerance_height NUMERIC(6,3) DEFAULT 0.1;
