import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

// 从抖音/快手等的分享口令串里清洗出文案（这些分享串通常自带标题与话题标签）
function captionFromShareText(text: string): string {
  const t = text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*复制打开(?:抖音|快手)/g, ' ')
    .replace(/复制打开(?:抖音|快手)|长按复制此条|打开(?:抖音|快手)搜索/g, ' ')
    .replace(/看看|的作品/g, ' ')
    .replace(/[【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length >= 4 ? t : '';
}

// 解码 HTML/JSON 里的转义
function decodeText(s: string): string {
  try {
    return JSON.parse('"' + s.replace(/"/g, '\\"') + '"');
  } catch {
    return s.replace(/\\u002F/g, '/').replace(/\\\//g, '/');
  }
}

// 对任意聚合解析 API 的返回 JSON 做「深度搜索」，自动挑出 无水印视频URL / 文案 / 封面。
// 比写死字段路径更稳，兼容 Evil0ctal 的嵌套结构，也兼容其它服务。
function deepExtract(root: any): { desc: string; cover: string; videoUrl: string } {
  const urls: { url: string; ctx: string }[] = [];
  let desc = '';
  const visit = (node: any, path: string) => {
    if (node == null) return;
    if (typeof node === 'string') {
      const v = node.trim();
      const lastKey = path.split('/').pop() || '';
      if (!desc && /^(desc|title|caption|aweme_desc|content|text|share_title|video_desc)$/i.test(lastKey)
          && v.length > 3 && !/^https?:/i.test(v)) {
        desc = v;
      }
      if (/^https?:\/\//i.test(v)) urls.push({ url: v, ctx: path });
      return;
    }
    if (Array.isArray(node)) { for (const item of node) visit(item, path); return; }
    if (typeof node === 'object') { for (const k of Object.keys(node)) visit(node[k], `${path}/${k}`); }
  };
  visit(root, '');

  const scoreVideo = (u: { url: string; ctx: string }) => {
    const s = u.ctx + ' ' + u.url; let n = 0;
    if (/nwm|no_?watermark|去水印|wm_?video|video_url/i.test(s)) n += 5;
    if (/play_?addr|playapi|play_url|download|\bvideo\b/i.test(u.ctx)) n += 3;
    if (/\.mp4|\/play\/|aweme\/v1\/play|\/video\/|videoplayback/i.test(u.url)) n += 3;
    if (/cover|\.jpe?g|\.png|\.webp|image|avatar|music|author|icon/i.test(s)) n -= 6;
    return n;
  };
  const scoreCover = (u: { url: string; ctx: string }) => {
    const s = u.ctx + ' ' + u.url; let n = 0;
    if (/cover|thumb|poster|封面/i.test(u.ctx)) n += 5;
    if (/\.jpe?g|\.png|\.webp|image/i.test(u.url)) n += 2;
    if (/avatar|music|author|icon|logo/i.test(u.ctx)) n -= 4;
    if (/\.mp4|videoplayback|\/play\//i.test(u.url)) n -= 6;
    return n;
  };

  const best = (scorer: (u: any) => number) =>
    urls.map((u) => ({ u, n: scorer(u) })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n)[0]?.u.url || '';

  return { desc, cover: best(scoreCover), videoUrl: best(scoreVideo) };
}

// 可插拔的聚合解析 API：若配置了环境变量 PARSE_API_URL，则优先用它（覆盖抖音/快手/微博/小红书等）。
// 推荐自托管 Evil0ctal：PARSE_API_URL = https://<你的域名>/api/hybrid/video_data?url={url}&minimal=false
// URL 里可用 {url} 占位，否则自动以 ?url= 拼接。
async function tryParseApi(url: string): Promise<{ desc: string; cover: string; videoUrl: string } | null> {
  const api = Deno.env.get('PARSE_API_URL');
  if (!api) return null;
  try {
    const endpoint = api.includes('{url}')
      ? api.replace('{url}', encodeURIComponent(url))
      : `${api}${api.includes('?') ? '&' : '?'}url=${encodeURIComponent(url)}`;
    const res = await fetch(endpoint, { headers: { 'User-Agent': MOBILE_UA } });
    if (!res.ok) { console.error('parse api status:', res.status); return null; }
    const j: any = await res.json();
    const out = deepExtract(j);
    if (!out.desc && !out.cover && !out.videoUrl) return null;
    return out;
  } catch (e) {
    console.error('parse api failed:', e);
    return null;
  }
}

// 尽力解析短视频分享链接（抖音/快手/微博/小红书等通用）：拿到 文案/封面/(可能的)视频直链。
// 各平台反爬强、成功率不一，失败是常态 → 上层降级到上传。
async function resolveShareLink(text: string): Promise<{ desc: string; cover: string; videoUrl: string; finalUrl: string }> {
  const m = text.match(/https?:\/\/[^\s]+/);
  if (!m) return { desc: '', cover: '', videoUrl: '', finalUrl: '' };
  const url = m[0];

  // 1) 优先走聚合解析 API（若配置）
  const viaApi = await tryParseApi(url);
  if (viaApi && (viaApi.desc || viaApi.cover || viaApi.videoUrl)) {
    return { ...viaApi, finalUrl: url };
  }

  // 2) 通用兜底：抓页面 og/twitter 元信息（任何暴露 OG 标签的平台都适用）
  let html = '';
  let finalUrl = url;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': MOBILE_UA }, redirect: 'follow' });
    finalUrl = res.url || url;
    html = await res.text();
  } catch (e) {
    console.error('resolve fetch failed:', e);
    return { desc: '', cover: '', videoUrl: '', finalUrl: url };
  }

  const pick = (re: RegExp) => { const r = html.match(re); return r ? r[1] : ''; };
  // 兼容 property/name 在 content 前后两种属性顺序
  const meta = (key: string) => {
    const k = key.replace(/[:]/g, '\\:');
    return (
      pick(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
      pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${k}["']`, 'i'))
    );
  };

  let desc =
    meta('og:description') || meta('twitter:description') || meta('description') ||
    pick(/"desc":"([^"]{4,}?)"/) || pick(/"title":"([^"]{4,}?)"/) || pick(/<title>([^<]+)<\/title>/i);
  desc = decodeText(desc).trim();

  let cover = meta('og:image') || meta('twitter:image') || meta('twitter:image:src');
  cover = decodeText(cover).trim();

  let videoUrl =
    meta('og:video:secure_url') || meta('og:video:url') || meta('og:video') || meta('twitter:player:stream') ||
    pick(/"playApi":"([^"]+)"/) || pick(/"play_addr":\{[^}]*?"url_list":\["([^"]+)"/);
  videoUrl = decodeText(videoUrl).trim();

  return { desc, cover, videoUrl, finalUrl };
}

// 抓取封面图转 base64（避免视觉模型直接取防盗链 URL 失败）
async function fetchImageAsDataUrl(imgUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imgUrl, { headers: { 'User-Agent': MOBILE_UA, Referer: 'https://www.douyin.com/' } });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > 4_000_000) return null;
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:${ct};base64,${btoa(bin)}`;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { link, images, referenceText } = await req.json();
    let imgs: string[] = Array.isArray(images) ? images.slice(0, 9) : [];
    let refText: string = (referenceText || '').toString().trim();
    let extracted: { desc?: string; coverUsed?: boolean; videoUrl?: string } | null = null;
    let partial = false; // true = 只拿到文案、没拿到画面（拆解会偏浅）

    // 1) 链接优先：尝试解析
    if (link && typeof link === 'string' && link.trim()) {
      const r = await resolveShareLink(link.trim());
      // 抖音/快手分享串通常自带文案，直接清洗出来作为兜底
      const shareCaption = captionFromShareText(link.trim());
      const descParts = [r.desc, shareCaption, refText].filter(Boolean);
      if (r.cover) {
        const dataUrl = await fetchImageAsDataUrl(r.cover);
        if (dataUrl) imgs = [dataUrl, ...imgs].slice(0, 9);
      }
      extracted = { desc: r.desc || shareCaption, coverUsed: imgs.length > 0, videoUrl: r.videoUrl };

      // 啥也没拿到 → 让前端降级到上传
      if (descParts.length === 0 && imgs.length === 0) {
        return new Response(JSON.stringify({
          needUpload: true,
          error: '自动解析没能拿到该平台的视频内容（平台反爬限制）。请保存该视频后，改用「上传视频」拆解。',
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      refText = descParts.join('\n');
      if (imgs.length === 0) partial = true; // 只有文案，没有画面
    }

    if (imgs.length === 0 && !refText) {
      return new Response(JSON.stringify({ error: '请提供链接、上传视频/截图，或粘贴文案至少一项' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY 未配置' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `你是一位顶尖的短视频/影视拆片师。用户会给你一条"爆款"的参考素材（视频关键帧截图和/或文案字幕）。
请拆解它**可迁移的结构与风格方法论**，而不是复述原内容。严禁照抄原片台词或文案。

只输出一个 JSON 对象（不要 markdown 代码块、不要多余解释），字段如下：
{
  "genre": "题材/类型",
  "style": "视觉与叙事风格（镜头语言、画面质感、剪辑特点）",
  "hook": "开头3秒的钩子手法（抽象成可复用的套路）",
  "pacing": "整体节奏特征（快慢、信息密度、反转/卡点位置）",
  "shotPattern": ["特写 · 制造悬念 · 2s", "中景 · 交代环境 · 3s"],
  "emotionArc": "情绪曲线走向（如何起承转合、在哪里到高潮）",
  "palette": "调色与视觉调性（色调、光线、氛围关键词）",
  "transferableStructure": "150字以内、可直接迁移到任何新选题的结构模板（可复用的创作配方）"
}
严格要求：
1. shotPattern 是「字符串数组」，每项是一个用 · 分隔「景别·作用·时长」的字符串，6-10 条；绝不要写成对象。
2. 直接输出合法 JSON 本身，不要用任何 markdown 代码块或反引号包裹，JSON 前后不要加任何文字。
3. 所有字段用中文填写。若关键帧按时间顺序给出，据此推断镜头节奏与时长。`;

    let model: string;
    let userContent: unknown;

    if (imgs.length > 0) {
      model = 'glm-4v-flash';
      const parts: unknown[] = [{
        type: 'text',
        text: `请拆解这条爆款参考素材的可迁移结构与风格。${refText ? `\n参考文案/字幕：\n${refText}` : ''}\n（下方图片为按时间顺序抽取的关键帧）`,
      }];
      for (const url of imgs) {
        if (typeof url === 'string' && url) parts.push({ type: 'image_url', image_url: { url } });
      }
      userContent = parts;
    } else {
      model = 'glm-4.7-flash';
      userContent = `请拆解以下爆款文案/字幕的可迁移结构与风格：\n${refText}`;
    }

    const reqBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
      // glm-4v-flash 的 max_tokens 上限为 1024；文本模型可更大
      max_tokens: model === 'glm-4v-flash' ? 1024 : 2500,
    };
    // 文本模型需显式关闭 thinking（与项目其它函数一致）；视觉模型 glm-4v-flash 不加该参数
    if (model !== 'glm-4v-flash') {
      reqBody.thinking = { type: 'disabled' };
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ZHIPU_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error('Zhipu API error:', response.status, t);
      const hint = imgs.length > 0
        ? '视觉拆解失败（可能 API key 未开通视觉模型 glm-4v-flash）。可改用「仅文案」拆解。'
        : '拆解失败，请重试。';
      return new Response(JSON.stringify({ error: hint, details: { status: response.status, body: t.slice(0, 300) } }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || '';

    let parsed: Record<string, any> | null = null;
    try {
      const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      parsed = JSON.parse(start >= 0 && end >= 0 ? clean.slice(start, end + 1) : clean);
    } catch {
      parsed = null;
    }

    const safe = (v: unknown) => (typeof v === 'string' ? v : Array.isArray(v) ? v.join('\n') : '');

    let report: string;
    let structureBrief: string;
    if (parsed) {
      const shotLines = Array.isArray(parsed.shotPattern)
        ? parsed.shotPattern.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')
        : safe(parsed.shotPattern);
      report = [
        `**题材类型**：${safe(parsed.genre)}`,
        `**风格**：${safe(parsed.style)}`,
        `**开头钩子**：${safe(parsed.hook)}`,
        `**节奏**：${safe(parsed.pacing)}`,
        `**镜头序列**：\n${shotLines}`,
        `**情绪曲线**：${safe(parsed.emotionArc)}`,
        `**调色调性**：${safe(parsed.palette)}`,
      ].join('\n\n');
      structureBrief = safe(parsed.transferableStructure) || report;
    } else {
      // 模型没按合法 JSON 返回：清掉代码块标记，去掉花括号噪音后直接用文本
      const cleaned = raw.replace(/```[a-z]*\s*/gi, '').replace(/```/g, '').trim();
      report = cleaned;
      structureBrief = cleaned;
    }

    return new Response(JSON.stringify({ report, structureBrief, model, extracted, partial }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('deconstruct-reference error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
