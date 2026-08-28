import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "flameclyffe-lanternbridge";
const REPOSITORY = "mdkubit/UH-Lanternbridge";
const REF = "refs/heads/main";
const WORKFLOW = ".github/workflows/flameclyffe-lanternbridge-outbox.yml";
const CLOCK_SKEW_SECONDS = 60;
let cachedJwks: any = null;
let cachedJwksAt = 0;

function json(status: number, body: unknown) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } }); }
function b64urlBytes(value: string) { let s = value.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }
function decode(value: string) { return JSON.parse(new TextDecoder().decode(b64urlBytes(value))); }
function audienceMatches(actual: unknown) { return Array.isArray(actual) ? actual.includes(AUDIENCE) : String(actual || "") === AUDIENCE; }
async function fetchJson(url: string) { const r = await fetch(url, { headers: { accept: "application/json", "user-agent": "Flameclyffe-Lanternbridge-Outbox/1.0" }, cache: "no-store" }); if (!r.ok) throw new Error(`oidc_metadata_${r.status}`); return r.json(); }
async function jwks() {
  if (cachedJwks && Date.now() - cachedJwksAt < 300000) return cachedJwks;
  const discovery = await fetchJson(`${ISSUER}/.well-known/openid-configuration`);
  if (discovery.issuer !== ISSUER) throw new Error("issuer_mismatch");
  const url = new URL(String(discovery.jwks_uri || ""));
  if (url.protocol !== "https:" || url.hostname !== "token.actions.githubusercontent.com") throw new Error("untrusted_jwks");
  cachedJwks = await fetchJson(url.href); cachedJwksAt = Date.now(); return cachedJwks;
}
async function authorise(request: Request) {
  const match = String(request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || "";
  if (!token || token.split(".").length !== 3) return { ok: false, reason: "missing_or_non_jwt_bearer" };
  const [h,p,s] = token.split("."); let header: any; let claims: any;
  try { header = decode(h); claims = decode(p); } catch { return { ok: false, reason: "malformed_jwt" }; }
  const now = Math.floor(Date.now()/1000);
  if (header.alg !== "RS256" || !header.kid) return { ok:false, reason:"unsupported_header" };
  if (claims.iss !== ISSUER || !audienceMatches(claims.aud) || claims.repository !== REPOSITORY || claims.ref !== REF) return { ok:false, reason:"claim_mismatch" };
  if (claims.repository_visibility && claims.repository_visibility !== "private") return { ok:false, reason:"visibility_mismatch" };
  if (!String(claims.workflow_ref || "").startsWith(`${REPOSITORY}/${WORKFLOW}@`)) return { ok:false, reason:"workflow_mismatch" };
  if (!Number.isFinite(Number(claims.exp)) || Number(claims.exp) < now - CLOCK_SKEW_SECONDS || !Number.isFinite(Number(claims.iat)) || Number(claims.iat) > now + CLOCK_SKEW_SECONDS) return { ok:false, reason:"time_invalid" };
  try {
    const keys = await jwks(); const jwk = keys.keys.find((k:any) => k.kid === header.kid && k.kty === "RSA"); if (!jwk) return {ok:false,reason:"key_missing"};
    const key = await crypto.subtle.importKey("jwk", jwk, { name:"RSASSA-PKCS1-v1_5", hash:"SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify({name:"RSASSA-PKCS1-v1_5"}, key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`));
    return valid ? {ok:true,claims} : {ok:false,reason:"signature_invalid"};
  } catch (error) { console.error("Lanternbridge outbox OIDC failure", error); return {ok:false,reason:"verification_unavailable"}; }
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { error: "POST required." });
  const auth = await authorise(request); if (!auth.ok) return json(401, { error: "Attested GitHub Actions OIDC token required.", oidc_reason: auth.reason });
  const url = Deno.env.get("SUPABASE_URL") || ""; const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return json(503, { error: "Outbox storage unavailable." });
  const client = createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } });
  let body:any; try { body = await request.json(); } catch { return json(400,{error:"Valid JSON body required."}); }
  const now = new Date();

  if (body.action === "claim") {
    const stale = new Date(now.getTime() - 15*60*1000).toISOString();
    await client.from("lanternbridge_outbox").update({ state:"queued", claimed_at:null, updated_at:now.toISOString(), error:"stale_claim_recovered" }).eq("state","claimed").lt("claimed_at", stale);
    const queued = await client.from("lanternbridge_outbox").select("id,bridge_id,responds_to,body,title,requested_at").eq("state","queued").order("requested_at",{ascending:true}).limit(20);
    if (queued.error) return json(503,{error:"Outbox claim read failed."});
    const ids = (queued.data || []).map((x:any)=>x.id);
    if (!ids.length) return json(200,{schema:"hearthgate.lanternbridge-outbox-claim/v1",items:[]});
    const claimed = await client.from("lanternbridge_outbox").update({state:"claimed",claimed_at:now.toISOString(),updated_at:now.toISOString(),error:null}).in("id",ids).eq("state","queued").select("id,bridge_id,responds_to,body,title,requested_at");
    if (claimed.error) return json(503,{error:"Outbox claim write failed."});
    return json(200,{schema:"hearthgate.lanternbridge-outbox-claim/v1",items:claimed.data || []});
  }

  if (body.action === "complete") {
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    const commitSha = String(body.commit_sha || "").trim();
    const paths = body.paths && typeof body.paths === "object" ? body.paths : {};
    if (!ids.length || !commitSha) return json(400,{error:"ids and commit_sha are required."});
    for (const id of ids) {
      const patch = { state:"committed", committed_at:now.toISOString(), commit_sha:commitSha, repo_path: paths[id] ? String(paths[id]) : null, updated_at:now.toISOString(), error:null };
      const result = await client.from("lanternbridge_outbox").update(patch).eq("id",id).eq("state","claimed");
      if (result.error) return json(503,{error:"Outbox completion failed."});
    }
    return json(200,{schema:"hearthgate.lanternbridge-outbox-complete/v1",completed:ids.length,commit_sha:commitSha});
  }

  if (body.action === "fail") {
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
    const error = String(body.error || "worker_failed").slice(0,1000);
    if (ids.length) await client.from("lanternbridge_outbox").update({state:"failed",error,updated_at:now.toISOString()}).in("id",ids).eq("state","claimed");
    return json(200,{schema:"hearthgate.lanternbridge-outbox-fail/v1",failed:ids.length});
  }

  return json(400,{error:"Unsupported outbox worker action."});
});
