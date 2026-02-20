import { useState, useEffect } from 'react';
import { ScrollText, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { playClick } from '@/utils/audio';

interface ScriptRecord {
  id: string;
  title: string;
  inspiration: string | null;
  mood: string | null;
  duration_type: string;
  created_at: string;
  updated_at: string;
}

interface HistoryPanelProps {
  onLoadScript?: (id: string) => void;
}

export function HistoryPanel({ onLoadScript }: HistoryPanelProps) {
  const { user } = useAuth();
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScripts();
  }, [user]);

  const fetchScripts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('id, title, inspiration, mood, duration_type, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setScripts((data as ScriptRecord[]) || []);
    } catch (e: any) {
      console.error('Failed to fetch scripts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    try {
      const { error } = await supabase.from('scripts').delete().eq('id', id);
      if (error) throw error;
      setScripts(prev => prev.filter(s => s.id !== id));
      toast.success('脚本已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const MOOD_MAP: Record<string, string> = {
    healing: '治愈', funny: '搞笑', suspense: '悬疑', passionate: '热血',
    literary: '文艺', horror: '恐怖', romantic: '浪漫', epic: '史诗',
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <h2 className="text-lg font-serif-cn text-foreground mb-6">历史脚本</h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : scripts.length === 0 ? (
        <div className="text-center py-16">
          <ScrollText size={32} strokeWidth={1} className="mx-auto text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground/50">还没有保存的脚本</p>
          <p className="text-xs text-muted-foreground/30 mt-1">生成脚本后会自动保存到这里</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {scripts.map((item) => (
            <button
              key={item.id}
              onClick={() => { playClick(); onLoadScript?.(item.id); }}
              className="text-left p-5 rounded-xl border border-border bg-card hover:shadow-card transition-all duration-300 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <ScrollText size={14} strokeWidth={1.2} className="text-muted-foreground/30 mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground font-serif-cn group-hover:text-scarlet transition-colors truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground/40">
                        {item.duration_type === 'long' ? '深度长片' : '轻巧短片'}
                      </span>
                      {item.mood && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground/50">
                          {MOOD_MAP[item.mood] || item.mood}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/30 tabular-nums">
                    {new Date(item.updated_at).toLocaleDateString('zh-CN')}
                  </span>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground/30 hover:text-destructive transition-all"
                    title="删除脚本"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
