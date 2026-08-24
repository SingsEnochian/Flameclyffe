#!/usr/bin/env node

const base = String(process.env.ARCSWEEP_SMOKE_BASE_URL || 'https://flameclyffe-starwell.netlify.app').replace(/\/$/, '');
const publicOnly = process.argv.includes('--public') || String(process.env.ARCSWEEP_SMOKE_PUBLIC_ONLY || '') === '1';
const suppliedCookie = String(process.env.ARCSWEEP_SMOKE_COOKIE || '').trim();
const supabaseAccessToken = String(process.env.ARCSWEEP_SUPABASE_ACCESS_TOKEN || '').trim();
const legacyCredential = String(process.env.ARCSWEEP_STEWARD_KEY || '').trim();

const appPath = '/arcsweep/';
const workletPath = '/arcsweep/assets/spessasynth_processor.min.js';
let cookie = suppliedCookie;

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (cookie) headers.set('cookie', cookie);
  const response = await fetch(`${base}${path}`, { ...options, headers, redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return response;
}

async function json(path, options = {}) {
  const response = await request(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ${response.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const page = await request(appPath);
assert(page.ok, `Arcsweep page failed: ${page.status}`);
assert(String(page.headers.get('content-type') || '').includes('text/html'), 'Arcsweep page did not return HTML.');

const worklet = await request(workletPath);
assert(worklet.ok, `SpessaSynth worklet failed: ${worklet.status}`);
assert(/javascript|ecmascript/i.test(String(worklet.headers.get('content-type') || '')), 'SpessaSynth worklet did not return JavaScript.');

const publicChecks = {
  app: { path: appPath, status: page.status },
  spessasynth_worklet: { path: workletPath, status: worklet.status },
};

let authMode = null;
if (cookie) {
  const session = await json('/api/v1/house/session');
  assert(session.connected === true, 'Supplied House Runtime cookie is not connected.');
  authMode = `cookie:${session.mode || 'sealed-session'}`;
} else if (supabaseAccessToken) {
  const session = await json('/api/v1/house/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ supabase_access_token: supabaseAccessToken }),
  });
  assert(session.connected === true, 'Supabase Steward exchange did not connect House Runtime.');
  authMode = session.mode || 'supabase-auth';
} else if (legacyCredential) {
  const session = await json('/api/v1/house/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ credential: legacyCredential }),
  });
  assert(session.connected === true, 'Legacy Steward credential did not connect House Runtime.');
  authMode = session.mode || 'credential';
} else if (publicOnly) {
  console.log(JSON.stringify({
    ok: true,
    scope: 'public-production-instrument',
    authenticated: false,
    base,
    public_checks: publicChecks,
    next: 'Run without --public using ARCSWEEP_SMOKE_COOKIE, ARCSWEEP_SUPABASE_ACCESS_TOKEN, or legacy ARCSWEEP_STEWARD_KEY to exercise House Runtime and Commons.',
  }, null, 2));
  process.exit(0);
} else {
  throw new Error('Hosted Terra Prime smoke needs Steward authority. Supply ARCSWEEP_SMOKE_COOKIE or ARCSWEEP_SUPABASE_ACCESS_TOKEN. Legacy ARCSWEEP_STEWARD_KEY remains supported for non-hosted compatibility. Use --public only for the unauthenticated production-asset preflight.');
}

const atlas = await json('/api/v1/flames/atlas/status');
assert(atlas.runtime_reachable !== false, 'Atlas runtime is unreachable.');
const commonsBefore = await json('/api/v1/house/commons');
const threadId = `terra-prime-smoke:${Date.now()}`;
const worldContext = {
  schema: 'arcsweep.runtime-world-context/v1',
  context_id: `terra-prime-smoke-context:${Date.now()}`,
  identity_anchor: { world_id: 'terra-prime', world_name: 'Terra Prime' },
  provenance: { source: 'arcsweep-terra-prime-live-smoke' },
};
const prompt = 'TERRA PRIME LIVE RUNTIME SMOKE. Reply with exactly: TERRA PRIME RUNTIME PRESENT';
const reply = await json('/api/v1/flames/atlas/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    message: prompt,
    session_id: threadId,
    context: [],
    metadata: { surface: 'house-commons-smoke', world_id: 'terra-prime', world_context: worldContext },
  }),
});
assert(String(reply.message || '').trim().length > 0, 'Atlas returned no message.');
assert(reply.provider && reply.model, 'Atlas reply did not attest provider/model.');

await json('/api/v1/house/commons', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    kind: 'steward',
    author: 'Runtime Smoke',
    status: 'sent',
    world: { id: 'terra-prime', name: 'Terra Prime' },
    thread_id: threadId,
    turn_id: `${threadId}:steward`,
    mentions: ['atlas'],
    text: prompt,
  }),
});
await json('/api/v1/house/commons', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    kind: 'voice',
    author: 'Atlas',
    voice_id: 'atlas',
    status: 'replied',
    world: { id: 'terra-prime', name: 'Terra Prime' },
    thread_id: threadId,
    turn_id: `${threadId}:atlas`,
    runtime: {
      provider: reply.provider,
      model: reply.model,
      route: 'atlas',
      profile_id: `house:atlas:${reply.provider}:${reply.model}`,
      latency_ms: null,
      runtime_world_context_id: reply.world_context?.context_id || worldContext.context_id,
    },
    text: reply.message,
  }),
});

const commonsAfter = await json('/api/v1/house/commons');
const smokeEntries = (commonsAfter.entries || []).filter((entry) => entry.thread_id === threadId);
assert(smokeEntries.length >= 2, 'Commons did not persist both Terra Prime smoke turns.');
assert((commonsAfter.entries || []).length >= (commonsBefore.entries || []).length + 2, 'Commons live read did not advance.');

console.log(JSON.stringify({
  ok: true,
  scope: 'authenticated-production-instrument',
  authenticated: true,
  auth_mode: authMode,
  base,
  public_checks: publicChecks,
  thread_id: threadId,
  atlas: { provider: reply.provider, model: reply.model, message: reply.message },
  commons_entries: smokeEntries.length,
  world_context_id: reply.world_context?.context_id || worldContext.context_id,
}, null, 2));
