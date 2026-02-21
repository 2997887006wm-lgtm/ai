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
    const { prompt } = await req.json();
    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: '提示词不能为空' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.6v',
        messages: [
          {
            role: 'system',
            content: `你是一位专业的影视编剧顾问。用户会给你一段灵感描述或提示词，你需要对其进行润色和增强，使其更具画面感、叙事性和电影感。

要求：
- 保持用户原始创意的核心不变
- 增加具体的视觉细节（光线、色彩、材质）
- 补充感官描写（声音、气味、触感）
- 增强叙事性和戏剧张力
- 添加有意义的角色或情境暗示
- 润色后的文字控制在100-200字之间
- 只输出润色后的提示词，不要输出任何解释或其他内容
- 使用中文输出`,
          },
          { role: 'user', content: `请润色以下灵感提示词：\n${prompt}` },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error('Zhipu API error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI润色失败' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const polished = data.choices?.[0]?.message?.content?.trim() || '';

    return new Response(JSON.stringify({ polished }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('polish-prompt error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
