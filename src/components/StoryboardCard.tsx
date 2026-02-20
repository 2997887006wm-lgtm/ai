import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, ImagePlus, MessageSquarePlus, Mic, Loader2 } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { supabase } from '@/integrations/supabase/client';
import { VoiceOverButton } from './VoiceOverButton';
import { ShotAudioPicker } from './ShotAudioPicker';

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
  imageUrl?: string;
}

interface StoryboardCardProps {
  shot: Shot;
  index: number;
  onUpdate: (id: number, field: keyof Shot, value: string) => void;
  onDelete: (id: number) => void;
  onInsertAfter: (id: number) => void;
}

function InlineField({ label, value, onChange, multiline = false, highlight = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="group">
      <label className="text-xs uppercase tracking-[0.12em] text-foreground/60 mb-1 block font-medium font-sans-clean">
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
          className={`w-full bg-transparent inline-editable px-2 py-1 outline-none ${
            highlight ? 'text-base font-semibold text-foreground' : 'text-sm'
          }`}
        />
      )}
    </div>
  );
}

export function StoryboardCard({ shot, index, onUpdate, onDelete, onInsertAfter }: StoryboardCardProps) {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingDialogue, setIsGeneratingDialogue] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(shot.imageUrl || null);

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

  const handleGenerateImage = async () => {
    if (!shot.visual.trim()) return;
    playClick();
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-shot-image', {
        body: { visual: shot.visual, shotType: shot.shotType },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
      }
    } catch (e: any) {
      console.error('Image generation error:', e);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateDialogue = async (mode: 'dialogue' | 'narration') => {
    if (!shot.visual.trim()) return;
    playClick();
    setIsGeneratingDialogue(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-dialogue', {
        body: {
          visual: shot.visual,
          shotType: shot.shotType,
          character: shot.character,
          duration: shot.duration,
          mode,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.text) {
        onUpdate(shot.id, 'dialogue', data.text);
      }
    } catch (e: any) {
      console.error('Dialogue generation error:', e);
    } finally {
      setIsGeneratingDialogue(false);
    }
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
          <span className="text-sm font-mono font-bold text-scarlet/70 w-10">#{shot.shotNumber}</span>
          <InlineField
            label="景别"
            value={shot.shotType}
            onChange={(v) => onUpdate(shot.id, 'shotType', v)}
            highlight
          />
          <InlineField
            label="预估时长"
            value={shot.duration}
            onChange={(v) => onUpdate(shot.id, 'duration', v)}
            highlight
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

        {/* Generated image */}
        {generatedImage && (
          <div className="mb-4 rounded-lg overflow-hidden border border-border">
            <img
              src={generatedImage}
              alt={shot.visual}
              className="w-full h-40 object-cover"
            />
          </div>
        )}

        {/* Visual + AI image button */}
        <div className="relative">
          <InlineField
            label="视觉画面"
            value={shot.visual}
            onChange={(v) => onUpdate(shot.id, 'visual', v)}
            multiline
          />
          <button
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || !shot.visual.trim()}
            className="absolute top-0 right-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground/50 hover:text-scarlet hover:bg-scarlet/5 transition-all duration-300 disabled:opacity-30"
            title="AI 生成参考配图"
          >
            {isGeneratingImage ? <Loader2 size={10} className="animate-spin" /> : <ImagePlus size={10} strokeWidth={2} />}
            AI配图
          </button>
        </div>

        {/* Dialogue + AI generate + VoiceOver */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="relative">
            <InlineField
              label="台词"
              value={shot.dialogue}
              onChange={(v) => onUpdate(shot.id, 'dialogue', v)}
              multiline
            />
            <div className="absolute top-0 right-0 flex gap-1">
              <button
                onClick={() => handleGenerateDialogue('dialogue')}
                disabled={isGeneratingDialogue || !shot.visual.trim()}
                className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-all duration-300 disabled:opacity-30"
                title="AI 生成台词"
              >
                {isGeneratingDialogue ? <Loader2 size={9} className="animate-spin" /> : <MessageSquarePlus size={9} strokeWidth={2} />}
                台词
              </button>
              <button
                onClick={() => handleGenerateDialogue('narration')}
                disabled={isGeneratingDialogue || !shot.visual.trim()}
                className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-all duration-300 disabled:opacity-30"
                title="AI 生成旁白口播"
              >
                <Mic size={9} strokeWidth={2} />
                口播
              </button>
              <VoiceOverButton text={shot.dialogue} />
            </div>
          </div>
          {/* Audio field + picker */}
          <div className="relative">
            <InlineField
              label="听觉营造"
              value={shot.audio}
              onChange={(v) => onUpdate(shot.id, 'audio', v)}
              multiline
            />
            <div className="absolute top-0 right-0">
              <ShotAudioPicker onSelect={(name) => onUpdate(shot.id, 'audio', name)} />
            </div>
          </div>
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
