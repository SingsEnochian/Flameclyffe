// Hosted Wayglass model relay. Requires a Supabase JWT and an owner allowlist.
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "content-type": "application/json", "cache-control": "no-store" }
});
Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const bearer = request.headers.get("authorization") || "";
  const jwt = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const ownerId = Deno.env.get("WAYGLASS_OWNER_USER_ID");
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!supabaseUrl || !anonKey || !ownerId || !apiKey) return json({ error: "Hosted route not configured" }, 503);
  if (!jwt) return json({ error: "Authentication required" }, 401);
  const who = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: { authorization: "Bearer " + jwt, apikey: anonKey }
  }).catch(() => null);
  if (!who?.ok) return json({ error: "Invalid session" }, 401);
  const user = await who.json();
  if (user.id !== ownerId) return json({ error: "Owner access required" }, 403);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (body.route_id !== "openai:gpt") return json({ error: "This hosted relay supports openai:gpt only" }, 422);
  const input = typeof body.input === "string" ? body.input.trim().slice(0, 12000) : "";
  if (!input) return json({ error: "Input required" }, 422);
  const history = Array.isArray(body.history) ? body.history.slice(-12).filter((m) =>
    m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
  ).map((m) => ({ role: m.role, content: m.content.slice(0, 8000) })) : [];
  const model = Deno.env.get("WAYGLASS_OPENAI_MODEL") || "gpt-4.1-mini";
  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
    body: JSON.stringify({ model, input: [
      { role: "developer", content: "You are the external model route in Wayglass Writing Room. Attribute observations precisely; do not claim to have inspected unavailable systems." },
      ...history, { role: "user", content: input }
    ], max_output_tokens: Math.max(100, Math.min(2000, Number(body.max_output_tokens) || 1400)) })
  }).catch(() => null);
  if (!upstream) return json({ error: "Model provider unreachable" }, 502);
  if (!upstream.ok) return json({ error: "Model provider failed", upstream_status: upstream.status }, 502);
  const result = await upstream.json();
  const output = (result.output || []).flatMap((item: any) => item.content || [])
    .filter((part: any) => part.type === "output_text").map((part: any) => part.text).join("\n");
  const completed_at = new Date().toISOString();
  return json({ output, provider: "openai", model, receipt: {
    schema: "wayglass.hosted-route-receipt/v1", route_id: "openai:gpt",
    epistemic_register: "external-observation", completed_at, response_id: result.id,
    session_id: typeof body.session_id === "string" ? body.session_id.slice(0, 120) : null
  } });
});
