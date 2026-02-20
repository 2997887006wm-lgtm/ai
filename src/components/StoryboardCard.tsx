import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { playClick } from '@/utils/audio';

interface Shot {
  id: number;
  shotNumber: string;
  shotType: string;
  visual: string;
  duration: string;
  dialogue: string;
  audio: string;
  character: string;
  directorNote: string;
}

interface StoryboardCardProps {
  shot: Shot;
  index: number;
  onUpdate: (id: number, field: keyof Shot, value: string) => void;
  onDelete: (id: number) => void;
  onInsertAfter: (id: number) => void;
}

function InlineField({ label, value, onChange, multiline = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="group">
      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 mb-1 block font-sans-clean">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent inline-editable px-2 py-1.5 text-sm leading-relaxed resize-none min-h-[60px] outline-none"
          rows={3}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent inline-editable px-2 py-1 text-sm outline-none"
        />
      )}
    </div>
  );
}

export function StoryboardCard({ shot, index, onUpdate, onDelete, onInsertAfter }: StoryboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    animationDelay: `${index * 100}ms`,
    animationFillMode: 'both' as const,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div className="group/card">
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border border-border bg-card p-6 shadow-soft hover:shadow-card transition-all duration-500 animate-fade-in-up relative"
      >
        {/* Header row */}
        <div className="flex items-center gap-4 mb-5">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors touch-none"
            aria-label="拖拽排序"
          >
            <GripVertical size={16} strokeWidth={1.5} />
          </button>
          <span className="text-xs font-mono text-muted-foreground/40 w-8">#{shot.shotNumber}</span>
          <InlineField
            label="景别"
            value={shot.shotType}
            onChange={(v) => onUpdate(shot.id, 'shotType', v)}
          />
          <InlineField
            label="预估时长"
            value={shot.duration}
            onChange={(v) => onUpdate(shot.id, 'duration', v)}
          />
          <div className="flex-1" />
          <button
            onClick={() => { playClick(); onDelete(shot.id); }}
            className="opacity-0 group-hover/card:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all duration-300 p-1.5 rounded-lg hover:bg-destructive/5"
            title="删除此分镜"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Visual */}
        <InlineField
          label="视觉画面"
          value={shot.visual}
          onChange={(v) => onUpdate(shot.id, 'visual', v)}
          multiline
        />

        <div className="grid grid-cols-2 gap-4 mt-4">
          <InlineField
            label="台词"
            value={shot.dialogue}
            onChange={(v) => onUpdate(shot.id, 'dialogue', v)}
            multiline
          />
          <InlineField
            label="听觉营造"
            value={shot.audio}
            onChange={(v) => onUpdate(shot.id, 'audio', v)}
            multiline
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <InlineField
            label="角色侧写"
            value={shot.character}
            onChange={(v) => onUpdate(shot.id, 'character', v)}
          />
          <InlineField
            label="导演手记"
            value={shot.directorNote}
            onChange={(v) => onUpdate(shot.id, 'directorNote', v)}
          />
        </div>
      </div>

      {/* Insert button between cards */}
      <div className="flex justify-center -my-2 relative z-10">
        <button
          onClick={() => { playClick(); onInsertAfter(shot.id); }}
          className="opacity-0 group-hover/card:opacity-100 flex items-center gap-1 px-3 py-1 rounded-full text-[10px] text-muted-foreground/50 hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-all duration-300"
          title="在此后插入新分镜"
        >
          <Plus size={10} strokeWidth={2} />
          插入分镜
        </button>
      </div>
    </div>
  );
}

export type { Shot };
