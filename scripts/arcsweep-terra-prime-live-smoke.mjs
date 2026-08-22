#!/usr/bin/env node

const base = String(process.env.ARCSWEEP_SMOKE_BASE_URL || 'https://flameclyffe-starwell.netlify.app').replace(/\/$/, '');
const credential = String(process.env.ARCSWEEP_STEWARD_KEY || '').trim();
if (!credential) throw new Error('ARCSWEEP_STEWARD_KEY is required for the hosted Terra Prime smoke.');

let cookie = '';
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {}); if (cookie) headers.set('cookie', cookie);
  const response = await fetch(`${base}${path}`, { ...options, headers, redirect: 'manual' });
  const setCookie = response.headers.get('set-cookie'); if (setCookie) cookie = setCookie.split(';')[0];
  return response;
}
async function json(path, options = {}) { const response = await request(path, options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(`${path} ${response.status}: ${data.error || JSON.stringify(data)}`); return data; }
function assert(condition, message) { if (!condition) throw new Error(message); }

const page = await request('/apps/arcsweep/'); assert(page.ok, `Arcsweep page failed: ${page.status}`); const html = await page.text();
assert(html.includes('house-commons-chat-v3.js'), 'House Commons chat is not mounted.');
assert(html.includes('runtime-integration-bootstrap.js'), 'Runtime Integration bootstrap is not mounted.');

const session = await json('/api/v1/house/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ credential }) });
assert(session.connected === true, 'House Runtime session did not connect.');

const atlas = await json('/api/v1/flames/atlas/status'); assert(atlas.runtime_reachable !== false, 'Atlas runtime is unreachable.');
const commonsBefore = await json('/api/v1/house/commons');
const threadId = `terra-prime-smoke:${Date.now()}`;
const worldContext = {
  schema: 'arcsweep.runtime-world-context/v1',
  context_id: `terra-prime-smoke-context:${Date.now()}`,
  identity_anchor: { world_id: 'terra-prime', world_name: 'Terra Prime' },
  provenance: { source: 'arcsweep-terra-prime-live-smoke' },
};
const prompt = 'TERRA PRIME LIVE RUNTIME SMOKE. Reply with exactly: TERRA PRIME RUNTIME PRESENT';
const reply = await json('/api/v1/flames/atlas/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: prompt, session_id: threadId, context: [], metadata: { surface: 'house-commons-smoke', world_id: 'terra-prime', world_context: worldContext } }) });
assert(String(reply.message || '').trim().length > 0, 'Atlas returned no message.');
assert(reply.provider && reply.model, 'Atlas reply did not attest provider/model.');

await json('/api/v1/house/commons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'steward', author: 'Runtime Smoke', status: 'sent', world: { id: 'terra-prime', name: 'Terra Prime' }, thread_id: threadId, turn_id: `${threadId}:steward`, mentions: ['atlas'], text: prompt }) });
await json('/api/v1/house/commons', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'voice', author: 'Atlas', voice_id: 'atlas', status: 'replied', world: { id: 'terra-prime', name: 'Terra Prime' }, thread_id: threadId, turn_id: `${threadId}:atlas`, runtime: { provider: reply.provider, model: reply.model, route: 'atlas', profile_id: `house:atlas:${reply.provider}:${reply.model}`, latency_ms: null, runtime_world_context_id: reply.world_context?.context_id || worldContext.context_id }, text: reply.message }) });

const commonsAfter = await json('/api/v1/house/commons'); const smokeEntries = (commonsAfter.entries || []).filter((entry) => entry.thread_id === threadId);
assert(smokeEntries.length >= 2, 'Commons did not persist both Terra Prime smoke turns.');
assert((commonsAfter.entries || []).length >= (commonsBefore.entries || []).length + 2, 'Commons live read did not advance.');

console.log(JSON.stringify({ ok: true, base, thread_id: threadId, atlas: { provider: reply.provider, model: reply.model, message: reply.message }, commons_entries: smokeEntries.length, world_context_id: reply.world_context?.context_id || worldContext.context_id }, null, 2));
