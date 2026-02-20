import { ScrollText } from 'lucide-react';

const HISTORY_ITEMS = [
  { id: 1, title: '秋日咖啡馆的温柔独白', date: '2026-02-18', style: '诗意影像' },
  { id: 2, title: '城市边缘的夜行者', date: '2026-02-15', style: '电影叙事' },
  { id: 3, title: '手工皮具品牌宣传片', date: '2026-02-10', style: '品牌叙事' },
];

export function HistoryPanel() {
  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <h2 className="text-lg font-serif-cn text-foreground mb-6">历史剧本</h2>
      <div className="flex flex-col gap-3">
        {HISTORY_ITEMS.map((item) => (
          <button
            key={item.id}
            className="text-left p-5 rounded-xl border border-border bg-card hover:shadow-card transition-all duration-300 group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <ScrollText size={14} strokeWidth={1.2} className="text-muted-foreground/30 mt-1" />
                <div>
                  <p className="text-sm text-foreground font-serif-cn group-hover:text-scarlet transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground/40 mt-1">{item.style}</p>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground/30 tabular-nums">{item.date}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
