import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Play, Pause, SkipForward, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoClip {
  url: string;
  title: string;
  thumbnailUrl?: string | null;
}

interface VideoSequencePlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: VideoClip[];
}

export function VideoSequencePlayer({ open, onOpenChange, clips }: VideoSequencePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loop, setLoop] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const clip = clips[currentIndex];

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setIsPlaying(true);
      setProgress(0);
    }
  }, [open]);

  // Auto-play when index changes
  useEffect(() => {
    if (open && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [currentIndex, open]);

  const goNext = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex(i => i + 1);
    } else if (loop) {
      setCurrentIndex(0);
    }
  }, [currentIndex, clips.length, loop]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const handleEnded = useCallback(() => {
    if (currentIndex < clips.length - 1) {
      goNext();
    } else if (loop) {
      setCurrentIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, clips.length, goNext, loop]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const { currentTime, duration } = videoRef.current;
    setProgress(duration > 0 ? currentTime / duration : 0);
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * videoRef.current.duration;
  }, []);

  if (clips.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-border">
        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
            <span>视频拼接预览</span>
            <span className="text-[10px] text-white/40 font-normal">
              {currentIndex + 1} / {clips.length}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Video area */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {clip && (
            <video
              ref={videoRef}
              key={clip.url}
              src={clip.url}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          {/* Shot title overlay */}
          <div className="absolute top-3 left-4 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm">
            <span className="text-[11px] text-white/80 font-medium">
              镜头 {currentIndex + 1}
            </span>
            {clip?.title && (
              <span className="text-[10px] text-white/50 ml-2 truncate max-w-[200px] inline-block align-bottom">
                {clip.title}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 pb-4 pt-3 space-y-3">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {/* Segment indicators */}
            <div className="flex-1 flex gap-0.5 h-1.5 rounded-full overflow-hidden cursor-pointer" onClick={handleProgressClick}>
              {clips.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-full transition-all duration-300 rounded-full',
                    i < currentIndex
                      ? 'bg-primary'
                      : i === currentIndex
                        ? 'bg-primary/60 flex-[2]'
                        : 'bg-white/15',
                  )}
                  style={i === currentIndex ? { background: `linear-gradient(to right, hsl(var(--primary)) ${progress * 100}%, hsl(var(--primary) / 0.2) ${progress * 100}%)` } : undefined}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white disabled:opacity-20 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>

            <button
              onClick={goNext}
              disabled={currentIndex === clips.length - 1 && !loop}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white disabled:opacity-20 transition-colors"
            >
              {currentIndex === clips.length - 1 ? <SkipForward size={16} /> : <ChevronRight size={18} />}
            </button>

            <button
              onClick={() => setLoop(!loop)}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-colors ml-2',
                loop ? 'text-primary bg-primary/10' : 'text-white/30 hover:text-white/60',
              )}
              title="循环播放"
            >
              <Repeat size={14} />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
