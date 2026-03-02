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
    const ZHIPU_API_KEY = Deno.env.get('ZHIPU_API_KEY');
    const FREESOUND_API_KEY = Deno.env.get('FREESOUND_API_KEY');

    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY 未配置' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { shots } = await req.json();
    // shots: Array<{ id, visual, shotType, audio, duration, dialogue }>

    if (!shots || !Array.isArray(shots) || shots.length === 0) {
      return new Response(JSON.stringify({ error: 'shots array is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Use AI to analyze all shots and recommend audio keywords
    const shotDescriptions = shots.map((s: any, i: number) =>
      `分镜${i + 1}(${s.shotType}): 画面: ${s.visual}${s.audio ? ` 听觉提示: ${s.audio}` : ''}${s.dialogue ? ` 台词: ${s.dialogue}` : ''} 时长: ${s.duration}`
    ).join('\n');

    const aiResponse = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
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
            content: `你是一位专业的影视音效设计师。根据分镜描述，为每个分镜推荐最佳的音效组合。
你必须严格以JSON数组格式输出，不要输出任何其他内容。
每个元素包含：
- shotIndex: 分镜序号（从0开始）
- audioKeywords: 数组，3-5个英文音效关键词（用于Freesound搜索，如 "rain", "footsteps", "wind"）
- audioDescription: 中文音效描述（如 "细雨打在树叶上的声音，配合远处的雷声"）
- bgmSuggestion: 中文背景音乐建议（如 "低沉的弦乐，渐入钢琴"）
- intensity: 音效强度 0-100（安静=20，中等=50，激烈=80）`,
          },
          { role: 'user', content: shotDescriptions },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error('AI analysis error:', aiResponse.status, t);
      return new Response(JSON.stringify({ error: 'AI音效分析失败' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || '';
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let recommendations;
    try {
      recommendations = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI audio recommendations:', content);
      return new Response(JSON.stringify({ error: '音效推荐解析失败' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: For each recommendation, search Freesound for matching sounds
    if (FREESOUND_API_KEY) {
      for (const rec of recommendations) {
        const keyword = rec.audioKeywords?.[0] || '';
        if (!keyword) continue;

        try {
          const fsUrl = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(keyword)}&page_size=3&fields=id,name,duration,previews,tags,username&token=${FREESOUND_API_KEY}`;
          const fsResponse = await fetch(fsUrl);
          if (fsResponse.ok) {
            const fsData = await fsResponse.json();
            rec.freesoundResults = (fsData.results || []).map((r: any) => ({
              id: r.id,
              name: r.name,
              duration: r.duration,
              previewUrl: r.previews?.['preview-lq-mp3'] || r.previews?.['preview-hq-mp3'] || '',
              author: r.username,
            }));
          }
        } catch (e) {
          console.error('Freesound search error for', keyword, e);
        }
      }
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('recommend-audio error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
