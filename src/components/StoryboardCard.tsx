import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, ImagePlus, MessageSquarePlus, Mic, Loader2, Clapperboard } from 'lucide-react';
import { playClick } from '@/utils/audio';
import { supabase } from '@/integrations/supabase/client';
import { VoiceOverButton } from './VoiceOverButton';
import { ShotAudioPicker } from './ShotAudioPicker';
import { ShotCommentButton } from './ShotCommentButton';

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
  emotionIntensity?: number;
  dialogueSuggestion?: string;
  transition?: string;
}

interface StoryboardCardProps {
  shot: Shot;
  index: number;
  onUpdate: (id: number, field: keyof Shot, value: string) => void;
  onDelete: (id: number) => void;
  onInsertAfter: (id: number) => void;
  onGenerateShotVideo?: (shot: Shot) => void;
  isGeneratingVideo?: boolean;
  scriptId?: string | null;
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

export function StoryboardCard({ shot, index, onUpdate, onDelete, onInsertAfter, onGenerateShotVideo, isGeneratingVideo, scriptId }: StoryboardCardProps) {
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

  const [imageRatio, setImageRatio] = useState('16:9');

  const IMAGE_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'];

  const handleGenerateImage = async () => {
    if (!shot.visual.trim()) return;
    playClick();
    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-shot-image', {
        body: { visual: shot.visual, shotType: shot.shotType, imageRatio },
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
        {/* Transition badge */}
        {shot.transition && (
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary/70 border border-primary/15">
              ↓ {shot.transition}
            </span>
          </div>
        )}

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
          <div className="opacity-0 group-hover/card:opacity-100 flex items-center gap-1 transition-all duration-300">
            <ShotCommentButton scriptId={scriptId || null} shotId={shot.id} />
            <button
              onClick={() => { playClick(); onDelete(shot.id); }}
              className="text-muted-foreground/30 hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-colors"
              title="删除此分镜"
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
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
          <div className="absolute top-0 right-0 flex items-center gap-1">
            <select
              value={imageRatio}
              onChange={(e) => setImageRatio(e.target.value)}
              className="bg-transparent text-[10px] text-muted-foreground/50 border border-border/50 rounded px-1 py-0.5 outline-none cursor-pointer hover:border-border"
              title="选择配图比例"
            >
              {IMAGE_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !shot.visual.trim()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground/50 hover:text-scarlet hover:bg-scarlet/5 transition-all duration-300 disabled:opacity-30"
              title="AI 生成参考配图"
            >
              {isGeneratingImage ? <Loader2 size={10} className="animate-spin" /> : <ImagePlus size={10} strokeWidth={2} />}
              AI配图
            </button>
          </div>
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

            {/* Dialogue suggestion */}
            {shot.dialogueSuggestion && !shot.dialogue && (
              <div className="mt-1.5 p-2 rounded-md bg-primary/5 border border-primary/10">
                <p className="text-[10px] text-primary/60 mb-1">AI 台词建议：</p>
                <p className="text-xs text-foreground/70 italic leading-relaxed">"{shot.dialogueSuggestion}"</p>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => { onUpdate(shot.id, 'dialogue', shot.dialogueSuggestion!); }}
                    className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    采用
                  </button>
                  <button
                    onClick={() => { onUpdate(shot.id, 'dialogueSuggestion' as keyof Shot, ''); }}
                    className="text-[10px] px-2 py-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    忽略
                  </button>
                </div>
              </div>
            )}
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

        {/* Generate video for this shot */}
        {onGenerateShotVideo && (
          <div className="mt-4 pt-3 border-t border-border flex justify-end">
            <button
              onClick={() => { playClick(); onGenerateShotVideo(shot); }}
              disabled={isGeneratingVideo || !shot.visual.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 disabled:opacity-30"
              title="为此分镜生成视频片段"
            >
              {isGeneratingVideo ? <Loader2 size={12} className="animate-spin" /> : <Clapperboard size={12} strokeWidth={1.5} />}
              生成此镜视频
              <span className="text-[10px] text-muted-foreground/60">· 1积点</span>
            </button>
          </div>
        )}
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
