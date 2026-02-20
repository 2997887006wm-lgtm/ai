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
    const { inspiration, duration, mood } = await req.json();
    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
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

    const shotCount = duration === 'short' ? '4-6' : '8-12';
    const moodHint = mood ? `情绪风格：${mood}。` : '';

    const systemPrompt = `你是一位资深影视分镜脚本编剧。根据用户提供的灵感，生成一份完整的分镜脚本。
你必须严格以 JSON 数组格式输出，不要输出任何其他文字、解释或 markdown 标记。
每个分镜对象包含以下字段：
- shotType: 景别（大远景/远景/全景/中景/近景/特写/大特写）
- visual: 视觉画面描述（具体、有画面感、不超过50字）
- duration: 预估时长（如 "5s"）
- dialogue: 台词或旁白（可为空字符串）
- audio: 听觉营造（环境音、音乐提示）
- character: 角色侧写（可为空字符串）
- directorNote: 导演手记（拍摄建议、情绪提示）`;

    const userPrompt = `灵感：${inspiration}
${moodHint}
请生成 ${shotCount} 个分镜，时长类型：${duration === 'short' ? '轻巧短片（总计60秒以内）' : '深度长片'}。
直接输出 JSON 数组，不要包含任何其他内容。`;

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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
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

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let shots;
    try {
      shots = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response as JSON:', content);
      return new Response(JSON.stringify({ error: '脚本解析失败，请重试' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!Array.isArray(shots)) {
      return new Response(JSON.stringify({ error: '脚本格式错误，请重试' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ shots }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-script error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
