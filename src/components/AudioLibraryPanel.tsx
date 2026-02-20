import { useState, useRef, useCallback } from 'react';
import { Music, Volume2, Search, Upload, Play, Pause, Square, X, Loader2 } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { supabase } from '@/integrations/supabase/client';

interface FreesoundResult {
  id: string;
  name: string;
  duration: string;
  previewUrl: string;
  tags: string[];
  author: string;
}

interface AudioLibraryPanelProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (item: { name: string; previewUrl: string }) => void;
}

export function AudioLibraryPanel({ visible, onClose, onSelect }: AudioLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<FreesoundResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('freesound-search', {
        body: { query: search.trim() },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setResults(data?.results || []);
      if ((data?.results || []).length === 0) setError('未找到匹配的音效');
    } catch (e: any) {
      console.error('Freesound search error:', e);
      setError(e.message || '搜索失败');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [search]);

  const togglePlay = useCallback((item: FreesoundResult) => {
    playClick();
    if (playingId === item.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(item.previewUrl);
    audio.onended = () => setPlayingId(null);
    audio.play().catch(console.error);
    audioRef.current = audio;
    setPlayingId(item.id);
  }, [playingId]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-elevated animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Music size={16} strokeWidth={1.5} className="text-scarlet" />
            <h3 className="text-sm font-serif-cn text-foreground">音效与音乐库</h3>
            <span className="text-[10px] text-muted-foreground/40 ml-1">powered by Freesound</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors p-1">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索音效... 如 rain, footsteps, piano"
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary/50 border border-transparent focus:border-border text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-300"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !search.trim()}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : '搜索'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="px-6 pb-6 max-h-[360px] overflow-y-auto">
          {error && (
            <p className="text-xs text-muted-foreground/50 text-center py-8">{error}</p>
          )}
          {!error && results.length === 0 && !isSearching && (
            <div className="text-center py-12">
              <Volume2 size={24} strokeWidth={1} className="mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-xs text-muted-foreground/40">输入关键词搜索 Freesound 音效库</p>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {results.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-all duration-300 group cursor-pointer"
                onClick={() => onSelect?.({ name: item.name, previewUrl: item.previewUrl })}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(item); }}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:border-foreground/30 transition-all duration-300 shrink-0"
                >
                  {playingId === item.id
                    ? <Square size={8} strokeWidth={2} className="fill-current" />
                    : <Play size={10} strokeWidth={2} className="ml-0.5" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground/40 truncate">
                    {item.tags.join(' · ')} — {item.author}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground/30 tabular-nums shrink-0">{item.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
