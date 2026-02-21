import { useState } from 'react';
import { Loader2, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playClick } from '@/utils/audio';
import type { Shot } from './StoryboardCard';

interface ScriptParserPanelProps {
  onParsed: (shots: Shot[]) => void;
  isVisible: boolean;
}

let parserShotId = 50000;

const EXAMPLE_TEXTS = [
  {
    label: '文艺短片',
    text: '清晨的阳光透过薄雾洒在古老的石板路上，一个背着画架的女孩缓缓走过。她在街角停下，望着对面那扇褪色的蓝色木门，嘴角浮现一丝若有似无的微笑。风吹起她的发丝，也吹落了门前那棵老槐树的最后一片叶子。她弯腰捡起那片叶子，夹进速写本里，然后继续向前走去。远处的钟楼传来沉稳的钟声，整个小镇在晨光中缓缓苏醒。',
  },
  {
    label: '动作场景',
    text: '暴雨如注，霓虹灯在湿漉漉的街道上投下斑斓的倒影。一个黑衣人从暗巷中冲出，身后传来急促的脚步声和呼喊。他翻过一道铁栏杆，落在对面的天台上，雨水从他脸颊滑落。追兵已经逼近，他深吸一口气，纵身跃下三层楼高的间隙，稳稳落在垃圾箱的遮雨棚上，翻滚着落地，消失在迷宫般的小巷深处。',
  },
];

export function ScriptParserPanel({ onParsed, isVisible }: ScriptParserPanelProps) {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  if (!isVisible) return null;

  const handleParse = async () => {
    if (!text.trim() || text.trim().length < 10) {
      toast.error('请输入至少10个字的脚本文案');
      return;
    }
    playClick();
    setIsParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-script', {
        body: { text: text.trim() },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.shots && Array.isArray(data.shots)) {
        const parsed: Shot[] = data.shots.map((s: any, i: number) => ({
          id: parserShotId++,
          shotNumber: String(i + 1).padStart(2, '0'),
          shotType: s.shotType || '中景',
          visual: s.visual || '',
          duration: s.duration || '4s',
          dialogue: s.dialogue || '',
          audio: s.audio || '',
          character: s.character || '',
          directorNote: s.directorNote || '',
          emotionIntensity: typeof s.emotionIntensity === 'number' ? s.emotionIntensity : 50,
        }));
        onParsed(parsed);
        toast.success(`已智能拆分为 ${parsed.length} 个分镜，并补充了镜头语言`);
      }
    } catch (e: any) {
      console.error('Script parse error:', e);
      toast.error(e.message || '脚本解析失败，请重试');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={18} className="text-primary" strokeWidth={1.5} />
          <h3 className="text-lg font-serif-cn font-medium text-foreground">智能剧本解析器</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          粘贴一段连续的剧本文案，AI将自动拆分为短镜头，并将文学语言转化为具象画面描述，补充景别、运镜和光影风格。
        </p>
      </div>

      {/* Example buttons */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] text-muted-foreground/50">示例：</span>
        {EXAMPLE_TEXTS.map((ex) => (
          <button
            key={ex.label}
            onClick={() => { playClick(); setText(ex.text); }}
            className="px-2.5 py-1 rounded-md text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在此粘贴你的剧本文案、故事大纲、或任何连续性文字描述…&#10;&#10;例如：清晨的阳光透过薄雾洒在古老的石板路上，一个背着画架的女孩缓缓走过……"
        className="w-full h-48 p-4 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-primary/40 transition-colors leading-relaxed"
      />

      <div className="flex items-center justify-between mt-4">
        <span className="text-[11px] text-muted-foreground/50">
          {text.length > 0 ? `${text.length} 字 · 预估 ${Math.max(1, Math.ceil(text.length / 75))} 个分镜` : '建议输入 50-2000 字的连续文案'}
        </span>
        <button
          onClick={handleParse}
          disabled={isParsing || text.trim().length < 10}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isParsing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              解析中…
            </>
          ) : (
            <>
              <Sparkles size={14} strokeWidth={2} />
              智能拆分
              <ArrowRight size={14} strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
