
DROP FUNCTION IF EXISTS public.match_knowledge(text, float, int);

-- Use a DO block to set search_path before creating the function
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
SET search_path TO extensions, public
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
