import { useState, useEffect } from 'react';
import { BookOpen, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { playClick } from '@/utils/audio';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Shot } from './StoryboardCard';

interface DbTemplate {
  id: string;
  title: string;
  category: string;
  emoji: string;
  description: string;
  mood: string;
  duration_type: string;
  shots: any[];
  is_official: boolean;
}

let templateShotId = 50000;

interface ScriptTemplatesProps {
  onUseTemplate: (inspiration: string, duration: 'short' | 'long', mood: string) => void;
  onLoadShots?: (shots: Shot[], title: string, duration: 'short' | 'long', mood: string) => void;
}

export function ScriptTemplates({ onUseTemplate, onLoadShots }: ScriptTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DbTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('script_templates')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setTemplates((data as DbTemplate[]) || []);
    } catch (e) {
      console.error('Failed to fetch templates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && templates.length === 0) {
      fetchTemplates();
    }
  }, [open]);

  const categories = [...new Set(templates.map(t => t.category))];
  const filtered = selectedCategory
    ? templates.filter(t => t.category === selectedCategory)
    : templates;

  const handleUse = (template: DbTemplate) => {
    playClick();
    if (onLoadShots) {
      const shots: Shot[] = (template.shots as any[]).map((s: any) => ({
        ...s,
        id: templateShotId++,
      }));
      const dur = template.duration_type === 'long' ? 'long' : 'short';
      onLoadShots(shots, template.title, dur, template.mood);
    } else {
      const dur = template.duration_type === 'long' ? 'long' : 'short';
      onUseTemplate('', dur, template.mood);
    }
    setOpen(false);
    setPreviewTemplate(null);
  };

  const handlePreview = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    playClick();
    setPreviewTemplate(previewTemplate === id ? null : id);
  };

  return (
    <>
      <button
        onClick={() => { playClick(); setOpen(true); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all duration-300"
        title="查看分镜脚本模版"
      >
        <BookOpen size={13} strokeWidth={1.5} />
        <span className="hidden sm:inline">脚本模版</span>
      </button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPreviewTemplate(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif-cn">分镜脚本模版</DialogTitle>
            <DialogDescription>每个模版包含完整的分镜头脚本（景别、画面、台词、音效），可直接加载到操作板编辑</DialogDescription>
          </DialogHeader>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 py-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                  !selectedCategory ? 'bg-foreground text-background' : 'text-muted-foreground border border-border hover:border-foreground/30'
                }`}
              >
                全部
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                    selectedCategory === c ? 'bg-foreground text-background' : 'text-muted-foreground border border-border hover:border-foreground/30'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Template list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 size={20} className="animate-spin mr-2" />
                加载模版中...
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground/50 text-center py-12">暂无模版</p>
            )}

            {filtered.map(t => (
              <div key={t.id} className="border border-border rounded-lg hover:border-primary/30 hover:bg-primary/[0.02] transition-all">
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => handleUse(t)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-foreground">{t.title}</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                          {t.category}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/70">
                          {(t.shots as any[]).length} 个分镜
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handlePreview(e, t.id)}
                        className="text-[10px] px-2 py-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-secondary border border-border transition-all"
                        title="预览分镜"
                      >
                        <Eye size={12} />
                      </button>
                      <ChevronRight size={14} className="text-muted-foreground/30" />
                    </div>
                  </div>
                </div>

                {/* Shot preview */}
                {previewTemplate === t.id && (
                  <div className="border-t border-border bg-secondary/30 px-4 py-3 space-y-2 animate-fade-in">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">分镜预览</p>
                    {(t.shots as any[]).map((shot: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-scarlet/70 font-mono font-bold w-6 shrink-0">#{shot.shotNumber}</span>
                        <span className="text-foreground/80 font-medium w-14 shrink-0">{shot.shotType}</span>
                        <span className="text-muted-foreground flex-1 leading-relaxed">{shot.visual}</span>
                        <span className="text-muted-foreground/50 w-8 shrink-0 text-right">{shot.duration}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
