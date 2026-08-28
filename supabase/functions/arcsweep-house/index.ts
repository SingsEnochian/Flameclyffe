import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STEWARD_USER_SHA256 = "9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function bearer(request: Request) {
  const match = String(request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function steward(request: Request, client: any) {
  const token = bearer(request);
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return await sha256(String(data.user.id)) === STEWARD_USER_SHA256 ? data.user : null;
}

function canonicalEntry(input: any) {
  const now = new Date().toISOString();
  const id = String(input?.id || crypto.randomUUID()).trim();
  return {
    ...input,
    id,
    schema: String(input?.schema || "hearthgate.house-commons-entry/v4"),
    kind: String(input?.kind || "steward"),
    author: String(input?.author || "Rowan"),
    status: String(input?.status || "sent"),
    text: String(input?.text || ""),
    created_at: String(input?.created_at || now),
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return json(503, { error: "ArcSweep House storage unavailable." });
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const user = await steward(request, client);
  if (!user) return json(401, { error: "Steward Supabase session required." });

  if (request.method === "GET") {
    const { data, error } = await client
      .from("house_commons_entries")
      .select("key,payload,created_at")
      .order("created_at", { ascending: true })
      .limit(1000);
    if (error) return json(503, { error: "House Commons read failed.", detail: error.message });
    return json(200, {
      schema: "hearthgate.arcsweep-house-portable/v1",
      transport: "supabase-edge",
      entries: (data || []).map((row: any) => ({ ...(row.payload || {}), created_at: row.payload?.created_at || row.created_at })),
    });
  }

  if (request.method !== "POST") return json(405, { error: "GET or POST required." });
  let body: any;
  try { body = await request.json(); } catch { return json(400, { error: "Valid JSON body required." }); }
  const entry = canonicalEntry(body?.entry || body);
  if (!entry.text && !entry.rich_text_html) return json(400, { error: "House Commons entry text is required." });
  const stable = String(entry.idempotency_key || entry.id).trim();
  const key = `entries/runtime-${encodeURIComponent(stable)}`;

  const existing = await client.from("house_commons_entries").select("payload,created_at").eq("key", key).maybeSingle();
  if (existing.error) return json(503, { error: "House Commons idempotency read failed.", detail: existing.error.message });
  if (existing.data) return json(200, { ...(existing.data.payload || {}), created_at: existing.data.payload?.created_at || existing.data.created_at, idempotent_replay: true });

  const { data, error } = await client
    .from("house_commons_entries")
    .insert({ key, payload: entry, created_at: entry.created_at })
    .select("payload,created_at")
    .single();
  if (error) return json(503, { error: "House Commons write failed.", detail: error.message });
  return json(201, { ...(data.payload || {}), created_at: data.payload?.created_at || data.created_at });
});
