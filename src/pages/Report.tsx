import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, FileText, Video, BarChart3, Loader2 } from 'lucide-react';
import { playClick } from '@/utils/audio';

export { logUsageEvent } from '@/lib/usageReport';

const Report = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [usageEvents, setUsageEvents] = useState<{ event_type: string; count: number }[]>([]);
  const [scriptsCount, setScriptsCount] = useState(0);
  const [videosCount, setVideosCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      try {
        // 获取 usage_events 统计
        const { data: events } = await supabase
          .from('usage_events' as any)
          .select('event_type')
          .eq('user_id', user.id);

        const countMap: Record<string, number> = {};
        (events ?? []).forEach((e: { event_type: string }) => {
          countMap[e.event_type] = (countMap[e.event_type] ?? 0) + 1;
        });
        setUsageEvents(
          Object.entries(countMap).map(([event_type, count]) => ({ event_type, count }))
        );

        // 获取脚本数量
        const { count: scripts } = await supabase
          .from('scripts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setScriptsCount(scripts ?? 0);

        // 获取视频任务数量
        const { count: videos } = await supabase
          .from('video_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setVideosCount(videos ?? 0);
      } catch (e) {
        console.error('Report fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-muted-foreground">请登录后查看使用报告</p>
        <button
          onClick={() => { playClick(); navigate('/auth'); }}
          className="px-4 py-2 rounded-lg bg-foreground text-background text-sm"
        >
          去登录
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => { playClick(); navigate('/'); }}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="返回"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-medium">使用报告</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{scriptsCount}</p>
              <p className="text-sm text-muted-foreground">已保存脚本</p>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Video size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{videosCount}</p>
              <p className="text-sm text-muted-foreground">已生成视频</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-muted-foreground" />
            <h2 className="font-medium">使用事件统计</h2>
          </div>
          {usageEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无使用记录，开始创作后会自动保存</p>
          ) : (
            <ul className="space-y-2">
              {usageEvents.map(({ event_type, count }) => (
                <li key={event_type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {event_type === 'script_created' && '生成脚本'}
                    {event_type === 'video_generated' && '生成视频'}
                    {event_type === 'script_saved' && '保存脚本'}
                    {event_type === 'page_view' && '页面访问'}
                    {!['script_created', 'video_generated', 'script_saved', 'page_view'].includes(event_type) && event_type}
                  </span>
                  <span className="font-medium">{count} 次</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          您的使用数据已安全保存至 Supabase，可在本页面随时查看。
        </p>
      </main>
    </div>
  );
};

export default Report;
