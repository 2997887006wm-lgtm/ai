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
    if (!ZHIPU_API_KEY) {
      return new Response(JSON.stringify({ error: 'ZHIPU_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, taskId, prompt, imageUrl } = await req.json();

    // Poll for result
    if (action === 'poll' && taskId) {
      const pollResp = await fetch(`https://open.bigmodel.cn/api/paas/v4/async-result/${taskId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${ZHIPU_API_KEY}` },
      });

      if (!pollResp.ok) {
        const t = await pollResp.text();
        console.error('Poll error:', pollResp.status, t);
        return new Response(JSON.stringify({ error: '查询视频状态失败' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pollData = await pollResp.json();
      // task_status: PROCESSING, SUCCESS, FAIL
      return new Response(JSON.stringify({
        status: pollData.task_status,
        videoUrl: pollData.video_result?.[0]?.url || null,
        coverUrl: pollData.video_result?.[0]?.cover_image_url || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Submit video generation
    if (!prompt) {
      return new Response(JSON.stringify({ error: '视频描述不能为空' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: Record<string, unknown> = {
      model: 'cogvideox-2',
      prompt,
    };

    // If imageUrl provided, use image-to-video
    if (imageUrl) {
      body.image_url = imageUrl;
    }

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/videos/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: '请求过于频繁，请稍后重试' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI额度不足，请充值' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('CogVideoX API error:', response.status, t);
      return new Response(JSON.stringify({ error: '视频生成请求失败' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const id = data.id;

    if (!id) {
      console.error('No task id returned:', data);
      return new Response(JSON.stringify({ error: '视频任务创建失败' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ taskId: id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-video error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
