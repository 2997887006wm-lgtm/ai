import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Video, ExternalLink, Trash2, Loader2, PlayCircle } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { VideoSequencePlayer, type VideoClip } from './VideoSequencePlayer';

interface VideoJob {
  id: string;
  task_id: string | null;
  prompt: string;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  created_at: string;
}

export function VideoLibraryPanel() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);

  const fetchVideos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('video_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Fetch videos error:', error);
    } else {
      setVideos((data as VideoJob[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, [user]);

  const handleDelete = async (id: string) => {
    playClick();
    const { error } = await supabase.from('video_jobs').delete().eq('id', id);
    if (error) {
      toast.error('删除失败');
    } else {
      setVideos(prev => prev.filter(v => v.id !== id));
      toast.success('已删除');
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'pending': return '等待中';
      case 'processing': return '生成中';
      case 'success': return '已完成';
      case 'failed': return '失败';
      default: return s;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'text-muted-foreground';
      case 'processing': return 'text-primary';
      case 'success': return 'text-green-600';
      case 'failed': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 size={20} className="mx-auto mb-2 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground text-sm">
        <Video size={32} className="mx-auto mb-3 opacity-30" />
        暂无已生成的视频
      </div>
    );
  }

  const completedClips: VideoClip[] = videos
    .filter(v => v.status === 'success' && v.video_url)
    .map(v => ({ url: v.video_url!, title: v.title || v.prompt.slice(0, 40), thumbnailUrl: v.thumbnail_url }));

  return (
    <div className="grid gap-4">
      {completedClips.length >= 2 && (
        <button
          onClick={() => { playClick(); setShowPlayer(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/30 text-sm text-foreground hover:border-primary hover:bg-primary/5 transition-all duration-300 w-fit mx-auto mb-2"
        >
          <PlayCircle size={16} className="text-primary" />
          拼接预览全部视频
          <span className="text-[10px] text-muted-foreground">({completedClips.length}个片段)</span>
        </button>
      )}

      {videos.map((v) => (
        <div
          key={v.id}
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:shadow-card transition-shadow"
        >
          {/* Thumbnail */}
          <div className="w-24 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
            {v.thumbnail_url ? (
              <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
            ) : v.status === 'processing' ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : (
              <Video size={16} className="text-muted-foreground/40" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{v.title || v.prompt.slice(0, 60)}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium ${statusColor(v.status)}`}>
                {v.status === 'processing' && <Loader2 size={10} className="inline mr-1 animate-spin" />}
                {statusLabel(v.status)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(v.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {v.video_url && (
              <button
                onClick={() => { playClick(); window.open(v.video_url!, '_blank'); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="打开视频"
              >
                <ExternalLink size={14} />
              </button>
            )}
            <button
              onClick={() => handleDelete(v.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <VideoSequencePlayer
        open={showPlayer}
        onOpenChange={setShowPlayer}
        clips={completedClips}
      />
    </div>
  );
}
