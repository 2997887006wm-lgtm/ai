
CREATE TABLE public.script_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  script_id UUID NOT NULL,
  user_id UUID,
  content_hash TEXT NOT NULL,
  fingerprint_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.script_fingerprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fingerprints"
ON public.script_fingerprints FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create fingerprints"
ON public.script_fingerprints FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anon can view null-user fingerprints"
ON public.script_fingerprints FOR SELECT
USING (user_id IS NULL);

CREATE POLICY "Anon can insert null-user fingerprints"
ON public.script_fingerprints FOR INSERT
WITH CHECK (user_id IS NULL);

CREATE INDEX idx_script_fingerprints_script_id ON public.script_fingerprints(script_id);
CREATE INDEX idx_script_fingerprints_hash ON public.script_fingerprints(content_hash);
