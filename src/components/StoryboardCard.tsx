import { useState } from 'react';

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

export function StoryboardCard({ shot, index, onUpdate }: StoryboardCardProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card p-6 shadow-soft hover:shadow-card transition-all duration-500 animate-fade-in-up"
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 mb-5">
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
  );
}

export type { Shot };
