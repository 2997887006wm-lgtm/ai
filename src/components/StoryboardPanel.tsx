import { useCallback, useState } from 'react';
import { StoryboardCard, type Shot } from './StoryboardCard';
import { EmotionCurveChart } from './EmotionCurveChart';
import { Clapperboard, Plus, Eye } from 'lucide-react';
import { playClick } from '@/utils/audio';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

const VIDEO_RATIOS = [
  { id: '16:9', label: '16:9', desc: '横屏' },
  { id: '9:16', label: '9:16', desc: '竖屏' },
  { id: '1:1', label: '1:1', desc: '方形' },
  { id: '4:3', label: '4:3', desc: '传统' },
  { id: '3:4', label: '3:4', desc: '竖版' },
];

interface StoryboardPanelProps {
  shots: Shot[];
  onUpdateShot: (id: number, field: keyof Shot, value: string) => void;
  onReorderShots: (activeId: number, overId: number) => void;
  onDeleteShot: (id: number) => void;
  onInsertShot: (afterId: number) => void;
  onAddShot: () => void;
  credits: number;
  onPreview: () => void;
  onGenerateVideo: (ratio?: string) => void;
}

export function StoryboardPanel({ shots, onUpdateShot, onReorderShots, onDeleteShot, onInsertShot, onAddShot, credits, onPreview, onGenerateVideo }: StoryboardPanelProps) {
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [selectedRatio, setSelectedRatio] = useState('16:9');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = useCallback((event: any) => {
    setActiveDragId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderShots(active.id as number, over.id as number);
    }
  }, [onReorderShots]);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const activeDragShot = activeDragId ? shots.find(s => s.id === activeDragId) : null;

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-serif-cn text-foreground mb-1">沉浸式分镜操作板</h2>
          <p className="text-xs text-muted-foreground">所有字段均可直接编辑 · 拖拽手柄调整顺序</p>
        </div>
        <button
          onClick={() => { playClick(); onAddShot(); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300"
          aria-label="添加新分镜"
        >
          <Plus size={12} strokeWidth={2} />
          添加分镜
        </button>
      </div>

      {/* Emotion Curve Chart */}
      <EmotionCurveChart shots={shots} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={shots.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-5" role="list" aria-label="分镜列表">
            {shots.map((shot, i) => (
              <StoryboardCard
                key={shot.id}
                shot={shot}
                index={i}
                onUpdate={onUpdateShot}
                onDelete={onDeleteShot}
                onInsertAfter={onInsertShot}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay for professional feedback */}
        <DragOverlay dropAnimation={null}>
          {activeDragShot && (
            <div className="rounded-xl border-2 border-primary/20 bg-card/95 p-4 shadow-elevated backdrop-blur-sm opacity-90 pointer-events-none">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-primary/70">#{activeDragShot.shotNumber}</span>
                <span className="text-sm font-medium text-foreground">{activeDragShot.shotType}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{activeDragShot.visual}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Video ratio + Export actions */}
      <div className="mt-10 pt-8 border-t border-border animate-fade-in"
        style={{ animationDelay: `${shots.length * 100 + 200}ms`, animationFillMode: 'both' }}
      >
        {/* Ratio selector */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <span className="text-xs text-muted-foreground/60">画面比例</span>
          <div className="flex gap-1.5">
            {VIDEO_RATIOS.map(r => (
              <button
                key={r.id}
                onClick={() => { playClick(); setSelectedRatio(r.id); }}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all duration-300 ${
                  selectedRatio === r.id
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground/60 hover:text-foreground border border-border hover:border-foreground/30'
                }`}
                title={r.desc}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => { playClick(); onPreview(); }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm text-foreground hover:bg-secondary transition-all duration-300"
            aria-label="预览并导出脚本"
          >
            <Eye size={14} strokeWidth={1.5} />
            预览 & 导出
          </button>
          <button
            onClick={() => { playClick(); onGenerateVideo(selectedRatio); }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm transition-all duration-300 hover:border-scarlet-glow hover:shadow-scarlet text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="使用AI一键生成视频，消耗5积点"
          >
            <Clapperboard size={14} strokeWidth={1.5} className="text-scarlet" />
            一键生成视频
            <span className="text-[10px] text-muted-foreground ml-1">({selectedRatio} · 5积点)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
