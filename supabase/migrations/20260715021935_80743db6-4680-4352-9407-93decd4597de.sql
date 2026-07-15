CREATE TABLE public.image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  prompt TEXT NOT NULL,
  visual TEXT,
  shot_type TEXT,
  image_ratio TEXT NOT NULL DEFAULT '16:9',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  image_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.image_jobs TO anon;
GRANT SELECT ON public.image_jobs TO authenticated;
GRANT ALL ON public.image_jobs TO service_role;

ALTER TABLE public.image_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own image jobs"
ON public.image_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anon can view temporary image jobs"
ON public.image_jobs
FOR SELECT
TO anon
USING (user_id IS NULL);

CREATE TRIGGER update_image_jobs_updated_at
BEFORE UPDATE ON public.image_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();