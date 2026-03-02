-- 用户使用数据记录表（用于 Report 页面统计与持久化）
CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 索引便于按时间和类型查询
CREATE INDEX idx_usage_events_created_at ON public.usage_events (created_at DESC);
CREATE INDEX idx_usage_events_user_id ON public.usage_events (user_id);
CREATE INDEX idx_usage_events_event_type ON public.usage_events (event_type);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- 允许匿名和登录用户插入
CREATE POLICY "Anyone can insert usage_events" ON public.usage_events FOR INSERT WITH CHECK (true);
-- 用户只能查看自己的记录（登录用户）
CREATE POLICY "Users can view own usage_events" ON public.usage_events FOR SELECT USING (auth.uid() = user_id);
