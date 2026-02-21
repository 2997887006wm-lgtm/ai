import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Check, Reply, Trash2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Comment {
  id: string;
  script_id: string;
  shot_id: string | null;
  scene_id: string | null;
  user_id: string;
  content: string;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  display_name?: string;
  avatar_url?: string;
}

interface CommentPanelProps {
  visible: boolean;
  onClose: () => void;
  scriptId: string | null;
  shotId?: string | null;
  sceneId?: string | null;
}

export function CommentPanel({ visible, onClose, scriptId, shotId, sceneId }: CommentPanelProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!scriptId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('script_comments')
        .select('*')
        .eq('script_id', scriptId)
        .order('created_at', { ascending: true });

      if (shotId) query = query.eq('shot_id', shotId);
      else if (sceneId) query = query.eq('scene_id', sceneId);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for display names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const enriched = data.map(c => ({
          ...c,
          display_name: profileMap.get(c.user_id)?.display_name || '匿名用户',
          avatar_url: profileMap.get(c.user_id)?.avatar_url,
        }));
        setComments(enriched);
      } else {
        setComments([]);
      }
    } catch (e) {
      console.error('Fetch comments error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, shotId, sceneId]);

  useEffect(() => {
    if (visible && scriptId) fetchComments();
  }, [visible, scriptId, fetchComments]);

  // Real-time subscription
  useEffect(() => {
    if (!visible || !scriptId) return;

    const channel = supabase
      .channel(`comments-${scriptId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'script_comments',
        filter: `script_id=eq.${scriptId}`,
      }, () => {
        fetchComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [visible, scriptId, fetchComments]);

  const handleSend = async () => {
    if (!newComment.trim() || !scriptId || !user) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('script_comments').insert({
        script_id: scriptId,
        shot_id: shotId || null,
        scene_id: sceneId || null,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyTo,
      });
      if (error) throw error;
      setNewComment('');
      setReplyTo(null);
      toast.success('评论已发送');
    } catch (e: any) {
      console.error('Send comment error:', e);
      toast.error('评论发送失败');
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async (commentId: string) => {
    try {
      await supabase.from('script_comments').update({ resolved: true }).eq('id', commentId);
    } catch (e) {
      console.error('Resolve error:', e);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await supabase.from('script_comments').delete().eq('id', commentId);
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  if (!visible) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-elevated z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <span className="text-sm font-medium text-foreground">
            评论{shotId ? ` · 镜头 ${shotId}` : sceneId ? ` · ${sceneId}` : ''}
          </span>
          <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
            {comments.length}
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={24} className="mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground/50">暂无评论，成为第一个评论者</p>
          </div>
        ) : (
          rootComments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              currentUserId={user?.id}
              onReply={(id) => setReplyTo(id)}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Input */}
      {user ? (
        <div className="border-t border-border px-4 py-3">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 text-[10px] text-primary bg-primary/5 rounded px-2 py-1">
              <span>回复评论中…</span>
              <button onClick={() => setReplyTo(null)}><X size={10} /></button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="写下你的评论…"
              className="flex-1 text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!newComment.trim() || isSending}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30"
            >
              {isSending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          请登录后参与评论
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment, replies, currentUserId, onReply, onResolve, onDelete,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId?: string;
  onReply: (id: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isOwn = currentUserId === comment.user_id;
  const timeAgo = getTimeAgo(comment.created_at);

  return (
    <div className={`rounded-lg p-2.5 ${comment.resolved ? 'bg-secondary/30 opacity-60' : 'bg-secondary/50'}`}>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          {comment.avatar_url ? (
            <img src={comment.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <span className="text-[9px] font-medium text-primary">
              {(comment.display_name || '?')[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-foreground truncate">
              {comment.display_name || '匿名'}
            </span>
            <span className="text-[9px] text-muted-foreground/50">{timeAgo}</span>
            {comment.resolved && (
              <span className="text-[9px] text-primary bg-primary/10 px-1 rounded">已解决</span>
            )}
          </div>
          <p className="text-[11px] text-foreground/80 mt-0.5 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={() => onReply(comment.id)}
              className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply size={9} /> 回复
            </button>
            {!comment.resolved && (
              <button
                onClick={() => onResolve(comment.id)}
                className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors"
              >
                <Check size={9} /> 解决
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => onDelete(comment.id)}
                className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={9} /> 删除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-2">
          {replies.map(reply => (
            <div key={reply.id} className="text-[10px]">
              <span className="font-medium text-foreground">{reply.display_name || '匿名'}</span>
              <span className="text-muted-foreground/50 ml-1">{getTimeAgo(reply.created_at)}</span>
              <p className="text-foreground/80 mt-0.5">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
