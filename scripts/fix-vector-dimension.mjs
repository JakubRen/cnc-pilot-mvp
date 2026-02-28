import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Alter the embedding column from VECTOR(768) to VECTOR(3072)
// Drop old index first, then alter, then recreate index
const sql = `
-- Drop old HNSW index
DROP INDEX IF EXISTS knowledge_embeddings_embedding_idx;

-- Alter column dimension
ALTER TABLE knowledge_embeddings
ALTER COLUMN embedding TYPE vector(3072);

-- Recreate HNSW index for 3072 dimensions
CREATE INDEX knowledge_embeddings_embedding_idx
ON knowledge_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Update the match_embeddings function to use 3072
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(3072),
  match_company_id uuid,
  match_threshold float DEFAULT 0.65,
  match_count int DEFAULT 5,
  filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  content_text text,
  content_summary text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_embeddings ke
  WHERE ke.company_id = match_company_id
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
    AND (filter_source_type IS NULL OR ke.source_type = filter_source_type)
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`

const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: 'rpc not available' }))

// If rpc exec_sql doesn't exist, try direct REST
if (error) {
  console.log('Direct RPC not available, running statements via supabase...')
  // Split and run each statement
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 5)
  for (const stmt of statements) {
    console.log('Running:', stmt.slice(0, 60) + '...')
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({}),
      }
    )
    console.log('  Status:', res.status)
  }
  console.log('\n⚠️  Run this SQL manually in Supabase SQL Editor:')
  console.log(sql)
} else {
  console.log('✅ Migration applied successfully')
}
