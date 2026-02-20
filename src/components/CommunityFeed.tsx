import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Bookmark, Share2, Upload, Play, Loader2, Globe, Lock, MoreHorizontal } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { toast } from 'sonner';

interface CommunityVideo {
  id: string;
  user_id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  visibility: string;
  likes_count: number;
  bookmarks_count: number;
  shares_count: number;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null };
}

interface CommunityFeedProps {
  filter?: 'all' | 'liked' | 'bookmarked' | 'mine';
}

export function CommunityFeed({ filter = 'all' }: CommunityFeedProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('community_videos').select('*').order('created_at', { ascending: false }).limit(50);

      if (filter === 'mine' && user) {
        query = query.eq('user_id', user.id);
      }

      const { data } = await query;
      let vids = (data || []) as CommunityVideo[];

      if (filter === 'liked' && user) {
        const { data: likes } = await supabase.from('video_likes').select('video_id').eq('user_id', user.id);
        const likedVideoIds = new Set((likes || []).map((l: any) => l.video_id));
        vids = vids.filter(v => likedVideoIds.has(v.id));
      }

      if (filter === 'bookmarked' && user) {
        const { data: bookmarks } = await supabase.from('video_bookmarks').select('video_id').eq('user_id', user.id);
        const bookmarkedVideoIds = new Set((bookmarks || []).map((b: any) => b.video_id));
        vids = vids.filter(v => bookmarkedVideoIds.has(v.id));
      }

      setVideos(vids);

      // Fetch user's likes and bookmarks
      if (user) {
        const [likesRes, bookmarksRes] = await Promise.all([
          supabase.from('video_likes').select('video_id').eq('user_id', user.id),
          supabase.from('video_bookmarks').select('video_id').eq('user_id', user.id),
        ]);
        setLikedIds(new Set((likesRes.data || []).map((l: any) => l.video_id)));
        setBookmarkedIds(new Set((bookmarksRes.data || []).map((b: any) => b.video_id)));
      }
    } catch (e) {
      console.error('Fetch community videos error:', e);
    }
    setLoading(false);
  }, [user, filter]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleLike = async (videoId: string) => {
    if (!user) { toast.error('请先登录'); return; }
    playClick();
    const isLiked = likedIds.has(videoId);
    if (isLiked) {
      await supabase.from('video_likes').delete().eq('user_id', user.id).eq('video_id', videoId);
      setLikedIds(prev => { const n = new Set(prev); n.delete(videoId); return n; });
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes_count: Math.max(0, v.likes_count - 1) } : v));
    } else {
      await supabase.from('video_likes').insert({ user_id: user.id, video_id: videoId });
      setLikedIds(prev => new Set(prev).add(videoId));
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes_count: v.likes_count + 1 } : v));
    }
  };

  const handleBookmark = async (videoId: string) => {
    if (!user) { toast.error('请先登录'); return; }
    playClick();
    const isBookmarked = bookmarkedIds.has(videoId);
    if (isBookmarked) {
      await supabase.from('video_bookmarks').delete().eq('user_id', user.id).eq('video_id', videoId);
      setBookmarkedIds(prev => { const n = new Set(prev); n.delete(videoId); return n; });
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, bookmarks_count: Math.max(0, v.bookmarks_count - 1) } : v));
    } else {
      await supabase.from('video_bookmarks').insert({ user_id: user.id, video_id: videoId });
      setBookmarkedIds(prev => new Set(prev).add(videoId));
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, bookmarks_count: v.bookmarks_count + 1 } : v));
    }
  };

  const handleShare = async (video: CommunityVideo) => {
    playClick();
    const url = video.video_url;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title || '精彩视频', url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制到剪贴板');
    }
    // Increment share count
    await supabase.from('community_videos').update({ shares_count: video.shares_count + 1 }).eq('id', video.id);
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, shares_count: v.shares_count + 1 } : v));
  };

  const handleUpload = async () => {
    if (!user) { toast.error('请先登录'); return; }
    playClick();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 100 * 1024 * 1024) { toast.error('视频文件不能超过100MB'); return; }

      setUploading(true);
      try {
        const ext = file.name.split('.').pop() || 'mp4';
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('community-videos').upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('community-videos').getPublicUrl(path);
        const videoUrl = urlData.publicUrl;

        await supabase.from('community_videos').insert({
          user_id: user.id,
          title: file.name.replace(/\.[^/.]+$/, ''),
          video_url: videoUrl,
          visibility: 'public',
        });

        toast.success('视频上传成功！');
        fetchVideos();
      } catch (e: any) {
        console.error('Upload error:', e);
        toast.error('上传失败：' + (e.message || '未知错误'));
      }
      setUploading(false);
    };
    input.click();
  };

  const handleToggleVisibility = async (video: CommunityVideo) => {
    const newVis = video.visibility === 'public' ? 'private' : 'public';
    await supabase.from('community_videos').update({ visibility: newVis }).eq('id', video.id);
    setVideos(prev => prev.map(v => v.id === video.id ? { ...v, visibility: newVis } : v));
    toast.success(newVis === 'public' ? '已公开' : '已设为私密');
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <Loader2 size={20} className="mx-auto mb-2 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Upload button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['all', 'liked', 'bookmarked', 'mine'] as const).map(f => (
            <span
              key={f}
              className={`text-xs px-3 py-1 rounded-full cursor-default ${
                filter === f ? 'bg-foreground text-background' : 'text-muted-foreground'
              }`}
            >
              {f === 'all' ? '广场' : f === 'liked' ? '喜欢' : f === 'bookmarked' ? '收藏' : '我的'}
            </span>
          ))}
        </div>
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          上传视频
        </button>
      </div>

      {/* Ad placeholder */}
      {filter === 'all' && videos.length > 3 && (
        <div className="mb-4 p-4 rounded-xl border border-dashed border-border/50 bg-secondary/20 text-center">
          <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">广告位</p>
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">
          {filter === 'liked' ? '还没有喜欢的视频' :
           filter === 'bookmarked' ? '还没有收藏的视频' :
           filter === 'mine' ? '还没有上传的视频' :
           '暂无社区视频'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {videos.map((video, idx) => (
            <div key={video.id}>
              <div className="rounded-xl overflow-hidden border border-border bg-card hover:shadow-card transition-shadow group">
                {/* Video thumbnail / player */}
                <div
                  className="relative aspect-[9/16] bg-secondary cursor-pointer"
                  onClick={() => setPlayingId(playingId === video.id ? null : video.id)}
                >
                  {playingId === video.id ? (
                    <video
                      src={video.video_url}
                      className="w-full h-full object-cover"
                      autoPlay
                      controls
                      loop
                    />
                  ) : (
                    <>
                      {video.thumbnail_url ? (
                        <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play size={24} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play size={16} className="text-foreground ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Info + actions */}
                <div className="p-3">
                  <p className="text-sm text-foreground truncate font-medium">{video.title || '未命名视频'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleLike(video.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          likedIds.has(video.id) ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                        }`}
                      >
                        <Heart size={14} fill={likedIds.has(video.id) ? 'currentColor' : 'none'} />
                        {video.likes_count > 0 && <span>{video.likes_count}</span>}
                      </button>
                      <button
                        onClick={() => handleBookmark(video.id)}
                        className={`flex items-center gap-1 text-xs transition-colors ${
                          bookmarkedIds.has(video.id) ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                        }`}
                      >
                        <Bookmark size={14} fill={bookmarkedIds.has(video.id) ? 'currentColor' : 'none'} />
                        {video.bookmarks_count > 0 && <span>{video.bookmarks_count}</span>}
                      </button>
                      <button
                        onClick={() => handleShare(video)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Share2 size={14} />
                        {video.shares_count > 0 && <span>{video.shares_count}</span>}
                      </button>
                    </div>
                    {user && video.user_id === user.id && (
                      <button
                        onClick={() => handleToggleVisibility(video)}
                        className="text-muted-foreground/50 hover:text-foreground transition-colors"
                        title={video.visibility === 'public' ? '设为私密' : '设为公开'}
                      >
                        {video.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ad placeholder every 6 items */}
              {filter === 'all' && (idx + 1) % 6 === 0 && idx < videos.length - 1 && (
                <div className="mt-4 p-3 rounded-xl border border-dashed border-border/50 bg-secondary/20 text-center">
                  <p className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">广告位</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
