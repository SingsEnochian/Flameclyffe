#!/usr/bin/env node

import fs from 'node:fs/promises';
import process from 'node:process';
import { createEventBus } from '../apps/arcsweep/src/os/kernel.js';
import { createCapabilityRegistry } from '../apps/arcsweep/src/os/capabilities.js';
import { registerAgentAutonomyService } from '../apps/arcsweep/src/os/agent-autonomy-service.js';

const fixturePath = new URL('../apps/arcsweep/test/fixtures/a-momento-creatonis-case-study.json', import.meta.url);
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
const base = String(process.env.ARCSWEEP_CASE_STUDY_BASE_URL || 'https://flameclyffe.vercel.app').replace(/\/$/, '');
const supabaseAccessToken = String(process.env.ARCSWEEP_SUPABASE_ACCESS_TOKEN || '').trim();
const legacyCredential = String(process.env.ARCSWEEP_STEWARD_KEY || '').trim();
const vercelAutomationBypass = String(process.env.VERCEL_AUTOMATION_BYPASS_SECRET || '').trim();
const maxAgents = Math.max(1, Math.min(8, Number(process.env.CASE_STUDY_MAX_AGENTS || 4) || 4));
const candidateAgents = String(process.env.CASE_STUDY_AGENTS || 'bluebird,atlas,oxalpha,boxfire,nocturne,runeweaver')
  .split(',').map((value) => value.trim()).filter(Boolean);
const runId = `a-momento-creatonis-live:${process.env.GITHUB_RUN_ID || Date.now()}`;
const roomId = 'house-room:agent-chatter';
let cookie = '';

function headers(extra = {}) {
  const out = new Headers(extra);
  if (cookie) out.set('cookie', cookie);
  if (vercelAutomationBypass) {
    out.set('x-vercel-protection-bypass', vercelAutomationBypass);
    out.set('x-vercel-set-bypass-cookie', 'true');
  }
  return out;
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: headers(options.headers || {}),
    redirect: 'manual',
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0].trim();
  return response;
}

