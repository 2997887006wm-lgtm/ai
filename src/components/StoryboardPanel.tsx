import { useCallback } from 'react';
import { StoryboardCard, type Shot } from './StoryboardCard';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface StoryboardPanelProps {
  shots: Shot[];
  onUpdateShot: (id: number, field: keyof Shot, value: string) => void;
  onReorderShots: (activeId: number, overId: number) => void;
  onDeleteShot: (id: number) => void;
  onInsertShot: (afterId: number) => void;
  onAddShot: () => void;
  credits: number;
  onPreview: () => void;
  onGenerateVideo: () => void;
}

export function StoryboardPanel({ shots, onUpdateShot, onReorderShots, onDeleteShot, onInsertShot, onAddShot, credits, onPreview, onGenerateVideo }: StoryboardPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderShots(active.id as number, over.id as number);
    }
  }, [onReorderShots]);

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
        >
          <Plus size={12} strokeWidth={2} />
          添加分镜
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext items={shots.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-5">
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
      </DndContext>

      {/* Export actions */}
      <div
        className="flex items-center justify-center gap-4 mt-10 pt-8 border-t border-border animate-fade-in"
        style={{ animationDelay: `${shots.length * 100 + 200}ms`, animationFillMode: 'both' }}
      >
        <button
          onClick={() => { playClick(); onPreview(); }}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm text-foreground hover:bg-secondary transition-all duration-300"
        >
          <Eye size={14} strokeWidth={1.5} />
          预览 & 导出
        </button>
        <button
          onClick={() => { playClick(); onGenerateVideo(); }}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-border text-sm transition-all duration-300 hover:border-scarlet-glow hover:shadow-scarlet text-foreground"
        >
          <Clapperboard size={14} strokeWidth={1.5} className="text-scarlet" />
          一键生成视频
          <span className="text-[10px] text-muted-foreground ml-1">(5积点)</span>
        </button>
      </div>
    </div>
  );
}
