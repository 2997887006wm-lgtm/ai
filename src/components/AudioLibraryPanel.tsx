import { useState } from 'react';
import { Music, Volume2, Search, Upload, Play, Pause, FolderOpen, X } from 'lucide-react';
import { playClick } from '@/utils/audio';

interface AudioItem {
  id: string;
  name: string;
  category: string;
  duration: string;
  source: 'local' | 'library';
}

const MOCK_SFX: AudioItem[] = [
  { id: 'sfx-1', name: '雨滴落在窗台', category: '自然', duration: '0:12', source: 'library' },
  { id: 'sfx-2', name: '晨间鸟鸣', category: '自然', duration: '0:18', source: 'library' },
  { id: 'sfx-3', name: '纸张翻动', category: '拟音', duration: '0:03', source: 'library' },
  { id: 'sfx-4', name: '脚步·碎石路', category: '拟音', duration: '0:06', source: 'library' },
  { id: 'sfx-5', name: '城市远景环境声', category: '环境', duration: '0:30', source: 'library' },
];

const MOCK_MUSIC: AudioItem[] = [
  { id: 'bgm-1', name: '静谧弦乐 — 叹息般温柔', category: '弦乐', duration: '2:45', source: 'library' },
  { id: 'bgm-2', name: '钢琴独白 — 雨后', category: '钢琴', duration: '3:12', source: 'library' },
  { id: 'bgm-3', name: '电子氛围 — 都市脉搏', category: '电子', duration: '2:58', source: 'library' },
  { id: 'bgm-4', name: '古筝留白 — 山水间', category: '国风', duration: '4:01', source: 'library' },
];

interface AudioLibraryPanelProps {
  visible: boolean;
  onClose: () => void;
  onSelect?: (item: AudioItem) => void;
}

export function AudioLibraryPanel({ visible, onClose, onSelect }: AudioLibraryPanelProps) {
  const [tab, setTab] = useState<'sfx' | 'music'>('sfx');
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!visible) return null;

  const items = tab === 'sfx' ? MOCK_SFX : MOCK_MUSIC;
  const filtered = search
    ? items.filter(i => i.name.includes(search) || i.category.includes(search))
    : items;

  const togglePlay = (id: string) => {
    playClick();
    setPlayingId(prev => prev === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/10 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-elevated animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Music size={16} strokeWidth={1.5} className="text-scarlet" />
            <h3 className="text-sm font-serif-cn text-foreground">音效与音乐库</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground/40 hover:text-foreground transition-colors p-1">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 px-6 pt-4">
          <button
            onClick={() => setTab('sfx')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              tab === 'sfx' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Volume2 size={12} strokeWidth={1.5} className="inline mr-1.5 -mt-px" />
            音效
          </button>
          <button
            onClick={() => setTab('music')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
              tab === 'music' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Music size={12} strokeWidth={1.5} className="inline mr-1.5 -mt-px" />
            音乐
          </button>
          <div className="flex-1" />
          <button
            onClick={playClick}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] text-muted-foreground hover:text-foreground border border-border hover:bg-secondary transition-all duration-300"
          >
            <Upload size={10} strokeWidth={2} />
            导入本地
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3">
          <div className="relative">
            <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索音效或音乐..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary/50 border border-transparent focus:border-border text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-300"
            />
          </div>
        </div>

        {/* List */}
        <div className="px-6 pb-6 max-h-[360px] overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            {filtered.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/60 transition-all duration-300 group cursor-pointer"
                onClick={() => onSelect?.(item)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(item.id); }}
                  className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:border-foreground/30 transition-all duration-300 shrink-0"
                >
                  {playingId === item.id
                    ? <Pause size={10} strokeWidth={2} />
                    : <Play size={10} strokeWidth={2} className="ml-0.5" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground/40">{item.category}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/30 tabular-nums shrink-0">{item.duration}</span>
                <span className="text-[10px] text-muted-foreground/20 shrink-0">
                  {item.source === 'local' ? <FolderOpen size={10} /> : null}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground/40 text-center py-8">无匹配结果</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
