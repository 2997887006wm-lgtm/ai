
-- Create scripts table for saving generated scripts
CREATE TABLE public.scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL DEFAULT '未命名脚本',
  inspiration TEXT,
  mood TEXT,
  duration_type TEXT NOT NULL DEFAULT 'short',
  shots JSONB NOT NULL DEFAULT '[]'::jsonb,
  script_tree JSONB,
  scene_shots_map JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view their own scripts" ON public.scripts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own scripts" ON public.scripts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scripts" ON public.scripts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scripts" ON public.scripts FOR DELETE USING (auth.uid() = user_id);

-- Policies for anonymous users
CREATE POLICY "Anon can view null-user scripts" ON public.scripts FOR SELECT USING (user_id IS NULL);
CREATE POLICY "Anon can insert scripts" ON public.scripts FOR INSERT WITH CHECK (user_id IS NULL);
CREATE POLICY "Anon can update null-user scripts" ON public.scripts FOR UPDATE USING (user_id IS NULL);

-- Trigger for updated_at
CREATE TRIGGER update_scripts_updated_at
BEFORE UPDATE ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
