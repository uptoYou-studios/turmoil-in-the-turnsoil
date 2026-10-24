import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!serviceKey && secretKeys) {
    try { serviceKey = JSON.parse(secretKeys).default; } catch { /* use legacy key if available */ }
  }
  if (!supabaseUrl || !serviceKey) return Response.json({ error: "Function is not configured" }, { status: 500, headers: corsHeaders });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.from("site_assets")
    .select("id,filename,file_path,category,mime_type,size_bytes,created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Could not load published files" }, { status: 500, headers: corsHeaders });

  const assets = await Promise.all((data ?? []).map(async (asset) => {
    const { data: signed, error: signError } = await admin.storage.from("site-assets").createSignedUrl(asset.file_path, 60 * 60);
    if (signError || !signed) return null;
    return {
      id: asset.id,
      filename: asset.filename,
      category: asset.category,
      mime_type: asset.mime_type,
      size_bytes: asset.size_bytes,
      created_at: asset.created_at,
      url: signed.signedUrl,
    };
  }));
  return Response.json(assets.filter(Boolean), {
    headers: { ...corsHeaders, "Cache-Control": "public, max-age=60, s-maxage=60" },
  });
});
