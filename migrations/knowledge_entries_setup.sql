-- ============================================
-- Cyfrowy Majster - Knowledge Base (Backend Only)
-- AI-Ready struktura dla wiedzy produkcyjnej
-- ============================================

-- 1. Tabela wpisów wiedzy (Knowledge Entries)
-- Przygotowana pod przyszłą integrację AI (transkrypcje, podsumowania)
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Powiązanie kontekstowe (opcjonalne)
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  product_id UUID, -- Przyszłe powiązanie z katalogiem produktów

  -- Typ wpisu
  entry_type TEXT NOT NULL DEFAULT 'note', -- note, video, audio, image, document, link

  -- Treść
  title TEXT NOT NULL,
  content TEXT, -- Treść tekstowa / opis

  -- Media (gotowe na Storage)
  media_url TEXT, -- Ścieżka do pliku w Supabase Storage
  media_type TEXT, -- video/mp4, audio/wav, image/jpeg, application/pdf
  media_size_bytes BIGINT,
  media_duration_seconds INTEGER, -- Dla audio/video

  -- AI Processing (przyszłość - domyślnie null)
  transcription_text TEXT, -- Transkrypcja z STT
  transcription_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed, skipped
  ai_summary TEXT, -- Podsumowanie wygenerowane przez AI
  ai_keywords TEXT[], -- Wyekstrahowane słowa kluczowe
  ai_processed_at TIMESTAMP WITH TIME ZONE,

  -- Kategoryzacja
  category TEXT, -- setup, troubleshooting, maintenance, quality, safety, other
  tags TEXT[], -- Tagi zdefiniowane przez użytkownika

  -- Widoczność
  is_public BOOLEAN DEFAULT false, -- Czy widoczne dla wszystkich w firmie
  visibility_roles TEXT[], -- Które role mogą widzieć (null = wszyscy)

  -- Metadane
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela komentarzy do wpisów wiedzy
CREATE TABLE IF NOT EXISTS knowledge_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,

  content TEXT NOT NULL,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela reakcji (upvote/helpful)
CREATE TABLE IF NOT EXISTS knowledge_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),

  reaction_type TEXT NOT NULL DEFAULT 'helpful', -- helpful, bookmark

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(entry_id, user_id, reaction_type)
);

-- 4. Tabela kategorii wiedzy (dla organizacji)
CREATE TABLE IF NOT EXISTS knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL, -- np. setup, troubleshooting
  description TEXT,
  icon TEXT, -- emoji lub klasa ikony
  color TEXT, -- kolor kategorii

  parent_id UUID REFERENCES knowledge_categories(id), -- dla podkategorii
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(company_id, slug)
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_company ON knowledge_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_order ON knowledge_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_machine ON knowledge_entries(machine_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_type ON knowledge_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_transcription ON knowledge_entries(transcription_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_comments_entry ON knowledge_comments(entry_id);

-- Full-text search index (dla przyszłego wyszukiwania)
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_search
ON knowledge_entries USING GIN (
  to_tsvector('polish', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(transcription_text, ''))
);

-- RLS
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_categories ENABLE ROW LEVEL SECURITY;

-- Knowledge entries policies
CREATE POLICY "Users can view knowledge_entries from their company"
  ON knowledge_entries FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can insert knowledge_entries for their company"
  ON knowledge_entries FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can update knowledge_entries from their company"
  ON knowledge_entries FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own knowledge_entries"
  ON knowledge_entries FOR DELETE
  USING (
    company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
    AND created_by IN (SELECT id FROM users WHERE auth_id = auth.uid())
  );

-- Knowledge comments policies
CREATE POLICY "Users can view knowledge_comments from their company entries"
  ON knowledge_comments FOR SELECT
  USING (
    entry_id IN (
      SELECT id FROM knowledge_entries
      WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert knowledge_comments"
  ON knowledge_comments FOR INSERT
  WITH CHECK (
    entry_id IN (
      SELECT id FROM knowledge_entries
      WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
    )
  );

-- Knowledge reactions policies
CREATE POLICY "Users can view knowledge_reactions from their company"
  ON knowledge_reactions FOR SELECT
  USING (
    entry_id IN (
      SELECT id FROM knowledge_entries
      WHERE company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own reactions"
  ON knowledge_reactions FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can delete their own reactions"
  ON knowledge_reactions FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Knowledge categories policies
CREATE POLICY "Users can view knowledge_categories from their company"
  ON knowledge_categories FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Admins can manage knowledge_categories"
  ON knowledge_categories FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM users
      WHERE auth_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- Domyślne kategorie (wstawiane per firma przez trigger lub ręcznie)
-- Można wstawić:
-- INSERT INTO knowledge_categories (company_id, name, slug, icon) VALUES
-- ('company-uuid', 'Ustawienie maszyny', 'setup', '🔧'),
-- ('company-uuid', 'Rozwiązywanie problemów', 'troubleshooting', '🔍'),
-- ('company-uuid', 'Konserwacja', 'maintenance', '🛠️'),
-- ('company-uuid', 'Jakość', 'quality', '✅'),
-- ('company-uuid', 'BHP', 'safety', '⚠️'),
-- ('company-uuid', 'Inne', 'other', '📝');

-- Komentarz
COMMENT ON TABLE knowledge_entries IS 'Cyfrowy Majster - baza wiedzy produkcyjnej.
Przygotowana pod integrację AI (transkrypcje audio/video, podsumowania).
Entry types: note (tekst), video, audio, image, document, link.
Transcription status: pending (czeka), processing (w trakcie), completed (gotowe), failed (błąd), skipped (pominięte).';

COMMENT ON COLUMN knowledge_entries.media_url IS 'Ścieżka do pliku w Supabase Storage (bucket: knowledge)';
COMMENT ON COLUMN knowledge_entries.transcription_text IS 'Transkrypcja z Speech-to-Text - null dopóki AI nie będzie włączone';
COMMENT ON COLUMN knowledge_entries.ai_summary IS 'Podsumowanie wygenerowane przez AI - null dopóki feature nie będzie włączony';
