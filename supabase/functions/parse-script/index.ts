import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!text?.trim() || text.trim().length < 10) {
      return new Response(JSON.stringify({ error: '请输入至少10个字的脚本文案' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `你是一位专业的影视分镜师与视觉化翻译引擎。用户会给你一段连续的中文脚本/故事文案，你需要：

1. **智能拆分镜头**：根据上下文情节、情感节奏、动作变化，将长文本切割为多个独立短镜头。每个镜头建议3-5秒，对应单一主要动作或画面。

2. **视觉化翻译**：将文学性、抽象化的描述具象化为具体的视觉元素。
   - 例如："岁月静好" → "午后阳光斜照在木桌上，一杯微微冒着热气的咖啡旁，白猫蜷缩在窗台上"
   - 例如："心如刀割" → "人物面部特写，眼眶微红，一滴泪划过脸颊，背景虚化"

3. **镜头语言补充**：为每个镜头自动补充专业的镜头语言：
   - 景别：大远景、远景、全景、中景、中近景、近景、特写、大特写
   - 运镜：推、拉、摇、移、跟、升、降、旋转、固定
   - 光影风格：自然光、逆光、侧光、顶光、低调光、高调光、柔光等

4. **情感强度标注**：为每个镜头标注情感强度（0-100），帮助后续视频生成把控节奏。

请严格按以下JSON格式输出，不要输出任何其他内容：
{
  "shots": [
    {
      "shotType": "景别（如：特写、中景、远景等）",
      "visual": "具象化的画面描述，包含具体视觉元素、光影、色彩",
      "duration": "建议时长（如 3s、4s、5s）",
      "dialogue": "该镜头对应的台词或旁白（无则留空）",
      "audio": "音效与环境声描述",
      "character": "出场角色描述（无则留空）",
      "directorNote": "运镜方式 + 光影风格 + 节奏提示",
      "emotionIntensity": 50,
      "cameraMovement": "运镜描述（推/拉/摇/移/跟/固定等）",
      "lightingStyle": "光影风格描述"
    }
  ]
}

要求：
- 每个镜头只对应一个主要动作或画面转换
- 镜头数量根据文本长度自动调整，通常每50-100字对应1-2个镜头
- visual字段必须是具体、可视化的描述，不能出现抽象形容
- directorNote应包含运镜指示和光影风格
- 保持原文的情感基调和叙事节奏
- 合理分配镜头的景别变化，避免单调`;

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请将以下脚本文案智能拆分为分镜并补充镜头语言：\n\n${text}` },
        ],
        temperature: 0.6,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error('Zhipu API error:', response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'AI服务繁忙，请稍后重试' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: '脚本解析失败' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Strip markdown fences
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Failed to parse JSON:', content.slice(0, 500));
      return new Response(JSON.stringify({ error: '解析结果格式异常，请重试' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!parsed.shots || !Array.isArray(parsed.shots) || parsed.shots.length === 0) {
      return new Response(JSON.stringify({ error: '未能生成有效分镜，请检查输入文案' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure each shot has all required fields with defaults
    const shots = parsed.shots.map((s: any, i: number) => ({
      shotType: s.shotType || '中景',
      visual: s.visual || '',
      duration: s.duration || '4s',
      dialogue: s.dialogue || '',
      audio: s.audio || '',
      character: s.character || '',
      directorNote: [
        s.cameraMovement || s.directorNote || '',
        s.lightingStyle ? `光影：${s.lightingStyle}` : '',
      ].filter(Boolean).join(' · ') || s.directorNote || '',
      emotionIntensity: typeof s.emotionIntensity === 'number' ? s.emotionIntensity : 50,
    }));

    return new Response(JSON.stringify({ shots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('parse-script error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
