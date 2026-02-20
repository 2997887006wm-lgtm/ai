import { useEffect } from 'react';
import { playOpen } from '@/utils/audio';

const STYLES = [
  {
    id: 'cinematic',
    title: '电影叙事',
    desc: '沉稳的镜头语言，注重光影与构图，适合情感深度叙事',
    mood: '沉静 · 深邃',
  },
  {
    id: 'documentary',
    title: '纪实手记',
    desc: '真实质朴的视角，手持镜头感，呈现生活本来的纹理',
    mood: '真实 · 朴素',
  },
  {
    id: 'poetic',
    title: '诗意影像',
    desc: '如散文诗般流淌的画面，意象丰富，留白与隐喻交织',
    mood: '空灵 · 写意',
  },
  {
    id: 'commercial',
    title: '品牌叙事',
    desc: '精致的商业美学，节奏明快，信息传达清晰有力',
    mood: '精致 · 有力',
  },
];

interface StyleDrawerProps {
  visible: boolean;
  onSelect: (styleId: string) => void;
  onClose: () => void;
}

export function StyleDrawer({ visible, onSelect, onClose }: StyleDrawerProps) {
  useEffect(() => {
    if (visible) playOpen();
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/5 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-3xl mb-0 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-card rounded-t-2xl shadow-elevated p-8 pb-10">
          <p className="text-sm text-muted-foreground mb-6 font-serif-cn">请为您的灵感选取一种叙事风格</p>
          <div className="grid grid-cols-2 gap-4">
            {STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => onSelect(style.id)}
                className="text-left p-5 rounded-xl border border-border hover:border-scarlet-glow hover:shadow-scarlet transition-all duration-300 group"
              >
                <h3 className="text-base font-serif-cn font-medium text-foreground mb-1 group-hover:text-scarlet transition-colors">
                  {style.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">{style.desc}</p>
                <span className="text-[10px] text-muted-foreground/50 tracking-widest uppercase">
                  {style.mood}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
