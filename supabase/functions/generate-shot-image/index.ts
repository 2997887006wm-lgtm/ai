import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { visual, shotType, imageRatio } = await req.json();
    const ARK_API_KEY = Deno.env.get('ARK_API_KEY');
    if (!ARK_API_KEY) {
      return new Response(JSON.stringify({ error: 'ARK_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!visual) {
      return new Response(JSON.stringify({ error: 'Visual description is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Keep storyboard reference images compact so Seedream 5.0 Pro returns before browser/function timeouts.
    const RATIO_SIZE_MAP: Record<string, string> = {
      '16:9': '1024x576',
      '9:16': '576x1024',
      '1:1': '1024x1024',
      '4:3': '1024x768',
      '3:4': '768x1024',
    };
    const size = RATIO_SIZE_MAP[imageRatio] || '2048x1152';
    const ratioLabel = imageRatio || '16:9';

    const prompt = `生成一张电影分镜参考图。景别：${shotType || '中景'}。画面描述：${visual}。风格：写实风格，电影感光影，${ratioLabel}画幅，专业摄影构图。`;

    const model = Deno.env.get('ARK_IMAGE_MODEL') || 'doubao-seedream-5-0-pro-260628';

    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ARK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(110000),
      body: JSON.stringify({
        model,
        prompt,
        size,
        response_format: 'url',
        watermark: false,
      }),
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
      console.error('Ark Seedream API error:', response.status, t);
      const friendly = t.includes('InvalidEndpointOrModel.NotFound')
        ? '当前 ARK_IMAGE_MODEL 不存在或密钥无权访问，请检查 Seedream 5.0 Pro 权限'
        : 'AI生成失败：' + t.slice(0, 200);
      return new Response(JSON.stringify({ error: friendly }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      console.error('No image url in Seedream response:', data);
      return new Response(JSON.stringify({ error: '未能生成图片' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('generate-shot-image error:', error);
    const message = error instanceof DOMException && error.name === 'TimeoutError'
      ? 'Seedream 配图生成超时，请稍后重试或换一个更短的画面描述'
      : error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
