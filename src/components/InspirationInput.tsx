import { useState } from 'react';
import { Sparkles, Square, Pencil } from 'lucide-react';
import { playClick } from '@/utils/audio';

const MOODS = [
  { id: 'healing', label: '治愈', emoji: '🌿' },
  { id: 'funny', label: '搞笑', emoji: '😄' },
  { id: 'suspense', label: '悬疑', emoji: '🔍' },
  { id: 'passionate', label: '热血', emoji: '🔥' },
  { id: 'literary', label: '文艺', emoji: '📖' },
  { id: 'horror', label: '恐怖', emoji: '👻' },
  { id: 'romantic', label: '浪漫', emoji: '💕' },
  { id: 'epic', label: '史诗', emoji: '⚔️' },
];

interface InspirationInputProps {
  onGenerate: (inspiration: string, duration: 'short' | 'long', mood: string) => void;
  onCancel?: () => void;
  isGenerating: boolean;
}

export function InspirationInput({ onGenerate, onCancel, isGenerating }: InspirationInputProps) {
  const [inspiration, setInspiration] = useState('');
  const [duration, setDuration] = useState<'short' | 'long'>('short');
  const [mood, setMood] = useState('');

  const handleGenerate = () => {
    if (!inspiration.trim()) return;
    playClick();
    onGenerate(inspiration, duration, mood);
  };

  const handleCancel = () => {
    playClick();
    onCancel?.();
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="flex flex-col gap-6">
        {/* Main input */}
        <div className="relative">
          <textarea
            value={inspiration}
            onChange={(e) => setInspiration(e.target.value)}
            placeholder="在此输入您的核心灵感..."
            className="w-full bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder:text-muted-foreground/40 font-serif-cn min-h-[120px] px-1 py-2"
            rows={4}
            disabled={isGenerating}
          />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Mood selector */}
        <div>
          <p className="text-xs text-muted-foreground/60 mb-2 uppercase tracking-widest font-medium">情绪风格</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => { setMood(mood === m.id ? '' : m.id); playClick(); }}
                disabled={isGenerating}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all duration-300 ${
                  mood === m.id
                    ? 'border-foreground bg-foreground text-background shadow-sm'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span>{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4">
          {/* Duration capsule toggle */}
          <div className="capsule-toggle">
            <button
              onClick={() => { setDuration('short'); playClick(); }}
              disabled={isGenerating}
              className={`capsule-option ${duration === 'short' ? 'capsule-option-active' : 'capsule-option-inactive'}`}
            >
              轻巧短片 (&lt;60s)
            </button>
            <button
              onClick={() => { setDuration('long'); playClick(); }}
              disabled={isGenerating}
              className={`capsule-option ${duration === 'long' ? 'capsule-option-active' : 'capsule-option-inactive'}`}
            >
              深度长片
            </button>
          </div>

          {/* Generate / Cancel buttons */}
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <>
                {/* Generating indicator */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs">灵感酝酿中</span>
                </div>

                {/* Cancel button */}
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-destructive/30 text-destructive text-sm font-medium transition-all duration-300 hover:bg-destructive/10 hover:border-destructive/50"
                >
                  <Square size={12} strokeWidth={2} fill="currentColor" />
                  停止
                </button>

                {/* Edit button */}
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm text-foreground font-medium transition-all duration-300 hover:bg-secondary"
                >
                  <Pencil size={12} strokeWidth={1.5} />
                  重新编辑
                </button>
              </>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!inspiration.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-medium transition-all duration-300 hover:shadow-elevated disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Sparkles size={14} strokeWidth={1.5} />
                生成脚本
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
