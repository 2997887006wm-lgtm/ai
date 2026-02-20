import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { playClick } from '@/utils/audio';

interface InspirationInputProps {
  onGenerate: (inspiration: string, duration: 'short' | 'long') => void;
  isGenerating: boolean;
}

export function InspirationInput({ onGenerate, isGenerating }: InspirationInputProps) {
  const [inspiration, setInspiration] = useState('');
  const [duration, setDuration] = useState<'short' | 'long'>('short');

  const handleGenerate = () => {
    if (!inspiration.trim()) return;
    playClick();
    onGenerate(inspiration, duration);
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
          />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-4">
          {/* Duration capsule toggle */}
          <div className="capsule-toggle">
            <button
              onClick={() => { setDuration('short'); playClick(); }}
              className={`capsule-option ${duration === 'short' ? 'capsule-option-active' : 'capsule-option-inactive'}`}
            >
              轻巧短片 (&lt;60s)
            </button>
            <button
              onClick={() => { setDuration('long'); playClick(); }}
              className={`capsule-option ${duration === 'long' ? 'capsule-option-active' : 'capsule-option-inactive'}`}
            >
              深度长片
            </button>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!inspiration.trim() || isGenerating}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-medium transition-all duration-300 hover:shadow-elevated disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Sparkles size={14} strokeWidth={1.5} />
            {isGenerating ? '灵感酝酿中...' : '生成脚本'}
          </button>
        </div>
      </div>
    </div>
  );
}
