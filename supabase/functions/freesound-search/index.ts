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
    const { query, page = 1, pageSize = 15 } = await req.json();
    const apiKey = Deno.env.get('FREESOUND_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'FREESOUND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const params = new URLSearchParams({
      query,
      page: String(page),
      page_size: String(pageSize),
      fields: 'id,name,duration,previews,tags,username',
      token: apiKey,
    });

    const response = await fetch(`https://freesound.org/apiv2/search/text/?${params}`);
    const data = await response.json();

    if (!response.ok) {
      console.error('Freesound API error:', data);
      return new Response(JSON.stringify({ error: data.detail || 'Freesound API error' }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = (data.results || []).map((s: any) => ({
      id: String(s.id),
      name: s.name,
      duration: formatDuration(s.duration),
      previewUrl: s.previews?.['preview-lq-mp3'] || s.previews?.['preview-hq-mp3'] || '',
      tags: (s.tags || []).slice(0, 3),
      author: s.username,
    }));

    return new Response(JSON.stringify({ results, count: data.count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('freesound-search error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
