import { useState, useRef } from 'react';
import { ScanSearch, ImagePlus, Loader2, Sparkles, X, Link2, Film } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface ReferenceDeconstructorProps {
  // 把"选题 + 可迁移结构"组合成灵感，回填到输入框（与脚本模版一致：可编辑后再生成）
  onApply: (composedInspiration: string) => void;
}

// 图片压缩到 ≤768px 的 JPEG data URL
function fileToDataUrl(file: File, max = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析图片失败'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas 不可用'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// 从视频文件按时间均匀抽取关键帧
function extractKeyframes(file: File, count = 6, max = 768): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    (video as any).playsInline = true;
    video.src = URL.createObjectURL(file);
    const frames: string[] = [];
    const canvas = document.createElement('canvas');

    const cleanup = () => URL.revokeObjectURL(video.src);

    video.onloadedmetadata = () => {
      const dur = video.duration;
      if (!dur || !isFinite(dur)) { cleanup(); return reject(new Error('无法读取视频时长')); }
      const times = Array.from({ length: count }, (_, i) => (dur * (i + 0.5)) / count);
      let idx = 0;
      const seekNext = () => {
        if (idx >= times.length) { cleanup(); return resolve(frames); }
        try { video.currentTime = times[idx]; } catch { cleanup(); reject(new Error('抽帧失败')); }
      };
      video.onseeked = () => {
        const vw = video.videoWidth, vh = video.videoHeight;
        const scale = Math.min(1, max / Math.max(vw, vh));
        canvas.width = Math.round(vw * scale);
        canvas.height = Math.round(vh * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/jpeg', 0.8));
        }
        idx++; seekNext();
      };
      seekNext();
    };
    video.onerror = () => { cleanup(); reject(new Error('视频加载失败')); };
  });
}

