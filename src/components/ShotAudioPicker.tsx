import { useState, useRef } from 'react';
import { Music, Search, Play, Pause, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { playClick } from '@/utils/audio';

interface ShotAudioPickerProps {
  onSelect: (audioName: string) => void;
}

export function ShotAudioPicker({ onSelect }: ShotAudioPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('freesound-search', {
        body: { query },
      });
      if (error) throw error;
      setResults(data?.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = (item: any) => {
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(item.previewUrl);
      audio.play();
      audioRef.current = audio;
      setPlayingId(item.id);
      audio.onended = () => setPlayingId(null);
    }
  };

  const selectAudio = (item: any) => {
    onSelect(item.name);
    setOpen(false);
    playClick();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-foreground/70 bg-secondary/80 border border-border hover:text-foreground hover:bg-secondary hover:border-foreground/20 transition-all duration-300"
          title="搜索音效"
        >
          <Music size={10} strokeWidth={2} />
          选音效
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="flex gap-1.5 mb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder="搜索音效关键词..."
            className="flex-1 text-xs px-2 py-1.5 rounded-md border border-border bg-background outline-none focus:border-foreground/30 transition-colors"
          />
          <button onClick={search} disabled={loading} className="p-1.5 rounded-md border border-border hover:bg-secondary transition-colors">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto space-y-0.5">
          {results.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-xs transition-colors"
              onClick={() => selectAudio(r)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(r); }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                {playingId === r.id ? <Pause size={10} /> : <Play size={10} />}
              </button>
              <span className="flex-1 truncate">{r.name}</span>
              <span className="text-muted-foreground/50 shrink-0">{r.duration}</span>
            </div>
          ))}
          {results.length === 0 && !loading && (
            <p className="text-[10px] text-muted-foreground/50 text-center py-3">输入关键词搜索音效</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
