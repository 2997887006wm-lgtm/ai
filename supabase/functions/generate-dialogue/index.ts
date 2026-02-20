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
    const { visual, shotType, character, duration, mode = 'dialogue', customPrompt } = await req.json();
    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visual) {
      return new Response(JSON.stringify({ error: 'Visual description is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (customPrompt) {
      systemPrompt = '你是一位专业的影视创意总监。请严格按照用户要求输出，不要添加任何额外内容、标点或格式。';
      userPrompt = customPrompt;
    } else {
      systemPrompt = mode === 'narration'
        ? '你是一位专业的视频旁白撰稿人。根据画面描述撰写简洁、富有诗意的旁白口播文案。语言风格：克制、优雅、有呼吸感。只输出旁白文案本身，不要任何解释或标注。'
        : '你是一位专业的影视编剧。根据画面描述和角色信息，撰写符合情景的对白台词。台词需自然流畅、符合角色性格。只输出台词本身，不要任何解释或标注。';

      userPrompt = `画面描述：${visual}
景别：${shotType || '中景'}
角色：${character || '未指定'}
预估时长：${duration || '5s'}

请生成${mode === 'narration' ? '旁白口播' : '角色台词'}。`;
    }

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
    const text = data.choices?.[0]?.message?.content || '';

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-dialogue error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
