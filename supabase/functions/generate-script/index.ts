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
      match_count: 5,
    });

    if (error || !data || data.length === 0) return '';

    return data.map((d: any) => `【${d.category === 'film_technique' ? '电影技法' : '自然常识'}】${d.title}：${d.content}`).join('\n');
  } catch (e) {
    console.error('RAG search error:', e);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inspiration, duration, mood } = await req.json();
    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!inspiration) {
      return new Response(JSON.stringify({ error: '灵感描述不能为空' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // RAG: Search knowledge base for relevant context
    let ragContext = '';
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      ragContext = await searchKnowledge(inspiration, ZHIPU_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    const ragSection = ragContext
      ? `\n\n【参考知识库】以下是从经典电影分镜手法和自然物候百科中检索到的相关知识，请在生成时参考并确保内容符合专业标准和自然常识：\n${ragContext}\n`
      : '';

    const moodHint = mood ? `情绪风格：${mood}。请深度融合该情绪风格到每个分镜的视觉描述、台词节奏、音效设计和导演手记中。` : '';

    let systemPrompt: string;
    let userPrompt: string;

    if (duration === 'long') {
      systemPrompt = `你是一位资深影视编剧。根据用户提供的灵感，生成一份包含多幕多场景的完整长片分镜脚本。
你必须严格以 JSON 格式输出，不要输出任何其他文字、解释或 markdown 标记。

输出格式：
{
  "tree": {
    "id": "root",
    "label": "总纲",
    "children": [
      {
        "id": "act1",
        "label": "第一幕 · 幕名",
        "children": [
          { "id": "act1-s1", "label": "场景一 · 场景名" },
          { "id": "act1-s2", "label": "场景二 · 场景名" }
        ]
      },
      {
        "id": "act2",
        "label": "第二幕 · 幕名",
        "children": [
          { "id": "act2-s1", "label": "场景三 · 场景名" }
        ]
      }
    ]
  },
  "sceneShotsMap": {
    "act1-s1": [
      {
        "shotType": "大远景",
        "visual": "画面描述",
        "duration": "5s",
        "dialogue": "",
        "audio": "环境音描述",
        "character": "",
        "directorNote": "导演手记",
        "emotionIntensity": 30
      }
    ],
    "act1-s2": [...],
    "act2-s1": [...]
  }
}

要求：
- 生成3-4个幕，每幕2-4个场景，形成完整的叙事弧线
- 【极其重要·最高优先级】每个场景必须包含5-8个详细分镜！这是硬性要求，绝对不允许出现空场景或少于5个分镜的场景！
- 每一幕的每一个场景都必须有完整的分镜内容，不能只有第一幕有内容而其他幕为空
- sceneShotsMap中的每个key对应的数组必须有5-8个完整的分镜对象
- 每个场景的id必须与tree中对应节点的id一致
- sceneShotsMap中的key必须是叶子节点（场景节点）的id
- sceneShotsMap中每个key对应的数组长度必须 >= 5
- 幕节点不需要在sceneShotsMap中
- shotType可选：大远景/远景/全景/中景/近景/特写/大特写
- visual不超过50字，要有画面感
- directorNote为拍摄建议和情绪提示
- emotionIntensity为0-100的整数，代表该分镜的情绪张力（0=平静低沉，50=中性过渡，100=高潮爆发）
- 情绪曲线应符合戏剧结构：铺垫→渐升→高潮→回落
- audio字段需要具体描述环境音和音效，用于后续音效匹配
${mood ? `- 整体情绪风格为"${mood}"，请将该风格深度融入每个分镜的视觉语言、台词节奏、音效氛围和导演指导中` : ''}
- 确保所有自然现象描述符合物理常识（如光影方向、天气逻辑、动物习性等）`;

      userPrompt = `灵感：${inspiration}
${moodHint}${ragSection}
请生成一份深度长片的完整分镜脚本。要求：
1. 必须包含3-4个幕，每幕2-4个场景
2. 每个场景必须包含5-8个详细分镜（这是最重要的要求）
3. sceneShotsMap中每个场景ID都必须有完整的分镜数组
4. 所有幕的所有场景都必须有分镜内容，不能出现空场景
直接输出JSON，不要包含任何其他内容。`;
    } else {
      systemPrompt = `你是一位资深影视分镜脚本编剧。根据用户提供的灵感，生成一份完整的分镜脚本。
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
${mood ? `\n整体情绪风格为"${mood}"，请将该风格深度融入每个分镜的视觉语言、台词节奏、音效氛围和导演指导中。` : ''}
- 确保所有自然现象描述符合物理常识（如光影方向、天气逻辑、动物习性等）`;

      userPrompt = `灵感：${inspiration}
${moodHint}${ragSection}
请生成 4-6 个分镜，时长类型：轻巧短片（总计60秒以内）。
情绪曲线应有起伏，符合叙事节奏。
直接输出 JSON 数组，不要包含任何其他内容。`;
    }

    // Call Zhipu API with streaming enabled
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.6v',
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
      console.error('Zhipu API error:', response.status, t);
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
