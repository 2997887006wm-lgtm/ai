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
  {
    id: 'ancient-silk-road',
    title: '丝路驼铃',
    category: '历史史诗',
    emoji: '🐫',
    description: '唐代丝绸之路上一支商队穿越沙漠的壮阔旅程，展现文明交汇之美。',
    inspiration: '唐代，一支由波斯商人与汉族镖师组成的驼队从长安出发，穿过河西走廊，行经大漠戈壁。黄沙漫天中，驼铃声回荡在玉门关外，商队在绿洲集市上用丝绸换取香料和宝石，篝火旁不同语言的人们分享着各自故乡的故事',
    mood: 'epic',
    duration: 'long',
  },
  {
    id: 'wedding-surprise',
    title: '婚礼惊喜',
    category: '爱情喜剧',
    emoji: '💒',
    description: '新郎精心策划的婚礼惊喜，从秘密筹备到新娘感动落泪的温馨喜剧。',
    inspiration: '新郎瞒着新娘召集了她散落在世界各地的闺蜜，在婚礼现场一个个从幕布后走出。新娘从惊讶到不敢相信再到喜极而泣，最后所有人围成一圈跳起了大学时代的班舞，宾客们从感动到欢笑',
    mood: 'romantic',
    duration: 'short',
  },
  {
    id: 'robot-child',
    title: '最后的陪伴',
    category: '科幻温情',
    emoji: '🤖',
    description: '一个AI陪伴型机器人与独居老人之间的温情故事，探讨科技与人性的边界。',
    inspiration: '2045年，一位独居的退休教师收到了儿女送来的AI陪伴机器人。起初她抗拒冰冷的机器，但机器人学会了她喜欢的茉莉花茶浓度，记住了她每一个学生的名字，在暴雨夜为她披上毯子。当机器人电池即将耗尽时，老人紧握着它的金属手指',
    mood: 'healing',
    duration: 'long',
  },
  {
    id: 'mountain-rescue',
    title: '绝壁救援',
    category: '冒险动作',
    emoji: '🧗',
    description: '登山队在暴风雪中遭遇险境，队员们在生死抉择中展现人性光辉。',
    inspiration: '喜马拉雅山脉海拔7200米处，一支五人登山队遭遇突发暴风雪。队长做出艰难决定：放弃登顶，全力救援受伤的新人队员。在能见度不足两米的风雪中，他们用绳索互相连接，一步步向大本营撤退，手指冻僵却始终没有松开绳结',
    mood: 'passionate',
    duration: 'long',
  },
  {
    id: 'childhood-summer',
    title: '那年夏天',
    category: '怀旧青春',
    emoji: '🍉',
    description: '90后童年暑假的温馨回忆，捉知了、吃西瓜、看露天电影的田园时光。',
    inspiration: '1998年南方小镇的暑假，三个孩子赤脚在田埂上奔跑，跳进村头的小河扑腾，在老榕树下用竹竿粘知了，傍晚趴在凉席上吃冰镇西瓜，晚上全村人搬着板凳去打谷场看露天电影，萤火虫在稻田上空飞舞',
    mood: 'healing',
    duration: 'short',
  },
  {
    id: 'concert-dream',
    title: '万人合唱',
    category: '音乐梦想',
    emoji: '🎸',
    description: '一个地下乐队从车库排练到万人演唱会的追梦故事，音乐点燃灵魂。',
    inspiration: '一支由四个高中同学组成的乐队，在破旧车库里排练了三年。终于登上了音乐节的舞台，当前奏响起，台下万人亮起手机灯光如星海，主唱闭上眼睛唱出了那首写给已故父亲的歌，全场自发合唱，泪水与汗水交织',
    mood: 'passionate',
    duration: 'short',
  },
  {
    id: 'tea-ceremony',
    title: '一期一会',
    category: '东方美学',
    emoji: '🍵',
    description: '日式茶道中的禅意美学，通过一场茶会展现「一期一会」的哲学深度。',
    inspiration: '京都深秋，百年茶室中，一位年迈的茶道大师为远道而来的年轻建筑师表演最后一次茶道。炭火的温度、抹茶的泡沫、竹帚搅动的声响，每一个动作都是一生修行的凝练。窗外红叶飘落在枯山水庭院中',
    mood: 'literary',
    duration: 'short',
  },
  {
    id: 'detective-case',
    title: '雨夜密室',
    category: '悬疑推理',
    emoji: '🕵️',
    description: '暴雨夜古宅中的密室杀人案，每个人都有嫌疑，真相在最后一刻反转。',
    inspiration: '暴雨夜，六位互不相识的人被困在山顶古宅中。凌晨三点，书房中发现了一具尸体，门窗从内部反锁。退休刑警开始逐一调查，每个人都有不在场证明却也都有动机，当他发现壁炉里一封被烧毁一半的信时，真相浮出水面',
    mood: 'suspense',
    duration: 'long',
  },
  {
    id: 'sakura-love',
    title: '樱花树下的约定',
    category: '纯爱物语',
    emoji: '🌸',
    description: '大学校园樱花季的初恋故事，从偶然相遇到毕业离别的青涩爱情。',
    inspiration: '大学校园的樱花大道上，女孩被风吹落的书页引向了正在长椅上画速写的男孩。他们从借还笔记开始，在图书馆占座、食堂拼桌、骑车去看日落。毕业典礼那天，樱花再次飘落，他把那幅画了四年的她的素描交到她手中',
    mood: 'romantic',
    duration: 'long',
  },
  {
    id: 'underwater-world',
    title: '深蓝之境',
    category: '自然纪实',
    emoji: '🐋',
    description: '深海探索纪实，从珊瑚礁到深海热泉，展现海洋的神秘与壮美。',
    inspiration: '一支海洋科考队驾驶深潜器从阳光充沛的珊瑚礁出发，逐渐下潜至无光的深海区域。巨大的水母群在黑暗中散发荧光，鲸鱼的歌声在深海回荡，最终他们在海底热泉旁发现了一种从未记录过的发光生物',
    mood: 'epic',
    duration: 'short',
  },
  {
    id: 'war-letter',
    title: '家书抵万金',
    category: '历史人文',
    emoji: '✉️',
    description: '抗战时期一封家书串联前线与后方的感人故事，在战火中守护家国情怀。',
    inspiration: '1938年，一位年轻军人在战壕中借着微弱的油灯写下家书，信中没有提及战火的残酷，只写了想念母亲做的红烧肉。与此同时，千里之外的小镇上，母亲将上一封来信读了第一百遍，在院子里晾晒为儿子纳的新布鞋',
    mood: 'literary',
    duration: 'long',
  },
  {
    id: 'street-cat',
    title: '流浪猫日记',
    category: '动物视角',
    emoji: '🐱',
    description: '以流浪猫的第一视角观察城市百态，温暖与残酷交织的都市寓言。',
    inspiration: '一只橘猫从小巷的纸箱中醒来，穿过清晨的菜市场偷一条小鱼，在公园长椅上被老爷爷抚摸，躲过环卫车的冲洗，傍晚蹲在便利店门口等那个总会留一个饭团的打工女孩，深夜在天台与月亮对望',
    mood: 'healing',
    duration: 'short',
  },
  {
    id: 'wuxia-revenge',
    title: '剑客行',
    category: '武侠江湖',
    emoji: '⚔️',
    description: '一个孤独剑客的复仇与救赎之路，飞雪中的对决与江湖的恩怨情仇。',
    inspiration: '大雪纷飞的客栈中，一个蒙面剑客独饮浊酒。三年前师门被灭，他追踪仇人至此。月下拔剑，刀光剑影间忽然认出对方竟是失散多年的师弟。两人剑尖相抵，风雪中泪目对望，恩怨在一壶酒中化解',
    mood: 'epic',
    duration: 'long',
  },
  {
    id: 'graduation-day',
    title: '毕业那天',
    category: '青春记忆',
    emoji: '🎓',
    description: '高三最后一天的校园群像，笑与泪交织的告别时刻。',
    inspiration: '高考结束的那个下午，教室里撕碎的试卷如雪花飞舞。有人在黑板上写下「再见」，有人偷偷把情书塞进暗恋三年的人书包里，班主任站在走廊尽头红了眼眶，操场上全班最后一次合影，快门按下的瞬间所有人都哭了',
    mood: 'literary',
    duration: 'short',
  },
  {
    id: 'ghost-train',
    title: '末班列车',
    category: '奇幻悬疑',
    emoji: '🚂',
    description: '一趟永远到不了终点的末班列车，车上的乘客各自背负着未解的心结。',
    inspiration: '深夜11:59分，一个加班到深夜的程序员跳上了最后一班地铁。他发现车厢里只有五个乘客，每个人的倒影都不是自己。列车开过了本该到达的终点站继续前行，车窗外的城市变成了陌生的风景，广播里传来了一个已经去世的人的声音',
    mood: 'suspense',
    duration: 'long',
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
