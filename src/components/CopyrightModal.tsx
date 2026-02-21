import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Shield, ShieldCheck, Loader2, Copy, Check, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Shot } from './StoryboardCard';
import type { TreeNode } from './DraggableScriptTree';

interface CopyrightModalProps {
  visible: boolean;
  onClose: () => void;
  shots: Shot[];
  title: string;
  inspiration: string;
  durationType: 'short' | 'long';
  scriptTree?: TreeNode;
  sceneShotsMap?: Record<string, Shot[]>;
  currentScriptId: string | null;
  userId: string | null;
}

async function computeSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function CopyrightModal({
  visible, onClose, shots, title, inspiration,
  durationType, scriptTree, sceneShotsMap,
  currentScriptId, userId,
}: CopyrightModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [fingerprint, setFingerprint] = useState<{
    hash: string;
    timestamp: string;
    id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!currentScriptId) return;
    const { data } = await supabase
      .from('script_fingerprints')
      .select('*')
      .eq('script_id', currentScriptId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setExistingRecords(data);
  }, [currentScriptId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Build canonical content string
      const allShots = durationType === 'long' && sceneShotsMap
        ? Object.values(sceneShotsMap).flat()
        : shots;

      const canonical = JSON.stringify({
        title,
        inspiration,
        durationType,
        shots: allShots.map(s => ({
          shotType: s.shotType,
          visual: s.visual,
          duration: s.duration,
          dialogue: s.dialogue,
          audio: s.audio,
          character: s.character,
          directorNote: s.directorNote,
        })),
        scriptTree: durationType === 'long' ? scriptTree : undefined,
      });

      const hash = await computeSHA256(canonical);
      const now = new Date().toISOString();

      // Store in database
      const record = {
        script_id: currentScriptId || '00000000-0000-0000-0000-000000000000',
        user_id: userId || null,
        content_hash: hash,
        fingerprint_data: {
          title,
          inspiration,
          durationType,
          shotCount: allShots.length,
          generatedAt: now,
          version: '1.0',
        },
      };

      const { data, error } = await supabase
        .from('script_fingerprints')
        .insert(record)
        .select('id, created_at')
        .single();

      if (error) throw error;

      setFingerprint({
        hash,
        timestamp: data?.created_at || now,
        id: data?.id || '',
      });

      toast.success('版权指纹已生成并存证');
    } catch (e: any) {
      console.error('Copyright fingerprint error:', e);
      toast.error('存证失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!fingerprint) return;
    const text = `版权存证凭证\n━━━━━━━━━━━━━━━\n作品标题：${title}\n数字指纹 (SHA-256)：${fingerprint.hash}\n存证时间：${new Date(fingerprint.timestamp).toLocaleString('zh-CN')}\n存证编号：${fingerprint.id}\n━━━━━━━━━━━━━━━\n此凭证由系统自动生成，可作为创作时间与内容的佐证。`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('存证凭证已复制到剪贴板');
  };

  const handleViewHistory = async () => {
    await loadHistory();
    setShowHistory(!showHistory);
  };

  return (
    <Dialog open={visible} onOpenChange={(open) => { if (!open) { onClose(); setFingerprint(null); setShowHistory(false); } }}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-serif-cn">
            <Shield size={18} className="text-primary" />
            版权存证服务
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            为你的脚本生成 SHA-256 数字指纹，记录创作时间与内容哈希，作为原创性佐证。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Script info summary */}
          <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">作品标题</span>
              <span className="text-xs text-foreground font-medium truncate max-w-[200px]">{title || '未命名'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">分镜数量</span>
              <span className="text-xs text-foreground">
                {durationType === 'long' && sceneShotsMap
                  ? Object.values(sceneShotsMap).flat().length
                  : shots.length} 个
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">脚本类型</span>
              <span className="text-xs text-foreground">{durationType === 'long' ? '长片' : '短片'}</span>
            </div>
          </div>

          {!fingerprint ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-300 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  正在生成数字指纹…
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  生成版权指纹
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-primary" />
                  <span className="text-xs font-medium text-primary">存证成功</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground block mb-0.5">数字指纹 (SHA-256)</span>
                    <code className="text-[10px] text-foreground/80 bg-background/60 rounded px-1.5 py-0.5 break-all font-mono block">
                      {fingerprint.hash}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">存证时间</span>
                    <span className="text-[10px] text-foreground">{new Date(fingerprint.timestamp).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">存证编号</span>
                    <span className="text-[10px] text-foreground font-mono">{fingerprint.id.slice(0, 8)}…</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCopy}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-all duration-300"
              >
                {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                {copied ? '已复制' : '复制存证凭证'}
              </button>
            </div>
          )}

          {/* History */}
          {currentScriptId && (
            <button
              onClick={handleViewHistory}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText size={11} />
              {showHistory ? '收起历史记录' : '查看存证历史'}
            </button>
          )}

          {showHistory && existingRecords.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {existingRecords.map((rec) => (
                <div key={rec.id} className="rounded-md bg-secondary/30 p-2 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <code className="text-[9px] text-muted-foreground font-mono">{rec.content_hash.slice(0, 16)}…</code>
                    <span className="text-[9px] text-muted-foreground">{new Date(rec.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showHistory && existingRecords.length === 0 && (
            <p className="text-center text-[11px] text-muted-foreground/50">暂无历史存证记录</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
