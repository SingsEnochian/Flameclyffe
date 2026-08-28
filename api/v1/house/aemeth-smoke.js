import { HOUSE_SMOKE_AUDIENCE, verifyGitHubActionsOidc } from '../../_shared/github-actions-oidc.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';
import { houseSessionCookie, issueHouseSession } from '../../../netlify/functions/_shared/house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function readJson(response, label) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${label} failed: ${response.status} ${data.error || JSON.stringify(data)}`);
  return data;
}

async function readBraidReplay(base, cookie) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${base}/api/v1/house/braid/stream?cursor=0`, {
      headers: { cookie }, cache: 'no-store', signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Runtime Braid replay failed: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Runtime Braid stream body is unavailable.');
    const decoder = new TextDecoder();
    let text = '';
    while (text.length < 64_000) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.includes('event: braid')) {
        const ids = [...text.matchAll(/(?:^|\n)id:\s*(\d+)/g)];
        await reader.cancel().catch(() => {});
        return { replayed: true, cursor: ids.length ? Number(ids.at(-1)[1]) : null };
      }
      if (text.includes('event: error')) throw new Error('Runtime Braid emitted an error event before replay.');
    }
    throw new Error('Runtime Braid returned no replayable event.');
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

export const config = { maxDuration: 60 };

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json(405, { error: 'POST required.' });

    let oidc;
    try {
      oidc = await verifyGitHubActionsOidc(bearer(request));
    } catch (error) {
      return json(401, { error: 'Trusted production smoke identity required.', detail: error.message });
    }

    const base = new URL(request.url).origin;
    const startedAt = new Date().toISOString();
    const threadId = `aemeth-production-smoke:${Date.now()}`;
    const chamberPacket = {
      schema: 'arcsweep.aemeth-participant-packet/v1',
      participant: { id: 'oxalpha', route: 'oxalpha', displayName: 'Ox Alpha' },
      chamber: {
        instrumentProfile: 'Aemeth Lens v1 · digital chamber',
        phase: 'Observation',
        observerRole: 'synthetic production smoke',
        orientation: 'eye → sphere → embedded sigillum → depth',
        gazeMode: 'soft focus through',
        activeDiagram: 'Sigillum Dei Aemeth',
        activeCall: '',
        chamberConfiguration: 'production route verification only',
      },
      firsthandWitness: {
        authority: 'synthetic smoke fixture; no Rowan-authored witness content',
        raw: '',
        timestampNotes: '',
        qualiaInferenceAllowed: false,
      },
      authority: {
        modelMayInterpret: true,
        modelMayRewriteFirsthandWitness: false,
        modelMayInferQualia: false,
        modelMayCommitCanon: false,
      },
    };

    try {
      const internalSession = issueHouseSession(env);
      const cookie = houseSessionCookie(request, internalSession.token, internalSession.ttl).split(';')[0].trim();
      if (!cookie) throw new Error('Trusted smoke session mint returned no sealed session cookie.');

      const houseFetch = (path, init = {}) => {
        const headers = new Headers(init.headers || {});
        headers.set('cookie', cookie);
        return fetch(`${base}${path}`, { ...init, headers, cache: 'no-store' });
      };

      const sessionCheck = await readJson(await houseFetch('/api/v1/house/session'), 'House session validation');
      if (sessionCheck.connected !== true || sessionCheck.mode !== 'session') throw new Error('House session cookie did not validate.');

      const oaStatus = await readJson(await houseFetch('/api/v1/flames/oxalpha/status'), 'OA status');
      const prompt = [
        'AEMETH CHAMBER · PRODUCTION SMOKE',
        'This is a synthetic route check. Do not infer Qualia or claim firsthand perception.',
        JSON.stringify(chamberPacket),
        'Reply briefly as Ox Alpha and identify this as a synthetic Aemeth chamber route check.',
      ].join('\n\n');
      const oaReply = await readJson(await houseFetch('/api/v1/flames/oxalpha/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: prompt, session_id: threadId, context: [], metadata: { surface: 'aemeth-production-smoke', aemeth: chamberPacket } }),
      }), 'OA Aemeth chat');
      if (oaReply.flame_id && oaReply.flame_id !== 'oxalpha') throw new Error(`OA identity mismatch: ${oaReply.flame_id}`);
      if (!oaReply.provider || !oaReply.model || !String(oaReply.message || '').trim()) throw new Error('OA reply did not attest provider, model, and visible presence.');

      await readJson(await houseFetch('/api/v1/house/commons', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'steward', author: 'Aemeth Runtime Smoke', status: 'sent',
          world: { id: 'terra-prime', name: 'Terra Prime' }, thread_id: threadId, turn_id: `${threadId}:packet`,
          mentions: ['oxalpha'], text: 'Synthetic Aemeth production chamber packet dispatched to OA.',
        }),
      }), 'Aemeth Commons packet write');

      await readJson(await houseFetch('/api/v1/house/commons', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'voice', author: 'Ox Alpha', voice_id: 'oxalpha', status: 'replied',
          world: { id: 'terra-prime', name: 'Terra Prime' }, thread_id: threadId, turn_id: `${threadId}:oxalpha`,
          runtime: { provider: oaReply.provider, model: oaReply.model, route: 'oxalpha', profile_id: `house:oxalpha:${oaReply.provider}:${oaReply.model}`, latency_ms: null },
          text: oaReply.message,
        }),
      }), 'Aemeth Commons OA write');

      const commonsAfter = await readJson(await houseFetch('/api/v1/house/commons'), 'Aemeth Commons persistence read');
      const smokeEntries = (commonsAfter.entries || []).filter((entry) => entry.thread_id === threadId);
      const persistedOa = smokeEntries.find((entry) => entry.voice_id === 'oxalpha' && entry.runtime?.route === 'oxalpha');
      if (smokeEntries.length < 2 || !persistedOa) throw new Error('Aemeth Commons did not persist and reload the OA witness lane.');

      const braid = await readBraidReplay(base, cookie);
      if (!braid.replayed) throw new Error('Runtime Braid replay did not produce an event.');

      return json(200, {
        ok: true,
        schema: 'hearthgate.aemeth-production-smoke/v1',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        production_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        caller: { repository: oidc.repository, ref: oidc.ref, run_id: oidc.run_id, sha: oidc.sha },
        session: { connected: true, mode: sessionCheck.mode },
        chamber: { schema: chamberPacket.schema, instrument_profile: chamberPacket.chamber.instrumentProfile, active_diagram: chamberPacket.chamber.activeDiagram },
        oa: { route: 'oxalpha', provider: oaReply.provider, model: oaReply.model, runtime_reachable: oaStatus.runtime_reachable !== false },
        persistence: { thread_id: threadId, persisted_entries: smokeEntries.length, oa_reloaded: true },
        braid_replay: braid,
        authority: {
          oidc_audience: HOUSE_SMOKE_AUDIENCE,
          synthetic_fixture: true,
          rowan_witness_content_used: false,
          model_prose_returned: false,
          credential_exposed: false,
          canon_commit: false,
          production_write_scope: 'two append-only Aemeth Commons smoke entries',
        },
      });
    } catch (error) {
      console.error('Aemeth production smoke failed', error);
      return json(502, {
        ok: false,
        schema: 'hearthgate.aemeth-production-smoke/v1',
        production_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        stage_error: error.message,
        credential_exposed: false,
      });
    }
  },
};
