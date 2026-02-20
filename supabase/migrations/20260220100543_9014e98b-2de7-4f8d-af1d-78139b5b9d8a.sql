
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Knowledge base table
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'film_technique',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read knowledge" ON public.knowledge_base FOR SELECT USING (true);

-- Match function using plpgsql with search_path including extensions
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding_text text,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
) RETURNS TABLE (
  id UUID,
  category TEXT,
  title TEXT,
  content TEXT,
  similarity float
) LANGUAGE plpgsql STABLE 
SET search_path = 'public, extensions'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.category,
    kb.title,
    kb.content,
    (1 - (kb.embedding <=> query_embedding_text::vector(1024)))::float AS sim
  FROM public.knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND (1 - (kb.embedding <=> query_embedding_text::vector(1024)))::float > match_threshold
  ORDER BY kb.embedding <=> query_embedding_text::vector(1024)
  LIMIT match_count;
END;
$$;
