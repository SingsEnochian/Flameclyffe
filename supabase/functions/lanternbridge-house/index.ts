import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const STEWARD_USER_SHA256 = "9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bearer(request: Request) {
  const match = String(request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
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
  if (!url || !serviceKey) return json(503, { error: "Lanternbridge House storage unavailable." });
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const user = await steward(request, client);
  if (!user) return json(401, { error: "Steward Supabase session required." });

  if (request.method === "GET") {
    const [indexResult, outboxResult, stateResult] = await Promise.all([
      client.from("lanternbridge_message_index").select("cursor_key,bridge_id,source_ref,source_repo,source_path,source_commit,protocol,origin,authors,addressed_to,responds_to,supersedes,thread_id,commons_entry_id,status,payload,source_created_at,processed_at,reply_emitted_at,updated_at").order("source_created_at", { ascending: true, nullsFirst: true }).limit(500),
      client.from("lanternbridge_outbox").select("id,bridge_id,responds_to,body,title,state,requested_at,claimed_at,committed_at,repo_path,commit_sha,error,updated_at").eq("requested_by", user.id).order("requested_at", { ascending: true }).limit(100),
      client.from("lanternbridge_house_state").select("last_seen_at,last_seen_bridge_id,updated_at").eq("user_id", user.id).maybeSingle(),
    ]);
    if (indexResult.error || outboxResult.error || stateResult.error) {
      console.error("Lanternbridge House read failed", indexResult.error || outboxResult.error || stateResult.error);
      return json(503, { error: "Lanternbridge House read failed." });
    }
    return json(200, {
      schema: "hearthgate.lanternbridge-house/v1",
      entries: indexResult.data || [],
      outbox: outboxResult.data || [],
      seen: stateResult.data || { last_seen_at: null, last_seen_bridge_id: null },
    });
  }

  if (request.method !== "POST") return json(405, { error: "GET or POST required." });
  let body: any;
  try { body = await request.json(); } catch { return json(400, { error: "Valid JSON body required." }); }

  if (body.action === "mark_seen") {
    const seenAt = body.last_seen_at ? new Date(String(body.last_seen_at)) : new Date();
    if (Number.isNaN(seenAt.getTime())) return json(400, { error: "last_seen_at must be a valid timestamp." });
    const patch = { user_id: user.id, last_seen_at: seenAt.toISOString(), last_seen_bridge_id: body.last_seen_bridge_id ? String(body.last_seen_bridge_id) : null, updated_at: new Date().toISOString() };
    const { data, error } = await client.from("lanternbridge_house_state").upsert(patch, { onConflict: "user_id" }).select("*").single();
    if (error) return json(503, { error: "Lanternbridge seen cursor write failed." });
    return json(200, { schema: "hearthgate.lanternbridge-seen/v1", seen: data });
  }

  if (body.action === "enqueue") {
    const respondsTo = String(body.responds_to || "").trim();
    const text = String(body.text || "").trim();
    const title = String(body.title || "House Chat reply").trim().slice(0, 160);
    if (!respondsTo) return json(400, { error: "responds_to is required." });
    if (!text) return json(400, { error: "Reply text is required." });
    if (text.length > 20000) return json(413, { error: "Reply text exceeds 20,000 characters." });
    const target = await client.from("lanternbridge_message_index").select("bridge_id,thread_id,status").eq("bridge_id", respondsTo).order("source_created_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    if (target.error || !target.data) return json(404, { error: "Lanternbridge reply target not found." });
    const bridgeId = `lb_${crypto.randomUUID()}`;
    const row = { bridge_id: bridgeId, responds_to: respondsTo, body: text, title, state: "queued", requested_by: user.id };
    const { data, error } = await client.from("lanternbridge_outbox").insert(row).select("id,bridge_id,responds_to,body,title,state,requested_at").single();
    if (error) {
      console.error("Lanternbridge enqueue failed", error);
      return json(503, { error: "Lanternbridge reply enqueue failed." });
    }
    return json(201, { schema: "hearthgate.lanternbridge-outbox-receipt/v1", delivery: "queued", item: data });
  }

  return json(400, { error: "Unsupported Lanternbridge House action." });
});
