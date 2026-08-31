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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return json(503, { error: "ArcSweep Runtime receipt storage unavailable." });
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const user = await steward(request, client);
  if (!user) return json(401, { error: "Steward Supabase session required." });

  if (request.method === "GET") {
    const requestUrl = new URL(request.url);
    const eventId = String(requestUrl.searchParams.get("event_id") || "").trim();
    const voiceId = String(requestUrl.searchParams.get("voice_id") || "").trim();
    const threadId = String(requestUrl.searchParams.get("thread_id") || "").trim();
    let query = client
      .from("house_runtime_events")
      .select("event_sequence,event_id,event_type,world_id,actor_id,occurred_at,packet_id,packet_fingerprint,source_receipt_ids,thread_id,turn_id,voice_id,provider,model,route,payload,created_at")
      .eq("event_type", "model-reply-receipted")
      .order("event_sequence", { ascending: false })
      .limit(eventId ? 1 : 50);
    if (eventId) query = query.eq("event_id", eventId);
    if (voiceId) query = query.eq("voice_id", voiceId);
    if (threadId) query = query.eq("thread_id", threadId);
    const { data, error } = await query;
    if (error) return json(503, { error: "Runtime receipt read failed.", detail: error.message });
    return json(200, {
      schema: "arcsweep.runtime-receipt-edge/v1",
      transport: "supabase-edge",
      events: data || [],
    });
  }

  if (request.method !== "POST") return json(405, { error: "GET or POST required." });
  let body: any;
  try { body = await request.json(); } catch { return json(400, { error: "Valid JSON body required." }); }
  const event = body?.event || body;
  const { data, error } = await client.rpc("house_runtime_append_model_reply", { p_event: event });
  if (error) return json(400, { error: "Runtime receipt rejected.", detail: error.message });
  return json(data?.applied === false ? 200 : 201, {
    schema: "arcsweep.runtime-receipt-edge/v1",
    transport: "supabase-edge",
    ...data,
  });
});