export function ReferenceDeconstructor({ onApply }: ReferenceDeconstructorProps) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [refText, setRefText] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [report, setReport] = useState('');
  const [structureBrief, setStructureBrief] = useState('');
  const [needUpload, setNeedUpload] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setLink(''); setImages([]); setRefText(''); setTopic('');
    setReport(''); setStructureBrief(''); setNeedUpload(false);
  };

  const runDeconstruct = async (payload: { link?: string; images?: string[]; referenceText?: string }) => {
    playClick();
    setLoading(true);
    setReport(''); setStructureBrief('');
    try {
      const { data, error } = await supabase.functions.invoke('deconstruct-reference', { body: payload });
      if (error) throw new Error(error.message);
      if (data?.needUpload) {
        setNeedUpload(true);
        toast.message(data.error || '自动解析失败，请改用上传视频');
        return;
      }
      if (data?.error) throw new Error(data.error);
      setReport(data?.report || '');
      setStructureBrief(data?.structureBrief || data?.report || '');
      if (data?.partial) toast.message('仅根据文案拆解（没拿到画面）。上传视频可拆镜头/画面逻辑，更完整。');
      else toast.success('拆解完成');
    } catch (e: any) {
      console.error('deconstruct error:', e);
      toast.error(e?.message || '拆解失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveLink = () => {
    if (!link.trim()) { toast.error('请粘贴抖音等短视频分享链接'); return; }
    setNeedUpload(false);
    runDeconstruct({ link: link.trim(), referenceText: refText });
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, 9 - images.length);
    try {
      const urls = await Promise.all(picked.map((f) => fileToDataUrl(f)));
      setImages((prev) => [...prev, ...urls].slice(0, 9));
    } catch { toast.error('图片处理失败'); }
  };

  const handleVideoFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    playClick();
    setExtracting(true);
    try {
      const frames = await extractKeyframes(file, 6);
      if (frames.length === 0) throw new Error('未能抽取到画面');
      setImages(frames);
      toast.success(`已抽取 ${frames.length} 帧，开始拆解`);
      await runDeconstruct({ images: frames, referenceText: refText });
    } catch (e: any) {
      toast.error(e?.message || '视频处理失败，请换个视频');
    } finally {
      setExtracting(false);
    }
  };

  const handleManual = () => {
    if (images.length === 0 && !refText.trim()) {
      toast.error('请上传视频/截图，或粘贴文案字幕');
      return;
    }
    runDeconstruct({ images, referenceText: refText });
  };

  const handleApply = () => {
    if (!structureBrief) return;
    playClick();
    const composed =
      `【我的选题】${topic.trim() || '（请在灵感框补充你的具体选题）'}\n\n` +
      `【参考爆款结构 · 请据此原创改编，切勿照抄原文】\n${structureBrief}`;
    onApply(composed);
    setOpen(false);
    reset();
    toast.success('已套用爆款结构，可在灵感框编辑后生成');
  };

  const busy = loading || extracting;

  return (
    <>
      <button
        onClick={() => { playClick(); setOpen(true); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all duration-300"
        title="拆解爆款：粘贴短视频链接或上传视频，反推可迁移的脚本结构"
      >
        <ScanSearch size={13} strokeWidth={1.5} />
        <span className="hidden sm:inline">拆解爆款</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif-cn">拆解爆款 · 结构迁移</DialogTitle>
            <DialogDescription>
              粘贴短视频链接（抖音/快手/微博/小红书等）或上传视频，AI 拆解其「可迁移的结构与风格」，再套用到你的选题生成原创分镜（只提炼方法论，不复制原片内容）。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* 链接（优先） */}
            <div>
              <p className="text-xs text-muted-foreground/70 mb-2 uppercase tracking-widest font-medium flex items-center gap-1.5">
                <Link2 size={12} /> 粘贴短视频链接（抖音 / 快手 / 微博 / 小红书等）
              </p>
              <div className="flex gap-2">
                <input
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="把抖音/快手/微博等「复制链接」的内容直接粘进来"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                />
                <button
                  onClick={handleResolveLink}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium transition-all hover:shadow-elevated disabled:opacity-40 shrink-0"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
                  解析
                </button>
              </div>
              {needUpload && (
                <p className="text-[11px] text-scarlet/80 mt-1.5">自动解析没拿到内容（平台反爬）。请保存视频后用下方「上传视频」。</p>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40 uppercase tracking-widest">
              <div className="flex-1 h-px bg-border" /> 或上传 / 手动 <div className="flex-1 h-px bg-border" />
            </div>

            {/* 上传视频 / 截图 */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => { playClick(); videoRef.current?.click(); }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:border-primary/40 transition-all disabled:opacity-40"
              >
                {extracting ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} strokeWidth={1.5} />}
                {extracting ? '抽帧中…' : '上传视频'}
              </button>
              <button
                onClick={() => { playClick(); imgRef.current?.click(); }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:border-primary/40 transition-all disabled:opacity-40"
              >
                <ImagePlus size={14} strokeWidth={1.5} /> 加截图
              </button>
              <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleVideoFile(e.target.files)} />
              <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5 text-muted-foreground hover:text-destructive"
                      aria-label="移除"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 文案字幕 */}
            <div>
              <p className="text-xs text-muted-foreground/70 mb-2 uppercase tracking-widest font-medium">参考文案 / 字幕（可选，提升口播拆解）</p>
              <textarea
                value={refText}
                onChange={(e) => setRefText(e.target.value)}
                placeholder="粘贴口播文案或字幕，能更准地拆出脚本逻辑"
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-primary/40 min-h-[64px]"
                rows={2}
              />
            </div>

            {(images.length > 0 || refText.trim()) && !report && (
              <button
                onClick={handleManual}
                disabled={busy}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium transition-all hover:shadow-elevated disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} strokeWidth={1.5} />}
                {loading ? '拆解中…' : '拆解上传内容'}
              </button>
            )}

            {/* 报告 + 套用 */}
            {report && (
              <div className="border border-border rounded-lg bg-secondary/30 p-4 space-y-3 animate-fade-in">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">拆解报告</p>
                <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">{report}</div>

                <div className="pt-2 border-t border-border/60">
                  <p className="text-xs text-muted-foreground/70 mb-2">把这套结构用到你的选题：</p>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="输入你的选题，例如：一家深夜便利店的治愈故事"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40 mb-2"
                  />
                  <button
                    onClick={handleApply}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium transition-all hover:shadow-elevated"
                  >
                    <Sparkles size={14} strokeWidth={1.5} />
                    套用结构 → 生成我的脚本
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
