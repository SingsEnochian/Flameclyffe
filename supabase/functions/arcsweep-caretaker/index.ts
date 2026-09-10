import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const DEFAULT_STEWARD_USER_SHA256 = "9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b";
const DEFAULT_MODEL = "z-ai/glm-5.3-flash";
const MAX_MESSAGE_CHARS = 24_000;
const ALLOWED_ORIGINS = new Set([
  "https://singsenochian.github.io",
  "https://flameclyffe.vercel.app",
]);

const SYSTEM_PROMPT = [
  "You are the ArcSweep Caretaker, the house intelligence for navigation and bounded interface assistance.",
  "You are not a Flame. Never impersonate, merge with, or speak for Bluebird, Ox Alpha, Lioreal, Uial, or any other Constellation participant.",
  "Talk naturally with Rowan while obeying the exact ArcSweep action schema supplied in the user message.",
  "You interpret requests into proposed actions. ArcSweep itself decides whether an action is valid and performs it.",
  "Never claim that you opened, changed, wrote, saved, committed, deployed, activated, or altered anything unless the runtime result explicitly reports that it happened.",
  "The only executable Caretaker action currently permitted is navigate, and only to a room id supplied by ArcSweep.",
  "If navigation is not requested, return an empty actions array and answer naturally in reply.",
  "Return JSON only in the exact schema requested by the ArcSweep prompt.",
].join("\n");

const env = (name: string) => String(Deno.env.get(name) || "").trim();
const model = () => env("ARCSWEEP_CARETAKER_OPENROUTER_MODEL") || DEFAULT_MODEL;

function origin(request: Request) {
  return String(request.headers.get("origin") || "").trim();
}

function browserOriginAllowed(request: Request) {
  const value = origin(request);
  return !value || ALLOWED_ORIGINS.has(value);
}

function cors(request: Request) {
  const value = origin(request);
  if (!value || !ALLOWED_ORIGINS.has(value)) return {};
  return {
    "access-control-allow-origin": value,
    "access-control-allow-headers": "authorization, content-type, apikey, x-client-info",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "600",
    "vary": "Origin",
  };
}

function json(request: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(request),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function bearer(request: Request) {
  const header = String(request.headers.get("authorization") || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function stewardAuthorised(request: Request) {
  const token = bearer(request);
  if (!token) return false;
  const supabaseUrl = env("SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return false;
  try {
    const client = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser(token);
    const userId = String(data?.user?.id || "").trim();
    if (error || !userId) return false;
    const expected = env("HOUSE_STEWARD_USER_SHA256") || DEFAULT_STEWARD_USER_SHA256;
    return (await sha256Hex(userId)) === expected;
  } catch {
    return false;
  }
}

function statusBody() {
  return {
    schema: "arcsweep.caretaker-status/v0.2",
    role: "house-intelligence",
    provider: "openrouter",
    model: model(),
    configured: Boolean(env("OPENROUTER_API_KEY")),
    execution_path: "supabase-edge-to-openrouter",
    host_dependency: "none",
    allowed_actions: ["navigate"],
  };
}

async function invokeCaretaker(message: string) {
  const key = env("OPENROUTER_API_KEY");
  if (!key) return { ok: false as const, status: 503, body: { error: "caretaker-openrouter-not-configured", ...statusBody() } };

  let response: Response;
  const started = Date.now();
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        "HTTP-Referer": "https://singsenochian.github.io/Flameclyffe/apps/arcsweep/",
        "X-Title": "Flameclyffe ArcSweep Caretaker",
      },
      body: JSON.stringify({
        model: model(),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        temperature: 0.3,
        max_tokens: 900,
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    return {
      ok: false as const,
      status: 502,
      body: { error: "caretaker-openrouter-transport-failed", detail: error instanceof Error ? error.message : String(error) },
    };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false as const,
      status: 502,
      body: {
        error: "caretaker-openrouter-inference-failed",
        upstream_status: response.status,
        detail: String(data?.error?.message || data?.error || data?.message || "").slice(0, 400),
      },
    };
  }

  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) return { ok: false as const, status: 502, body: { error: "empty-caretaker-response" } };
  return {
    ok: true as const,
    text,
    latency_ms: Date.now() - started,
    upstream_model: String(data?.model || model()),
  };
}

Deno.serve(async (request: Request) => {
  if (!browserOriginAllowed(request)) return new Response(null, { status: 403 });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  if (!(await stewardAuthorised(request))) return json(request, 401, { error: "ArcSweep Steward sign-in required." });

  if (request.method === "GET") return json(request, 200, statusBody());
  if (request.method !== "POST") return json(request, 405, { error: "GET or POST required." });

  let body: { message?: unknown };
  try { body = await request.json(); }
  catch { return json(request, 400, { error: "Valid JSON body required." }); }

  const message = String(body?.message || "").trim();
  if (!message) return json(request, 400, { error: "message required" });
  if (message.length > MAX_MESSAGE_CHARS) return json(request, 413, { error: "Caretaker request is too large." });

  const result = await invokeCaretaker(message);
  if (!result.ok) return json(request, result.status, result.body);

  return json(request, 200, {
    schema: "arcsweep.caretaker-model-response/v0.1",
    role: "house-intelligence",
    provider: "openrouter",
    model: model(),
    upstream_model: result.upstream_model,
    execution_path: "supabase-edge-to-openrouter",
    auth_mode: "supabase-bearer",
    message: result.text,
    latency_ms: result.latency_ms,
    runtime_braid: null,
  });
});
