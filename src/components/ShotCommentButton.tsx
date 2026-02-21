import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Reply, Check, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
}

interface ShotCommentButtonProps {
  scriptId: string | null;
  shotId: number;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

export function ShotCommentButton({ scriptId, shotId }: ShotCommentButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const shotIdStr = String(shotId);

  const fetchComments = useCallback(async () => {
    if (!scriptId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_comments')
        .select('*')
        .eq('script_id', scriptId)
        .eq('shot_id', shotIdStr)
        .order('created_at', { ascending: true });
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        setComments(data.map(c => ({
          ...c,
          display_name: profileMap.get(c.user_id)?.display_name || '匿名',
          avatar_url: profileMap.get(c.user_id)?.avatar_url,
        })));
      } else {
        setComments([]);
      }
    } catch (e) {
      console.error('Fetch shot comments error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [scriptId, shotIdStr]);

  useEffect(() => {
    if (open && scriptId) fetchComments();
  }, [open, scriptId, fetchComments]);

  // Realtime
  useEffect(() => {
    if (!open || !scriptId) return;
    const channel = supabase
      .channel(`shot-comments-${scriptId}-${shotId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'script_comments',
        filter: `script_id=eq.${scriptId}`,
      }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, scriptId, shotId, fetchComments]);

  // Count for badge (fetch once on mount)
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!scriptId) return;
    supabase
      .from('script_comments')
      .select('id', { count: 'exact', head: true })
      .eq('script_id', scriptId)
      .eq('shot_id', shotIdStr)
      .then(({ count: c }) => setCount(c || 0));
  }, [scriptId, shotIdStr, comments.length]);

  const handleSend = async () => {
    if (!newComment.trim() || !scriptId || !user) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('script_comments').insert({
        script_id: scriptId,
        shot_id: shotIdStr,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyTo,
      });
      if (error) throw error;
      setNewComment('');
      setReplyTo(null);
    } catch (e: any) {
      toast.error('评论发送失败');
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async (id: string) => {
    await supabase.from('script_comments').update({ resolved: true }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('script_comments').delete().eq('id', id);
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-all duration-300"
        title="评论此分镜"
      >
        <MessageCircle size={10} strokeWidth={2} />
        {count > 0 && (
          <span className="text-[9px] text-primary font-medium">{count}</span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-elevated z-50 animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-[11px] font-medium text-foreground flex items-center gap-1">
              <MessageCircle size={11} className="text-primary" />
              镜头 #{String(shotId).slice(-2)} 评论
              <span className="text-[9px] text-muted-foreground bg-secondary px-1 rounded-full">{comments.length}</span>
            </span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          </div>

          {/* Comments */}
          <div className="max-h-60 overflow-y-auto px-3 py-2 space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={14} className="animate-spin text-muted-foreground" />
              </div>
            ) : rootComments.length === 0 ? (
              <p className="text-center text-[10px] text-muted-foreground/40 py-4">暂无评论</p>
            ) : (
              rootComments.map(comment => (
                <div key={comment.id} className={`rounded-lg p-2 ${comment.resolved ? 'bg-secondary/30 opacity-60' : 'bg-secondary/50'}`}>
                  <div className="flex items-start gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {comment.avatar_url ? (
                        <img src={comment.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span className="text-[8px] font-medium text-primary">
                          {(comment.display_name || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-medium text-foreground truncate">{comment.display_name}</span>
                        <span className="text-[8px] text-muted-foreground/50">{getTimeAgo(comment.created_at)}</span>
                        {comment.resolved && <span className="text-[8px] text-primary bg-primary/10 px-1 rounded">✓</span>}
                      </div>
                      <p className="text-[10px] text-foreground/80 mt-0.5 leading-relaxed">{comment.content}</p>
                      <div className="flex gap-1.5 mt-1">
                        <button onClick={() => setReplyTo(comment.id)} className="text-[8px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
                          <Reply size={8} /> 回复
                        </button>
                        {!comment.resolved && (
                          <button onClick={() => handleResolve(comment.id)} className="text-[8px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
                            <Check size={8} /> 解决
                          </button>
                        )}
                        {user?.id === comment.user_id && (
                          <button onClick={() => handleDelete(comment.id)} className="text-[8px] text-muted-foreground hover:text-destructive flex items-center gap-0.5">
                            <Trash2 size={8} /> 删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {getReplies(comment.id).length > 0 && (
                    <div className="ml-6 mt-1.5 space-y-1 border-l-2 border-border pl-2">
                      {getReplies(comment.id).map(reply => (
                        <div key={reply.id} className="text-[9px]">
                          <span className="font-medium text-foreground">{reply.display_name}</span>
                          <span className="text-muted-foreground/50 ml-1">{getTimeAgo(reply.created_at)}</span>
                          <p className="text-foreground/80 mt-0.5">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          {user ? (
            <div className="border-t border-border px-3 py-2">
              {replyTo && (
                <div className="flex items-center justify-between mb-1 text-[9px] text-primary bg-primary/5 rounded px-1.5 py-0.5">
                  <span>回复中…</span>
                  <button onClick={() => setReplyTo(null)}><X size={8} /></button>
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="写评论…"
                  className="flex-1 text-[10px] bg-secondary/50 border border-border rounded-md px-2 py-1.5 text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!newComment.trim() || isSending}
                  className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30"
                >
                  {isSending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-border px-3 py-2 text-center text-[9px] text-muted-foreground">
              请登录后评论
            </div>
          )}
        </div>
      )}
    </div>
  );
}
