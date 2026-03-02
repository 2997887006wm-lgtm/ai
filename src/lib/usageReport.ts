import { supabase } from '@/lib/supabase';

/** 记录用户使用事件到 Supabase，供各页面调用 */
export async function logUsageEvent(
  eventType: 'script_created' | 'video_generated' | 'script_saved' | 'page_view',
  metadata?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('usage_events' as any).insert({
      user_id: user?.id ?? null,
      event_type: eventType,
      metadata: metadata ?? {},
    });
    if (error) console.warn('logUsageEvent failed:', error);
  } catch (e) {
    console.warn('logUsageEvent error:', e);
  }
}