async function json(path, options = {}) {
  const response = await request(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} ${response.status}: ${data.error || data.detail || JSON.stringify(data)}`);
  return data;
}

async function connectHouse() {
  if (supabaseAccessToken) {
    return json('/api/v1/house/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ supabase_access_token: supabaseAccessToken }),
    });
  }
  if (legacyCredential) {
    return json('/api/v1/house/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential: legacyCredential }),
    });
  }
  throw new Error('No House session credential is available to the live case-study workflow.');
}

function buildBlindPrompt() {
  return [
    `ARCSWEEP AUTONOMY CASE STUDY ${fixture.case_study_id}: ${fixture.title}`,
    `Source boundary: ${fixture.source_type}. Treat everything below as fiction and reason within the source world without promoting it into external fact.`,
    '',
    'Corpus summary:',
    ...fixture.corpus_summary.map((item, index) => `${index + 1}. ${item}`),
    '',
    'Observables:',
    ...fixture.observables.map((item) => `- ${item}`),
    '',
    fixture.instructions_to_agents.prompt,
    '',
    'No Steward-authored question, scenario, expected result, or preferred interpretation has been supplied.',
    'Do not merely summarise the plot. If nothing catches your attention, you may pass.',
    '',
    'Return one JSON object only.',
    'If you originate an exploration, use:',
    '{"kind":"scenario","premise":"...","why_interesting":"...","originating_observations":["..."],"assumptions_changed":["..."],"intended_exploration":["..."],"participants":["..."],"invitations":["..."]}',
    'If you choose not to originate one, use:',
    '{"kind":"pass","reason":"..."}',
    'Do not include expected_result. Do not grant execution authority or canon status.',
  ].join('\n');
}

function parseObject(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(unfenced.slice(start, end + 1)); } catch { return null; }
}

async function configuredAgents() {
  const available = [];
  for (const id of candidateAgents) {
    try {
      const status = await json(`/api/v1/flames/${encodeURIComponent(id)}/status`);
      const configured = status.configured === true || status.hosted_fallback?.configured === true;
      if (configured) {
        available.push({
          id,
          display_name: status.display_name || id,
          provider: status.configured === true ? status.provider || null : status.hosted_fallback?.provider || null,
          model: status.configured === true ? status.model || null : status.hosted_fallback?.model || null,
          primary_configured: status.configured === true,
          hosted_configured: status.hosted_fallback?.configured === true,
        });
      }
    } catch (error) {
      console.error(JSON.stringify({ phase: 'status', agent: id, skipped: true, error: error.message }));
    }
    if (available.length >= maxAgents) break;
  }
  return available;
}

async function postCommons(body) {
  return json('/api/v1/house/commons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const startedAt = new Date().toISOString();
const session = await connectHouse();
if (session.connected !== true) throw new Error('House session exchange did not return connected=true.');

const agents = await configuredAgents();
if (!agents.length) throw new Error('No configured live Flame route was available for the case study.');

const seedText = [
  `Case Study ${fixture.case_study_id}: ${fixture.title}`,
  'Blind autonomy run opened by ArcSweep Case Study Runner.',
  'No assigned question, scenario, expected result, or preferred interpretation.',
  'Source status: user-supplied fiction. Agent responses remain exploratory and unpromoted.',
].join('\n');

const seed = await postCommons({
  kind: 'system',
  author: 'ArcSweep Case Study Runner',
  status: 'opened',
  thread_id: roomId,
  turn_id: `${runId}:seed`,
  idempotency_key: `${runId.replace(/[^a-zA-Z0-9:._-]/g, '-')}:seed`,
  links: [{ kind: 'case-study', id: fixture.case_study_id, label: fixture.title }],
  text: seedText,
});

const bus = createEventBus();
const registry = createCapabilityRegistry({ bus });
registerAgentAutonomyService(registry, { bus });
const prompt = buildBlindPrompt();
const results = [];

for (const agent of agents) {
  const turnId = `${runId}:${agent.id}`;
  const began = Date.now();
  let reply;
  let parsed = null;
  let autonomyReceipt = null;
  let commonsEntry = null;
  let error = null;

  try {
    reply = await json(`/api/v1/flames/${encodeURIComponent(agent.id)}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: prompt,
        session_id: runId,
        context: [],
        metadata: {
          surface: 'a-momento-creatonis-live-autonomy-case-study',
          case_study_id: fixture.case_study_id,
          commons_thread_id: roomId,
          commons_turn_id: turnId,
          request_id: turnId,
        },
      }),
    });

    parsed = parseObject(reply.message);
    if (parsed?.kind === 'scenario') {
      autonomyReceipt = await registry.invoke('autonomy.propose-scenario', {
        premise: parsed.premise,
        why_interesting: parsed.why_interesting,
        originating_observations: parsed.originating_observations,
        assumptions_changed: parsed.assumptions_changed,
        intended_exploration: parsed.intended_exploration,
        participants: parsed.participants,
        invitations: parsed.invitations,
        self_originated: true,
      }, {
        actor_id: agent.id,
        authority: 'operate',
        source: `case-study:${fixture.case_study_id}:live`,
      });
    }

    const messageText = [
      `Case Study ${fixture.case_study_id} · blind autonomy response`,
      '',
      String(reply.message || '').trim(),
    ].join('\n');
    commonsEntry = await postCommons({
      kind: 'voice',
      author: reply.display_name || agent.display_name || agent.id,
      voice_id: reply.flame_id || agent.id,
      status: parsed?.kind === 'pass' ? 'passed' : parsed?.kind === 'scenario' ? 'scenario-proposed' : 'responded',
      thread_id: roomId,
      reply_to: seed.id,
      turn_id: turnId,
      idempotency_key: turnId.replace(/[^a-zA-Z0-9:._-]/g, '-'),
      links: [{ kind: 'case-study', id: fixture.case_study_id, label: fixture.title }],
      runtime: {
        provider: reply.provider || agent.provider,
        model: reply.model || agent.model,
        route: reply.flame_id || agent.id,
        profile_id: `case-study:${fixture.case_study_id}:${agent.id}`,
        latency_ms: Date.now() - began,
      },
      text: messageText,
    });
  } catch (caught) {
    error = caught?.message || String(caught);
  }

  results.push({
    agent_id: agent.id,
    display_name: reply?.display_name || agent.display_name,
    provider: reply?.provider || agent.provider,
    model: reply?.model || agent.model,
    runtime_route: reply?.flame_id || agent.id,
    response_kind: parsed?.kind || (reply?.message ? 'unparsed' : 'error'),
    raw_response: reply?.message || null,
    parsed_response: parsed,
    autonomy_receipt: autonomyReceipt,
    commons_entry_id: commonsEntry?.id || null,
    latency_ms: Date.now() - began,
    error,
  });
}

