import { Loader2, CheckCircle2, XCircle, ExternalLink, X } from 'lucide-react';
import { playClick } from '@/utils/audio';

export interface VideoJobTracker {
  id: string;
  taskId: string;
  prompt: string;
  status: 'processing' | 'success' | 'failed';
  videoUrl?: string;
  startedAt: number;
}

interface VideoProgressPanelProps {
  jobs: VideoJobTracker[];
  onDismiss: (id: string) => void;
}

export function VideoProgressPanel({ jobs, onDismiss }: VideoProgressPanelProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-24 z-50 w-80 flex flex-col gap-2 animate-slide-up">
      {jobs.map((job) => {
        const elapsed = Math.round((Date.now() - job.startedAt) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        
        return (
          <div
            key={job.id}
            className="p-3 rounded-xl bg-card border border-border shadow-elevated flex items-start gap-3"
          >
            {/* Status icon */}
            <div className="mt-0.5 shrink-0">
              {job.status === 'processing' && (
                <Loader2 size={16} className="animate-spin text-primary" />
              )}
              {job.status === 'success' && (
                <CheckCircle2 size={16} className="text-green-600" />
              )}
              {job.status === 'failed' && (
                <XCircle size={16} className="text-destructive" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">{job.prompt.slice(0, 40)}...</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {job.status === 'processing' && `生成中 · ${mins}:${String(secs).padStart(2, '0')}`}
                {job.status === 'success' && '生成完成'}
                {job.status === 'failed' && '生成失败'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {job.status === 'success' && job.videoUrl && (
                <button
                  onClick={() => { playClick(); window.open(job.videoUrl!, '_blank'); }}
                  className="w-6 h-6 rounded flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                  title="查看视频"
                >
                  <ExternalLink size={12} />
                </button>
              )}
              <button
                onClick={() => { playClick(); onDismiss(job.id); }}
                className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="关闭"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
