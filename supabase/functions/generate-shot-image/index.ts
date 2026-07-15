import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version',
  'Access-Control-Max-Age': '86400',
};

const RATIO_SIZE_MAP: Record<string, string> = {
  '16:9': '2560x1440',
  '9:16': '1440x2560',
  '1:1': '2048x2048',
  '4:3': '2400x1800',
  '3:4': '1800x2400',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

async function getUserIdFromRequest(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const { data } = await supabase.auth.getUser(token).catch(() => ({ data: null as any }));
  return data?.user?.id || null;
}

function buildPrompt(visual: string, shotType?: string, imageRatio?: string) {
  const ratioLabel = imageRatio || '16:9';
  return `生成一张电影分镜参考图。景别：${shotType || '中景'}。画面描述：${visual}。风格：写实风格，电影感光影，${ratioLabel}画幅，专业摄影构图。`;
}

async function generateImage(prompt: string, imageRatio?: string) {
  const ARK_API_KEY = Deno.env.get('ARK_API_KEY');
  if (!ARK_API_KEY) throw new Error('ARK_API_KEY not configured');

  const model = Deno.env.get('ARK_IMAGE_MODEL') || 'doubao-seedream-5-0-pro-260628';
  const size = RATIO_SIZE_MAP[imageRatio || '16:9'] || '2560x1440';

  const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ARK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(240000),
    body: JSON.stringify({
      model,
      prompt,
      size,
      response_format: 'url',
      watermark: false,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('请求过于频繁，请稍后重试');
    if (response.status === 402) throw new Error('AI额度不足，请充值');

    const t = await response.text();
    console.error('Ark Seedream API error:', response.status, t);
    throw new Error(t.includes('InvalidEndpointOrModel.NotFound')
      ? '当前 ARK_IMAGE_MODEL 不存在或密钥无权访问，请检查 Seedream 5.0 Pro 权限'
      : 'AI生成失败：' + t.slice(0, 200));
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) {
    console.error('No image url in Seedream response:', data);
    throw new Error('未能生成图片');
  }
  return imageUrl as string;
}

async function processImageJob(jobId: string, prompt: string, imageRatio?: string) {
  const supabase = getServiceClient();
  if (!supabase) return;

  try {
    const imageUrl = await generateImage(prompt, imageRatio);
    await supabase.from('image_jobs').update({
      status: 'completed',
      image_url: imageUrl,
      error_message: null,
    }).eq('id', jobId);
  } catch (error) {
    const message = error instanceof DOMException && error.name === 'TimeoutError'
      ? 'Seedream 配图仍在高峰期超时，请稍后重试或缩短画面描述'
      : error instanceof Error ? error.message : 'Unknown error';
    console.error('process image job error:', message);
    await supabase.from('image_jobs').update({
      status: 'failed',
      error_message: message,
    }).eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action = 'submit', visual, shotType, imageRatio, jobId } = body;
    const ARK_API_KEY = Deno.env.get('ARK_API_KEY');
    if (!ARK_API_KEY) {
      return jsonResponse({ error: 'ARK_API_KEY not configured' }, 500);
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return jsonResponse({ error: '后台服务密钥未配置，无法创建配图任务' }, 500);
    }

    const userId = await getUserIdFromRequest(req, supabase);

    if (action === 'poll') {
      if (!jobId) return jsonResponse({ error: '缺少配图任务ID' }, 400);

      const { data, error } = await supabase
        .from('image_jobs')
        .select('id,user_id,status,image_url,error_message')
        .eq('id', jobId)
        .single();

      if (error || !data) return jsonResponse({ error: '配图任务不存在' }, 404);
      if ((data.user_id || null) !== userId) return jsonResponse({ error: '无权查看此配图任务' }, 403);

      return jsonResponse({
        jobId: data.id,
        status: data.status,
        imageUrl: data.image_url,
        error: data.error_message,
      });
    }

    if (!visual) {
      return jsonResponse({ error: 'Visual description is required' }, 400);
    }

    const prompt = buildPrompt(visual, shotType, imageRatio);
    const { data: inserted, error: insertError } = await supabase.from('image_jobs').insert({
      user_id: userId,
      prompt,
      visual,
      shot_type: shotType || null,
      image_ratio: imageRatio || '16:9',
      status: 'processing',
    }).select('id').single();

    if (insertError || !inserted?.id) {
      console.error('create image job error:', insertError);
      return jsonResponse({ error: '创建配图任务失败' }, 500);
    }

    EdgeRuntime.waitUntil(processImageJob(inserted.id, prompt, imageRatio));

    return jsonResponse({ jobId: inserted.id, status: 'processing' }, 202);
  } catch (error) {
    console.error('generate-shot-image error:', error);
    const message = error instanceof DOMException && error.name === 'TimeoutError'
      ? 'Seedream 配图生成超时，请稍后重试或换一个更短的画面描述'
      : error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
