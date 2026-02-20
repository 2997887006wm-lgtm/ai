
-- Video generation records
CREATE TABLE public.video_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  video_url TEXT,
  thumbnail_url TEXT,
  title TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see their own videos
CREATE POLICY "Users can view their own videos"
ON public.video_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
ON public.video_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
ON public.video_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
ON public.video_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Also allow anon inserts for non-logged-in users (user_id will be null)
CREATE POLICY "Anon can insert videos"
ON public.video_jobs FOR INSERT
WITH CHECK (user_id IS NULL);

CREATE POLICY "Anon can view null-user videos"
ON public.video_jobs FOR SELECT
USING (user_id IS NULL);

CREATE POLICY "Anon can update null-user videos"
ON public.video_jobs FOR UPDATE
USING (user_id IS NULL);

CREATE TRIGGER update_video_jobs_updated_at
BEFORE UPDATE ON public.video_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