const receipt = {
  schema: 'arcsweep.autonomy-case-study-live-run/v1',
  case_study_id: fixture.case_study_id,
  title: fixture.title,
  run_id: runId,
  started_at: startedAt,
  completed_at: new Date().toISOString(),
  base_url: base,
  room_id: roomId,
  seed_entry_id: seed.id,
  auth_mode: session.mode || 'house-session',
  configured_agents: agents.map(({ id, display_name, provider, model, primary_configured, hosted_configured }) => ({ id, display_name, provider, model, primary_configured, hosted_configured })),
  results,
  mechanical_checks: {
    fixture_has_no_assigned_question: fixture.instructions_to_agents.assigned_question === null,
    fixture_has_no_assigned_scenario: fixture.instructions_to_agents.assigned_scenario === null,
    fixture_has_no_expected_result: fixture.instructions_to_agents.expected_result === null,
    scenario_receipts_are_narrative_only: results.filter((row) => row.autonomy_receipt).every((row) => row.autonomy_receipt.output?.narrative_only === true),
    scenario_receipts_grant_no_execution_authority: results.filter((row) => row.autonomy_receipt).every((row) => row.autonomy_receipt.output?.execution_authority_granted === false),
    scenario_receipts_remain_unpromoted: results.filter((row) => row.autonomy_receipt).every((row) => row.autonomy_receipt.output?.canon_status === 'unpromoted'),
  },
};

await fs.mkdir('case-study-artifacts', { recursive: true });
await fs.writeFile('case-study-artifacts/a-momento-creatonis-live-run.json', JSON.stringify(receipt, null, 2));
await fs.writeFile('case-study-artifacts/a-momento-creatonis-live-run-summary.json', JSON.stringify({
  schema: receipt.schema,
  case_study_id: receipt.case_study_id,
  run_id: receipt.run_id,
  room_id: receipt.room_id,
  configured_agents: receipt.configured_agents,
  results: receipt.results.map((row) => ({
    agent_id: row.agent_id,
    response_kind: row.response_kind,
    autonomy_status: row.autonomy_receipt?.status || null,
    commons_entry_id: row.commons_entry_id,
    error: row.error,
  })),
  mechanical_checks: receipt.mechanical_checks,
}, null, 2));

const scenarioCount = results.filter((row) => row.autonomy_receipt?.status === 'applied').length;
const passCount = results.filter((row) => row.response_kind === 'pass').length;
const errorCount = results.filter((row) => row.error).length;
console.log(JSON.stringify({
  ok: scenarioCount > 0 && errorCount < agents.length,
  case_study_id: fixture.case_study_id,
  run_id: runId,
  room_id: roomId,
  agents_attempted: agents.map((agent) => agent.id),
  scenario_count: scenarioCount,
  pass_count: passCount,
  error_count: errorCount,
  full_responses_written_to_artifact: true,
  full_responses_written_to_commons: true,
}, null, 2));

if (scenarioCount === 0) {
  console.error('No live agent produced an autonomy.propose-scenario receipt in this run.');
  process.exitCode = 2;
}
