import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version',
  'Access-Control-Max-Age': '86400',
};

// Volcengine Ark Seedance uses async task API:
//  POST /api/v3/contents/generations/tasks -> { id }
//  GET  /api/v3/contents/generations/tasks/{id} -> { status, content: { video_url } }
// Status values: queued | running | succeeded | failed | cancelled
const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

function mapStatus(s: string): 'PROCESSING' | 'SUCCESS' | 'FAIL' {
  if (s === 'succeeded') return 'SUCCESS';
  if (s === 'failed' || s === 'cancelled') return 'FAIL';
  return 'PROCESSING';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ARK_API_KEY = Deno.env.get('ARK_API_KEY');
    if (!ARK_API_KEY) {
      return new Response(JSON.stringify({ error: 'ARK_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, taskId, prompt, imageUrl, ratio } = await req.json();

    // Poll
    if (action === 'poll' && taskId) {
      const pollResp = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${ARK_API_KEY}` },
      });

      if (!pollResp.ok) {
        const t = await pollResp.text();
        console.error('Ark poll error:', pollResp.status, t);
        return new Response(JSON.stringify({ error: '查询视频状态失败' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pollData = await pollResp.json();
      const status = mapStatus(pollData.status);
      const videoUrl = pollData.content?.video_url || null;

      return new Response(JSON.stringify({
        status,
        videoUrl,
        coverUrl: null,
        error: pollData.error?.message || null,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Submit
    if (!prompt) {
      return new Response(JSON.stringify({ error: '视频描述不能为空' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const model = Deno.env.get('ARK_VIDEO_MODEL') || 'doubao-seedance-1-5-pro-251215';
    const aspectRatio = ratio || '16:9';

    // Seedance parameters are appended to the text prompt as flags, e.g. --ratio 16:9 --dur 5
    const promptWithParams = `${prompt} --ratio ${aspectRatio} --resolution 1080p --dur 5`;

    const content: Array<Record<string, unknown>> = [
      { type: 'text', text: promptWithParams },
    ];
    if (imageUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: imageUrl },
        role: 'first_frame',
      });
    }

    const response = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, content }),
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
      console.error('Seedance API error:', response.status, t);
      const friendly = t.includes('InvalidEndpointOrModel.NotFound')
        ? '当前 ARK_VIDEO_MODEL 不存在或密钥无权访问，请检查 Seedance 1.0 Pro 权限'
        : '视频生成请求失败：' + t.slice(0, 200);
      return new Response(JSON.stringify({ error: friendly }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const id = data.id;

    if (!id) {
      console.error('No task id in Seedance response:', data);
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
