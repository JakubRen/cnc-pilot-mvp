-- ============================================
-- Phase 4.2: pgvector + Knowledge Embeddings
-- CNC-Pilot Express — RAG foundation for CNC Copilot
-- ============================================

-- 1. Enable pgvector extension (built into Supabase, $0)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create knowledge_embeddings table
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Source tracking
  source_type TEXT NOT NULL, -- 'product', 'order', 'customer', 'machine', 'knowledge_entry'
  source_id UUID NOT NULL,   -- ID in the source table

  -- Content
  content_text TEXT NOT NULL,   -- The text that was embedded
  content_summary TEXT,         -- Short summary for display in chat

  -- Embedding vector (text-embedding-004 = 768 dimensions)
  embedding VECTOR(768) NOT NULL,

  -- Flexible metadata (material, category, sku, etc.)
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HNSW index for fast cosine similarity search
-- HNSW is faster than IVFFlat for our dataset size (thousands, not millions)
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector
ON knowledge_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Standard indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_company
ON knowledge_embeddings(company_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_source
ON knowledge_embeddings(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_company_source_type
ON knowledge_embeddings(company_id, source_type);

-- 5. RLS (same pattern as knowledge_entries)
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view embeddings from their company"
  ON knowledge_embeddings FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert embeddings for their company"
  ON knowledge_embeddings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update embeddings from their company"
  ON knowledge_embeddings FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete embeddings from their company"
  ON knowledge_embeddings FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

-- 6. Similarity search RPC function
-- Called from server code to find similar documents
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(768),
  match_company_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_source_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_id UUID,
  content_text TEXT,
  content_summary TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER -- bypasses RLS but we filter by company_id explicitly
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.source_type,
    ke.source_id,
    ke.content_text,
    ke.content_summary,
    ke.metadata,
    (1 - (ke.embedding <=> query_embedding))::FLOAT AS similarity
  FROM knowledge_embeddings ke
  WHERE ke.company_id = match_company_id
    AND (filter_source_type IS NULL OR ke.source_type = filter_source_type)
    AND (1 - (ke.embedding <=> query_embedding)) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Verification queries
-- Run after migration to confirm:
-- SELECT * FROM pg_extension WHERE extname = 'vector';
-- SELECT count(*) FROM knowledge_embeddings;

COMMENT ON TABLE knowledge_embeddings IS 'Phase 4.2: Vector embeddings for RAG pipeline. Used by CNC Copilot chatbot for semantic search over products, orders, customers, machines.';
COMMENT ON FUNCTION match_embeddings IS 'Cosine similarity search over knowledge_embeddings. SECURITY DEFINER with explicit company_id filter.';
