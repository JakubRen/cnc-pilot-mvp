-- ============================================
-- PERFORMANCE OPTIMIZATION MIGRATION
-- Indexes for Multi-tenancy & Fuzzy Search
-- ============================================

-- 1. MULTI-TENANCY INDEXES (B-Tree)
-- Critical for filtering by company_id (WHERE company_id = ...)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_company_id ON inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_company_id ON time_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_documents_company_id ON warehouse_documents(company_id);

-- Foreign key indexes (often missed, speeds up JOINs)
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_time_logs_order_id ON time_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_documents_created_by ON warehouse_documents(created_by);

-- 2. SMART PRICING OPTIMIZATION (Trigram / Fuzzy Search)
-- Critical for "Local Intelligence" (ILIKE '%query%')
-- ============================================

-- Enable pg_trgm extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for fast text search on orders
-- These allow ILIKE '%...%' to use an index instead of full table scan
CREATE INDEX IF NOT EXISTS idx_orders_part_name_trgm ON orders USING GIN (part_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_material_trgm ON orders USING GIN (material gin_trgm_ops);

-- 3. SORTING INDEXES
-- Speed up "ORDER BY created_at DESC" which is used everywhere
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at_desc ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_created_at_desc ON inventory(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_logs_start_time_desc ON time_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_documents_created_at_desc ON warehouse_documents(created_at DESC);

-- ============================================
-- DONE
-- Run this in Supabase SQL Editor to apply optimizations
-- ============================================
