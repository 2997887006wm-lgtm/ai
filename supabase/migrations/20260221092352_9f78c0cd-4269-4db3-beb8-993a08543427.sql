
-- Create script_templates table
CREATE TABLE public.script_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  emoji text NOT NULL DEFAULT '🎬',
  description text NOT NULL DEFAULT '',
  mood text NOT NULL DEFAULT '',
  duration_type text NOT NULL DEFAULT 'short',
  shots jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_official boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.script_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can view official templates
CREATE POLICY "Anyone can view official templates"
  ON public.script_templates FOR SELECT
  USING (is_official = true);

-- Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON public.script_templates FOR SELECT
  USING (auth.uid() = created_by);

-- Users can create templates
CREATE POLICY "Users can create templates"
  ON public.script_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.script_templates FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.script_templates FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_script_templates_updated_at
  BEFORE UPDATE ON public.script_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed official templates
INSERT INTO public.script_templates (title, category, emoji, description, mood, duration_type, shots, is_official, created_by) VALUES
(
  '雨后森林漫步', '自然纪实', '🌿', '雨后森林的宁静时刻，丁达尔光线穿透树冠，治愈系短片。', 'healing', 'short',
  '[{"shotNumber":"01","shotType":"大远景","visual":"雨后亚热带森林全景，薄雾笼罩山谷，树冠之间透出微光","duration":"8s","dialogue":"","audio":"雨后水滴滴落声、远处鸟鸣","character":"","directorNote":"用航拍缓慢推进，建立空间感","emotionIntensity":20},{"shotNumber":"02","shotType":"中景","visual":"一个背着画板的女孩出现在林间小径上，穿着米色风衣，步伐轻缓","duration":"6s","dialogue":"","audio":"脚步踩在湿润落叶上的声响","character":"女孩 — 二十出头，面容安静","directorNote":"自然光，不打补光，保持真实感","emotionIntensity":30},{"shotNumber":"03","shotType":"特写","visual":"女孩的手指轻触蕨类植物叶片，一颗水珠沿叶脉滑落","duration":"4s","dialogue":"","audio":"水珠滴落的清脆声响","character":"","directorNote":"微距镜头，浅景深，水珠要清晰可见","emotionIntensity":55},{"shotNumber":"04","shotType":"中远景","visual":"丁达尔光线从树冠缝隙倾泻而下，形成金色光柱，女孩站在光束中抬头仰望","duration":"7s","dialogue":"","audio":"轻柔弦乐渐入","character":"","directorNote":"等待真实的丁达尔光线，这是全片的视觉高潮","emotionIntensity":80},{"shotNumber":"05","shotType":"近景","visual":"女孩微笑着打开画板，开始用水彩描绘眼前的光影","duration":"5s","dialogue":"（旁白）有些风景，只存在于此刻。","audio":"画笔蘸水声、鸟鸣","character":"","directorNote":"侧面拍摄，面部占画面三分之一","emotionIntensity":60},{"shotNumber":"06","shotType":"大远景","visual":"镜头缓缓升起，森林全景，女孩的身影渐小，阳光铺满整片山谷","duration":"6s","dialogue":"","audio":"弦乐渐强后淡出，回归自然声","character":"","directorNote":"航拍缓慢拉升，与开场呼应","emotionIntensity":40}]'::jsonb,
  true, NULL
),
(
  '霓虹都市独白', '城市影像', '🌃', '深夜城市的独行者视角，霓虹灯光映照在雨后街面，都市孤独美学。', 'literary', 'short',
  '[{"shotNumber":"01","shotType":"远景","visual":"深夜涩谷十字路口俯拍，雨刚停，霓虹灯倒映在湿漉漉的路面，行人寥寥","duration":"7s","dialogue":"","audio":"城市底噪、远处电车声","character":"","directorNote":"高机位俯拍，强调城市的几何感与冷色调","emotionIntensity":30},{"shotNumber":"02","shotType":"中景","visual":"一个穿着深色风衣的中年男人从便利店走出，手里拎着一袋罐装咖啡","duration":"5s","dialogue":"","audio":"便利店门铃声、脚步声","character":"男人 — 四十岁，神情疲惫但从容","directorNote":"背光拍摄，人物剪影化","emotionIntensity":35},{"shotNumber":"03","shotType":"特写","visual":"男人点燃一支烟，火光照亮半张脸，烟雾在冷白路灯光中缓缓升腾","duration":"5s","dialogue":"","audio":"打火机声、深吸一口烟的气息","character":"","directorNote":"侧面特写，烟雾用逆光打出层次","emotionIntensity":50},{"shotNumber":"04","shotType":"中远景","visual":"男人站在路口等红灯，身边是匆匆走过的末班电车乘客，他一动不动","duration":"6s","dialogue":"（内心独白）这座城市永远不会停下来，但我可以。","audio":"信号灯切换声、人群脚步渐远","character":"","directorNote":"稳定器跟拍，周围人物虚化动态模糊","emotionIntensity":65},{"shotNumber":"05","shotType":"近景","visual":"男人抬头看向天空，雨后的城市上空难得露出几颗星","duration":"4s","dialogue":"","audio":"环境声渐弱，钢琴单音渐入","character":"","directorNote":"仰拍面部，浅景深，背景霓虹虚化成光斑","emotionIntensity":75},{"shotNumber":"06","shotType":"远景","visual":"男人的背影消失在深巷尽头，霓虹灯光在水洼中摇曳","duration":"6s","dialogue":"","audio":"钢琴余音、水滴声","character":"","directorNote":"固定机位，让人物自然走出画面","emotionIntensity":45}]'::jsonb,
  true, NULL
),
(
  '一碗面的故事', '美食人情', '🍜', '通过一碗面连接祖孙三代的温情故事，以食物为线索展现家庭羁绊。', 'healing', 'short',
  '[{"shotNumber":"01","shotType":"特写","visual":"苍老的双手在案板上揉面，面团在掌心翻转，手指关节微微弯曲","duration":"6s","dialogue":"","audio":"面团拍打案板的声响、老式座钟滴答声","character":"奶奶 — 七十岁，围着旧围裙","directorNote":"顶部俯拍手部特写，暖色调","emotionIntensity":40},{"shotNumber":"02","shotType":"中景","visual":"父亲在灶台前调配汤底，往锅中加入秘制辣酱，蒸汽升腾","duration":"5s","dialogue":"（父亲）妈，今天用新配方的汤底试试。","audio":"锅中沸腾声、油爆声","character":"父亲 — 四十五岁，围着白色厨师围裙","directorNote":"侧面中景，烟火气要足","emotionIntensity":35},{"shotNumber":"03","shotType":"近景","visual":"孙女举着手机对准面馆门口的长队直播，笑容灿烂","duration":"4s","dialogue":"（孙女）家人们，这就是我家六十年老店！","audio":"手机直播提示音、人群嘈杂","character":"孙女 — 二十岁，活泼开朗","directorNote":"手机画面与实际画面交叉剪辑","emotionIntensity":50},{"shotNumber":"04","shotType":"特写","visual":"三碗不同风格的面并排摆放：奶奶的清汤面、父亲的红烧面、孙女的创意拌面","duration":"5s","dialogue":"","audio":"筷子碰碗声","character":"","directorNote":"俯拍45度角，浅景深逐碗对焦","emotionIntensity":55},{"shotNumber":"05","shotType":"中景","visual":"三代人围坐在后厨小桌旁，各自吃着自己做的面，互相点评","duration":"7s","dialogue":"（奶奶）还是我的清汤最正宗。","audio":"吃面声、笑声、碗筷碰撞","character":"","directorNote":"暖色调，自然光从窗口洒入，画面温馨","emotionIntensity":80},{"shotNumber":"06","shotType":"远景","visual":"面馆外景，陈记手工面的旧招牌在夕阳中发光，店内透出暖黄灯光","duration":"5s","dialogue":"","audio":"街巷人声渐远，温柔弦乐","character":"","directorNote":"固定机位，夕阳黄金时段拍摄","emotionIntensity":50}]'::jsonb,
  true, NULL
),
(
  '太空行走', '科幻短片', '🚀', '宇航员的太空行走视角，从出舱到俯瞰地球的壮美瞬间。', 'epic', 'short',
  '[{"shotNumber":"01","shotType":"近景","visual":"宇航员面罩内部视角，呼吸雾气在玻璃上凝结又散开，通讯灯闪烁","duration":"5s","dialogue":"（通讯）舱外作业许可确认，祝你好运。","audio":"呼吸声、通讯电流杂音","character":"宇航员 — 沉稳冷静","directorNote":"POV视角，营造临场感","emotionIntensity":40},{"shotNumber":"02","shotType":"中景","visual":"气闸舱门缓缓打开，宇航员飘出舱外，身后是空间站的金属结构","duration":"7s","dialogue":"","audio":"气闸释压声、太空寂静","character":"","directorNote":"从舱内向外拍摄，逐渐露出太空背景","emotionIntensity":55},{"shotNumber":"03","shotType":"远景","visual":"宇航员漂浮在空间站外，巨大的太阳能板阵列在身后展开，地球弧线可见","duration":"8s","dialogue":"","audio":"低沉的太空氛围音乐","character":"","directorNote":"广角，展示人在宇宙中的渺小","emotionIntensity":70},{"shotNumber":"04","shotType":"特写","visual":"宇航员手套抓握太阳能板支架进行维修，地球在手套反光中倒映","duration":"5s","dialogue":"","audio":"工具触碰金属的细微声响","character":"","directorNote":"微距感特写，手套反射是关键细节","emotionIntensity":45},{"shotNumber":"05","shotType":"大远景","visual":"太阳从地球边缘升起，光芒瞬间照亮整个太阳能板阵列和宇航员的身影","duration":"6s","dialogue":"","audio":"壮阔的交响乐渐强","character":"","directorNote":"全片视觉高潮，日出要有神圣感","emotionIntensity":95},{"shotNumber":"06","shotType":"近景","visual":"宇航员停下手中工作，透过面罩静静凝视蓝色地球，面罩反射着地球光芒","duration":"6s","dialogue":"（旁白）从这里看，所有的边界都不存在。","audio":"交响乐渐弱至寂静","character":"","directorNote":"正面拍摄，面罩反射要精确","emotionIntensity":80}]'::jsonb,
  true, NULL
),
(
  '流浪猫日记', '动物视角', '🐱', '以流浪猫的第一视角观察城市百态，温暖与残酷交织的都市寓言。', 'healing', 'short',
  '[{"shotNumber":"01","shotType":"特写","visual":"纸箱中一只橘猫睁开眼睛，阳光从箱口缝隙照入，猫瞳孔收缩","duration":"5s","dialogue":"","audio":"清晨鸟鸣、远处垃圾车声","character":"橘猫 — 约两岁，毛色温暖","directorNote":"低机位，猫的视角高度","emotionIntensity":30},{"shotNumber":"02","shotType":"中景","visual":"橘猫穿过清晨菜市场，灵巧躲过人腿，在鱼摊下叼走一条小鱼","duration":"6s","dialogue":"","audio":"菜市场吆喝声、鱼贩拍水声","character":"","directorNote":"地面高度跟拍，稳定器贴地运动","emotionIntensity":45},{"shotNumber":"03","shotType":"中远景","visual":"公园长椅上，橘猫蜷在一位老爷爷腿边，被温柔抚摸","duration":"5s","dialogue":"","audio":"老人哼着小曲、树叶沙沙声","character":"老爷爷 — 退休老人","directorNote":"侧面中远景，温馨感","emotionIntensity":65},{"shotNumber":"04","shotType":"近景","visual":"暴雨中橘猫躲在报亭下，看着环卫车冲洗街道，水花溅起","duration":"5s","dialogue":"","audio":"暴雨声、水花声、猫低鸣","character":"","directorNote":"雨景逆光，水花增加视觉层次","emotionIntensity":50},{"shotNumber":"05","shotType":"中景","visual":"便利店门口，打工女孩蹲下身把一个饭团放在猫面前，猫凑近闻","duration":"6s","dialogue":"","audio":"便利店音乐、猫咕噜声","character":"打工女孩 — 穿便利店制服","directorNote":"暖色调，强调人猫之间的温度","emotionIntensity":80},{"shotNumber":"06","shotType":"远景","visual":"深夜天台上，橘猫蹲坐望向城市夜景，一轮圆月挂在空中","duration":"6s","dialogue":"（旁白）这座城市有千万盏灯，总有一盏会为你亮着。","audio":"夜虫声、远处城市底噪","character":"","directorNote":"剪影构图，猫与月亮的经典画面","emotionIntensity":60}]'::jsonb,
  true, NULL
),
(
  '毕业那天', '青春记忆', '🎓', '高三最后一天的校园群像，笑与泪交织的告别时刻。', 'literary', 'short',
  '[{"shotNumber":"01","shotType":"远景","visual":"教室全景，课桌上堆满试卷和课本，黑板上写着倒计时0天","duration":"5s","dialogue":"","audio":"教室喧闹声、椅子挪动声","character":"","directorNote":"固定机位，展现高三教室的标志性场景","emotionIntensity":30},{"shotNumber":"02","shotType":"中景","visual":"高考结束铃响，学生们从座位上站起，有人将试卷撕碎抛向空中如雪花飞舞","duration":"6s","dialogue":"","audio":"铃声、欢呼声、纸张撕裂声","character":"","directorNote":"慢动作，碎纸如雪花飘落","emotionIntensity":60},{"shotNumber":"03","shotType":"近景","visual":"一个男生悄悄把信封塞进前排女生书包侧袋，耳根发红","duration":"4s","dialogue":"","audio":"环境音压低，心跳声","character":"男生 — 高三学生，青涩腼腆","directorNote":"浅景深，焦点在手和信封上","emotionIntensity":70},{"shotNumber":"04","shotType":"中远景","visual":"班主任站在走廊尽头看着学生们搬东西离开，摘下眼镜擦眼角","duration":"5s","dialogue":"","audio":"走廊回声、远处笑声","character":"班主任 — 五十岁，严厉但深情","directorNote":"长焦压缩，走廊纵深感强","emotionIntensity":75},{"shotNumber":"05","shotType":"远景","visual":"操场上全班最后一次合影，摄影师喊一二三，所有人笑着比出各种手势","duration":"5s","dialogue":"（摄影师）一、二、三——茄子！","audio":"快门声、笑声、有人在哭","character":"","directorNote":"模拟胶片质感，暖色偏黄","emotionIntensity":85},{"shotNumber":"06","shotType":"大远景","visual":"校门口，学生们三三两两离开，校门上方横幅写着前程似锦","duration":"6s","dialogue":"（旁白）那天我们都以为是结束，后来才知道，是所有故事的开始。","audio":"蝉鸣声、脚步声渐远","character":"","directorNote":"固定机位长镜头，让人物自然散去","emotionIntensity":55}]'::jsonb,
  true, NULL
),
(
  '一期一会', '东方美学', '🍵', '日式茶道中的禅意美学，通过一场茶会展现「一期一会」的哲学。', 'literary', 'short',
  '[{"shotNumber":"01","shotType":"远景","visual":"京都深秋，百年茶室外景，红叶飘落在枯山水庭院的白砂上","duration":"7s","dialogue":"","audio":"风声、落叶触地声、远处寺钟","character":"","directorNote":"固定机位，等待真实落叶入画","emotionIntensity":25},{"shotNumber":"02","shotType":"中景","visual":"茶道大师跪坐在茶室中央，面前摆放茶具，动作缓慢而庄严","duration":"6s","dialogue":"","audio":"榻榻米摩擦声、炭火细微声","character":"茶道大师 — 七旬老者，白发","directorNote":"正面构图，对称美学","emotionIntensity":35},{"shotNumber":"03","shotType":"特写","visual":"竹茶帚在茶碗中搅动抹茶，绿色泡沫细腻地旋转","duration":"5s","dialogue":"","audio":"竹帚搅动声、水的细微涟漪","character":"","directorNote":"俯拍微距，抹茶的绿色是全片唯一的亮色","emotionIntensity":50},{"shotNumber":"04","shotType":"近景","visual":"大师双手捧起茶碗，转动两次，递向对面的年轻建筑师","duration":"5s","dialogue":"","audio":"陶器轻触声","character":"年轻建筑师 — 三十岁，远道而来","directorNote":"侧面拍摄，强调双手递茶的仪式感","emotionIntensity":65},{"shotNumber":"05","shotType":"近景","visual":"年轻人饮茶后闭眼，窗外红叶的影子投在他脸上","duration":"5s","dialogue":"（旁白）一期一会，此刻即是永恒。","audio":"寂静、仅有呼吸声","character":"","directorNote":"自然光，红叶投影是光影的高潮","emotionIntensity":80},{"shotNumber":"06","shotType":"远景","visual":"茶室纸门缓缓拉上，庭院中枯山水纹路在夕阳下被拉出长影","duration":"6s","dialogue":"","audio":"纸门滑动声、余韵钟声","character":"","directorNote":"固定机位，让画面自然归于静寂","emotionIntensity":40}]'::jsonb,
  true, NULL
),
(
  '那年夏天', '怀旧青春', '🍉', '90后童年暑假的温馨回忆，捉知了、吃西瓜、看露天电影的田园时光。', 'healing', 'short',
  '[{"shotNumber":"01","shotType":"远景","visual":"南方小镇全景，白墙黑瓦，稻田碧绿，蝉声如潮","duration":"6s","dialogue":"","audio":"蝉鸣、远处牛叫","character":"","directorNote":"航拍或高机位，胶片色调偏暖黄","emotionIntensity":25},{"shotNumber":"02","shotType":"中景","visual":"三个孩子赤脚在田埂上奔跑，笑声回荡，身后是金色稻浪","duration":"5s","dialogue":"","audio":"孩子笑声、脚踩泥土声","character":"三个孩子 — 八九岁","directorNote":"跟拍，适度晃动增加真实感","emotionIntensity":50},{"shotNumber":"03","shotType":"近景","visual":"一个孩子用竹竿粘知了，屏气凝神，知了突然飞走，孩子跌坐在地上大笑","duration":"5s","dialogue":"","audio":"知了叫声、竹竿挥动声、笑声","character":"","directorNote":"自然表演，抓拍真实反应","emotionIntensity":60},{"shotNumber":"04","shotType":"特写","visual":"凉席上切开的冰镇西瓜，红瓤黑子，孩子们的手伸向画面","duration":"4s","dialogue":"","audio":"西瓜切开的脆响、吃西瓜声","character":"","directorNote":"俯拍，色彩饱和度适当提高","emotionIntensity":55},{"shotNumber":"05","shotType":"中远景","visual":"打谷场上支起白色幕布，全村人搬板凳看露天电影，荧幕光映在脸上","duration":"7s","dialogue":"","audio":"老电影配乐、人群低语","character":"","directorNote":"暗场景，仅荧幕光照亮人脸","emotionIntensity":70},{"shotNumber":"06","shotType":"远景","visual":"夜晚稻田上空萤火虫飞舞，星空灿烂，远处村庄灯火零星","duration":"6s","dialogue":"（旁白）那些夏天，短得像一场梦，长得够记一辈子。","audio":"蛙鸣、蟋蟀声","character":"","directorNote":"长曝光效果，萤火虫光轨","emotionIntensity":45}]'::jsonb,
  true, NULL
);
