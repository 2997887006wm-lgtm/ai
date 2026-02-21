import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface StreamingGenerationOverlayProps {
  visible: boolean;
  streamText: string;
}

export function StreamingGenerationOverlay({ visible, streamText }: StreamingGenerationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamText]);

  if (!visible) return null;

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-primary" />
        <span className="text-sm text-muted-foreground font-medium">AI 正在创作分镜脚本…</span>
      </div>
      <div
        ref={containerRef}
        className="relative bg-card/50 border border-border rounded-xl p-6 max-h-[400px] overflow-y-auto font-mono text-xs leading-relaxed text-foreground/70"
      >
        {streamText ? (
          <pre className="whitespace-pre-wrap break-all">{streamText}<span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom" /></pre>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground/50">
            <span className="text-sm">等待 AI 响应…</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">实时输出中，生成完成后将自动进入分镜编辑</p>
    </div>
  );
}
