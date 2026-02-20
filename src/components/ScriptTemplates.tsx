import { useState } from 'react';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { playClick } from '@/utils/audio';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ScriptTemplate {
  id: string;
  title: string;
  category: string;
  emoji: string;
  description: string;
  inspiration: string;
  mood: string;
  duration: 'short' | 'long';
}

const TEMPLATES: ScriptTemplate[] = [
  {
    id: 'rain-forest',
    title: '雨后森林漫步',
    category: '自然纪实',
    emoji: '🌿',
    description: '雨后森林的宁静时刻，丁达尔光线穿透树冠，蕨类植物上的水珠闪烁。适合治愈系短片。',
    inspiration: '雨后的亚热带森林，阳光穿过湿润的树冠形成丁达尔光线，一个背着画板的年轻女孩在林间小径上缓步前行，用手触碰蕨类植物上滑落的水珠，远处传来溪水声与鸟鸣',
    mood: 'healing',
    duration: 'short',
  },
  {
    id: 'night-city',
    title: '霓虹都市独白',
    category: '城市影像',
    emoji: '🌃',
    description: '深夜城市的独行者视角，霓虹灯光映照在雨后街面，展现都市孤独美学。',
    inspiration: '深夜两点的东京涩谷，雨刚停，霓虹灯倒映在湿漉漉的柏油路上。一个穿着风衣的中年男人站在十字路口，周围是匆匆而过的末班电车乘客。他点燃一支烟，烟雾在冷白灯光中缓缓升腾',
    mood: 'literary',
    duration: 'short',
  },
  {
    id: 'ocean-rescue',
    title: '暴风雨海上救援',
    category: '剧情长片',
    emoji: '🌊',
    description: '一场惊心动魄的海上救援行动，从暴风雨前的宁静到救援高潮再到雨后彩虹，完整的三幕剧结构。',
    inspiration: '北大西洋冬季，一艘渔船在突发暴风雨中遇险，海岸警卫队接到求救信号后展开营救。船长为保护年轻船员做出艰难抉择，最终在巨浪中完成救援。暴风雨散去后，幸存者在甲板上看到双彩虹',
    mood: 'passionate',
    duration: 'long',
  },
  {
    id: 'old-town',
    title: '消失的老街',
    category: '人文纪录',
    emoji: '🏘️',
    description: '记录即将拆迁的老城区最后的日常，从清晨到黄昏，市井烟火与时代变迁交织。',
    inspiration: '即将拆迁的南方老城区最后一个夏天。清晨，老人们在梧桐树下打太极；中午，巷子里飘来炸酱面的香气；傍晚，孩子们在青石板路上追逐嬉戏；夜晚，一盏昏黄的路灯下，老理发师为最后一位客人理发',
    mood: 'literary',
    duration: 'long',
  },
  {
    id: 'space-walk',
    title: '太空行走',
    category: '科幻短片',
    emoji: '🚀',
    description: '宇航员的太空行走视角，从空间站出舱到俯瞰地球的壮美瞬间。',
    inspiration: '国际空间站外，一名宇航员进行例行舱外维修任务。透过面罩玻璃，蓝色地球缓缓转动，太阳在地平线升起的瞬间，光芒照亮了整个太阳能板阵列，宇航员停下手中工作，静静凝视这颗蓝色星球',
    mood: 'epic',
    duration: 'short',
  },
  {
    id: 'mystery-hotel',
    title: '午夜旅馆',
    category: '悬疑惊悚',
    emoji: '🔍',
    description: '一个旅人深夜入住荒废旅馆，逐渐发现诡异细节的悬疑故事，层层递进的紧张感。',
    inspiration: '暴雨夜，一个独自驾车的女记者在山路上迷路，偶然发现一家仍亮着灯的老式旅馆。前台无人却有一把房间钥匙，房间里的日历停留在十年前，镜子里似乎映出了不属于她的影子，走廊尽头传来若有若无的钢琴声',
    mood: 'suspense',
    duration: 'long',
  },
  {
    id: 'food-story',
    title: '一碗面的故事',
    category: '美食人情',
    emoji: '🍜',
    description: '通过一碗面连接祖孙三代的温情故事，以食物为线索展现家庭羁绊。',
    inspiration: '一家经营了六十年的手工面馆，奶奶的老式揉面手法，父亲改良后的新配方汤底，孙女用手机直播带来了排队的年轻人。三代人围坐在后厨的小桌旁，各吃各喜欢的那碗面',
    mood: 'healing',
    duration: 'short',
  },
  {
    id: 'dance-battle',
    title: '地下舞台',
    category: '青春热血',
    emoji: '💃',
    description: '地下街舞battle的热血故事，从默默练习到舞台对决的燃情叙事。',
    inspiration: '废弃工厂改造的地下舞台，一个白天在快递站分拣包裹的少年，每晚在这里练习街舞。今夜是全城battle的决赛，对手是去年的冠军，聚光灯亮起的瞬间，所有的汗水和伤痛都化为了舞步中的力量',
    mood: 'passionate',
    duration: 'short',
  },
];

interface ScriptTemplatesProps {
  onUseTemplate: (inspiration: string, duration: 'short' | 'long', mood: string) => void;
}

export function ScriptTemplates({ onUseTemplate }: ScriptTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(TEMPLATES.map(t => t.category))];
  const filtered = selectedCategory
    ? TEMPLATES.filter(t => t.category === selectedCategory)
    : TEMPLATES;

  const handleUse = (template: ScriptTemplate) => {
    playClick();
    onUseTemplate(template.inspiration, template.duration, template.mood);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => { playClick(); setOpen(true); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50 transition-all duration-300"
        title="查看优质脚本模版"
      >
        <BookOpen size={13} strokeWidth={1.5} />
        <span className="hidden sm:inline">脚本模版</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif-cn">优质脚本模版</DialogTitle>
            <DialogDescription>选择一个模版快速开始创作，所有模版均可二次编辑</DialogDescription>
          </DialogHeader>

          {/* Category filter */}
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

          {/* Template list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filtered.map(t => (
              <div
                key={t.id}
                className="group border border-border rounded-lg p-4 hover:border-primary/30 hover:bg-primary/[0.02] transition-all cursor-pointer"
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
                        {t.duration === 'short' ? '短片' : '长片'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors mt-1 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
