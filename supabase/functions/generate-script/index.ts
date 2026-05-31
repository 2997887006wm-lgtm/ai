import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Embed query and search knowledge base for RAG context
async function searchKnowledge(query: string, zhipuKey: string, supabaseUrl: string, serviceKey: string): Promise<string> {
  try {
    const embResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${zhipuKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'embedding-2', input: query }),
    });

    if (!embResponse.ok) return '';
    const embData = await embResponse.json();
    const embedding = embData.data?.[0]?.embedding;
    if (!embedding) return '';

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding_text: JSON.stringify(embedding),
      match_threshold: 0.3,
      match_count: 3, // 3 条足够参考，减少检索耗时
    });

    if (error || !data || data.length === 0) return '';

    return data.map((d: any) => `【${d.category === 'film_technique' ? '电影技法' : '自然常识'}】${d.title}：${d.content}`).join('\n');
  } catch (e) {
    console.error('RAG search error:', e);
    return '';
  }
}

const RAG_TIMEOUT_MS = 2500; // RAG 超时则跳过，避免阻塞主流程
const ZHIPU_CHAT_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

// 非流式调用智谱，返回 message.content
async function zhipuChat(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const resp = await fetch(ZHIPU_CHAT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: opts.model ?? 'glm-5.1',
      thinking: { type: 'disabled' },
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4000,
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Zhipu ${resp.status}: ${t.slice(0, 300)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// 从模型输出中尽量稳健地抽取 JSON（去除 markdown 围栏、截取首尾括号）
function extractJson(raw: string): any {
  const c = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(c); } catch { /* fall through */ }
  const candidates = [c.indexOf('{'), c.indexOf('[')].filter((i) => i >= 0);
  const start = candidates.length ? Math.min(...candidates) : -1;
  const end = Math.max(c.lastIndexOf('}'), c.lastIndexOf(']'));
  if (start >= 0 && end > start) {
    try { return JSON.parse(c.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

interface LeafScene { id: string; label: string; actLabel: string; }

// 收集 tree 中所有叶子场景节点（带所属幕名）
function collectLeaves(tree: any): LeafScene[] {
  const leaves: LeafScene[] = [];
  const walk = (node: any, actLabel: string) => {
    const isLeaf = !node.children || node.children.length === 0;
    if (isLeaf) {
      if (node.id && node.id !== 'root') leaves.push({ id: node.id, label: node.label || node.id, actLabel });
      return;
    }
    const childActLabel = node.id === 'root' ? '' : (node.label || actLabel);
    for (const child of node.children) walk(child, childActLabel);
  };
  walk(tree, '');
  return leaves;
}

function sseEvent(obj: any): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

// 长篇模式：阶段一生成幕/场景大纲，阶段二逐场景生成分镜，规避单次输出过长被截断
function buildLongScript(
  apiKey: string,
  inspiration: string,
  mood: string,
  moodHint: string,
  ragSection: string,
  ragUsed: boolean,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) => controller.enqueue(encoder.encode(sseEvent(obj)));
      try {
        send({ type: 'meta', ragUsed, duration: 'long' });
        send({ type: 'progress', message: '正在规划幕与场景结构…' });

        // 阶段一：生成幕/场景大纲（输出小、稳定）
        const outlineSystem = `你是一位资深影视编剧。根据用户灵感，规划一部完整长片的幕与场景结构。
你必须严格只输出 JSON，不要任何解释或 markdown。
输出格式：
{
  "tree": {
    "id": "root",
    "label": "总纲",
    "children": [
      { "id": "act1", "label": "第一幕 · 幕名", "children": [
        { "id": "act1-s1", "label": "场景一 · 场景名" },
        { "id": "act1-s2", "label": "场景二 · 场景名" }
      ] }
    ]
  }
}
要求：
- 生成 3-4 个幕，每幕 2-4 个场景，构成完整叙事弧线（铺垫→渐升→高潮→回落）
- id 必须唯一，格式为 actN / actN-sM
- label 用中文，简洁点题
- 只输出结构，不要在此处输出任何分镜内容`;
        const outlineUser = `灵感：${inspiration}\n${moodHint}${ragSection}\n请只输出幕与场景的结构 JSON。`;

        const outlineRaw = await zhipuChat(apiKey, [
          { role: 'system', content: outlineSystem },
          { role: 'user', content: outlineUser },
        ], { model: 'glm-5.1', maxTokens: 2000 });

        const outline = extractJson(outlineRaw);
        const tree = outline?.tree ?? outline;
        if (!tree || !Array.isArray(tree.children) || tree.children.length === 0) {
          console.error('Outline parse failed:', outlineRaw.slice(0, 500));
          send({ type: 'error', message: '大纲生成失败，请重试' });
          controller.close();
          return;
        }
        if (!tree.id) tree.id = 'root';
        if (!tree.label) tree.label = '总纲';

        const leaves = collectLeaves(tree);
        if (leaves.length === 0) {
          send({ type: 'error', message: '未能解析出有效场景，请重试' });
          controller.close();
          return;
        }

        // 全片结构概要，供逐场景生成时保持上下文连贯
        const outlineText = tree.children.map((act: any) => {
          const scenes = (act.children || []).map((s: any) => s.label || s.id).join('、');
          return `${act.label || act.id}（${scenes}）`;
        }).join('；');

        send({ type: 'progress', message: `结构完成，共 ${leaves.length} 个场景，正在生成分镜…` });

        // 阶段二：逐场景生成分镜（限制并发，规避限流）
        const sceneShotsMap: Record<string, any[]> = {};
        let done = 0;

        const genScene = async (leaf: LeafScene, index: number): Promise<void> => {
          const sceneSystem = `你是一位资深影视分镜脚本编剧。为给定的"单个场景"生成详细分镜。
你必须严格只输出 JSON 数组，不要任何解释或 markdown。
数组包含 8-12 个分镜对象，每个对象字段：
- shotType: 景别（大远景/远景/全景/中景/近景/特写/大特写）
- visual: 视觉画面描述（具体、有画面感、不超过50字）
- duration: 预估时长（如 "5s"，每个分镜约 3-5 秒）
- dialogue: 台词或旁白（可为空字符串）
- audio: 听觉营造（环境音、音乐提示，需具体，用于音效匹配）
- character: 角色侧写（可为空字符串）
- directorNote: 导演手记（拍摄建议、情绪提示）
- emotionIntensity: 0-100 的整数（0=平静，50=中性，100=高潮）
- transition: 转场方式（如"硬切""叠化""淡入""淡出""闪白""跳切""渐黑""匹配剪辑"等）
${mood ? `整体情绪风格为"${mood}"，请深度融入画面、台词、音效与导演指导。` : ''}
- 所有自然现象需符合物理常识（光影方向、天气逻辑、动物习性等）`;
          const sceneUser = `整片灵感：${inspiration}
全片结构：${outlineText}
当前场景：${leaf.actLabel ? leaf.actLabel + ' / ' : ''}${leaf.label}
这是全片第 ${index + 1} / ${leaves.length} 个场景，请据此把握情绪强度，使全片情绪曲线符合"铺垫→渐升→高潮→回落"。${ragSection}
请只输出该场景的 8-12 个分镜 JSON 数组${index === 0 ? '，第一个分镜的 transition 建议为"淡入"' : ''}。`;

          let shots: any[] | null = null;
          for (let attempt = 0; attempt < 2 && !shots; attempt++) {
            try {
              const raw = await zhipuChat(apiKey, [
                { role: 'system', content: sceneSystem },
                { role: 'user', content: sceneUser },
              ], { model: 'glm-5.1', maxTokens: 4000 });
              const parsed = extractJson(raw);
              const arr = Array.isArray(parsed) ? parsed : parsed?.shots;
              if (Array.isArray(arr) && arr.length > 0) shots = arr;
            } catch (e) {
              console.error(`scene ${leaf.id} attempt ${attempt} error:`, e);
            }
          }
          sceneShotsMap[leaf.id] = shots ?? [];
          done++;
          send({ type: 'progress', message: `已完成场景 ${done}/${leaves.length}…` });
        };

        const CONCURRENCY = 3;
        for (let i = 0; i < leaves.length; i += CONCURRENCY) {
          const batch = leaves.slice(i, i + CONCURRENCY);
          await Promise.all(batch.map((leaf, j) => genScene(leaf, i + j)));
        }

        // 输出最终结果（单个 token，前端按现有逻辑解析整段 JSON）
        send({ type: 'token', content: JSON.stringify({ tree, sceneShotsMap }) });
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        console.error('buildLongScript error:', e);
        controller.enqueue(encoder.encode(sseEvent({ type: 'error', message: '长篇生成失败，请重试' })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inspiration, duration, mood, skipRag } = await req.json();
    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY 未配置' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!inspiration) {
      return new Response(JSON.stringify({ error: '灵感描述不能为空' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // RAG: 需智谱 embedding，若未配置则跳过
    let ragContext = '';
    if (!skipRag && ZHIPU_API_KEY && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        ragContext = await Promise.race([
          searchKnowledge(inspiration, ZHIPU_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY),
          new Promise<string>((_, rej) => setTimeout(() => rej(new Error('RAG timeout')), RAG_TIMEOUT_MS)),
        ]);
      } catch (e) {
        if ((e as Error).message !== 'RAG timeout') console.error('RAG error:', e);
        // 超时或失败时继续，不带 RAG 生成
      }
    }

    const ragSection = ragContext
      ? `\n\n【参考知识库】以下是从经典电影分镜手法和自然物候百科中检索到的相关知识，请在生成时参考并确保内容符合专业标准和自然常识：\n${ragContext}\n`
      : '';

    const moodHint = mood ? `情绪风格：${mood}。请深度融合该情绪风格到每个分镜的视觉描述、台词节奏、音效设计和导演手记中。` : '';

    // 长篇：两阶段生成（先大纲，再逐场景生成分镜），避免单次输出过长被截断导致只有第一幕有内容
    if (duration === 'long') {
      return buildLongScript(ZHIPU_API_KEY, inspiration, mood, moodHint, ragSection, !!ragContext);
    }

    // 短片：单次流式生成
    const systemPrompt = `你是一位资深影视分镜脚本编剧。根据用户提供的灵感，生成一份完整的分镜脚本。
你必须严格以 JSON 数组格式输出，不要输出任何其他文字、解释或 markdown 标记。
每个分镜对象包含以下字段：
- shotType: 景别（大远景/远景/全景/中景/近景/特写/大特写）
- visual: 视觉画面描述（具体、有画面感、不超过50字）
- duration: 预估时长（如 "5s"）
- dialogue: 台词或旁白（可为空字符串）
- audio: 听觉营造（环境音、音乐提示，需具体描述用于音效匹配）
- character: 角色侧写（可为空字符串）
- directorNote: 导演手记（拍摄建议、情绪提示）
- emotionIntensity: 0-100的整数，代表该分镜的情绪张力（0=平静，50=中性，100=高潮）
- transition: 该分镜的转场方式建议（如"硬切"、"叠化"、"淡入"、"淡出"、"闪白"、"划变"、"跳切"、"渐黑"、"匹配剪辑"等，第一个分镜为"淡入"）
${mood ? `\n整体情绪风格为"${mood}"，请将该风格深度融入每个分镜的视觉语言、台词节奏、音效氛围和导演指导中。` : ''}
- 确保所有自然现象描述符合物理常识（如光影方向、天气逻辑、动物习性等）`;

    const userPrompt = `灵感：${inspiration}
${moodHint}${ragSection}
请生成 8-12 个分镜，时长类型：轻巧短片（总计约30-60秒）。
每个分镜时长约3-5秒，确保总分镜数不少于10个以保证叙事完整性。
情绪曲线应有起伏，符合叙事节奏。
直接输出 JSON 数组，不要包含任何其他内容。`;

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-5.1',
        thinking: { type: 'disabled' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: '请求过于频繁，请稍后重试' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('Chat API error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI生成失败' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream SSE: forward Zhipu's stream to client, plus prepend ragUsed info
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Send rag info as first event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', ragUsed: !!ragContext, duration })}\n\n`));

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex: number;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);

              if (!line || line.startsWith(':')) continue;
              if (!line.startsWith('data: ')) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', content })}\n\n`));
                }
              } catch {
                // partial JSON, skip
              }
            }
          }
        } catch (e) {
          console.error('Stream read error:', e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (error) {
    console.error('generate-script error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
