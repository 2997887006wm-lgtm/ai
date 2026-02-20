import { useState, useRef } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { playClick } from '@/utils/audio';

const VOICES = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', label: '女声·柔和' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', label: '男声·沉稳' },
  { id: 'EXAVITQu4vr4xnSDxMaL', label: '女声·清亮' },
  { id: 'nPczCjzI2devNBz1zQrb', label: '男声·磁性' },
];

interface VoiceOverButtonProps {
  text: string;
}

export function VoiceOverButton({ text }: VoiceOverButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    playClick();
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId: selectedVoice.id }),
        }
      );
      if (!response.ok) throw new Error(`TTS failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      setIsPlaying(true);
      audio.play();
      audio.onended = () => setIsPlaying(false);
    } catch (e) {
      console.error('TTS error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const stopPlayback = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground/50 hover:text-scarlet hover:bg-scarlet/5 transition-all duration-300"
          title="智能配音"
        >
          <Volume2 size={9} strokeWidth={2} />
          配音
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <p className="text-xs font-medium mb-2">选择音色</p>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {VOICES.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVoice(v)}
              className={`text-[10px] px-2 py-1.5 rounded-md border transition-all ${
                selectedVoice.id === v.id
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border hover:bg-secondary'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {isPlaying ? (
          <button onClick={stopPlayback} className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs">
            <Square size={10} /> 停止播放
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !text.trim()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs disabled:opacity-30"
          >
            {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Volume2 size={10} />}
            {isGenerating ? '生成中...' : '生成配音'}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
