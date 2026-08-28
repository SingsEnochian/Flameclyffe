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
      headers: { cookie },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Runtime Braid replay failed: ${response.status}`);
    if (!/text\/event-stream/i.test(response.headers.get('content-type') || '')) throw new Error('Runtime Braid did not return SSE.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Runtime Braid stream body is unavailable.');
    const decoder = new TextDecoder();
    let text = '';
    while (text.length < 64_000) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      const braidIndex = text.indexOf('event: braid');
      if (braidIndex >= 0) {
        const before = text.slice(0, braidIndex + 512);
        const ids = [...before.matchAll(/(?:^|\n)id:\s*(\d+)/g)];
        const cursor = ids.length ? Number(ids.at(-1)[1]) : null;
        await reader.cancel().catch(() => {});
        return { replayed: true, cursor };
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
    const threadId = `production-circulation:${Date.now()}`;
    const worldContext = {
      schema: 'arcsweep.runtime-world-context/v1',
      context_id: `production-circulation-context:${Date.now()}`,
      identity_anchor: { world_id: 'terra-prime', world_name: 'Terra Prime' },
      provenance: { source: 'vercel-production-authenticated-smoke' },
    };
    const aemethPacket = {
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
      // The GitHub Actions OIDC identity is the authority for this narrow production smoke.
      // Mint the same sealed House session cookie the normal exchange would issue, without
      // requiring a reusable Steward credential to be present in the smoke environment.
      const internalSession = issueHouseSession(env);
      const cookie = houseSessionCookie(request, internalSession.token, internalSession.ttl).split(';')[0].trim();
      if (!cookie) throw new Error('Trusted smoke session mint returned no sealed session cookie.');

      const houseFetch = (path, init = {}) => {
        const headers = new Headers(init.headers || {});
        headers.set('cookie', cookie);
        return fetch(`${base}${path}`, { ...init, headers, cache: 'no-store' });
      };

      const sessionCheck = await readJson(await houseFetch('/api/v1/house/session'), 'House session validation');
      if (sessionCheck.connected !== true || sessionCheck.mode !== 'session') throw new Error('House session cookie did not validate as a sealed session.');

      const atlasStatus = await readJson(await houseFetch('/api/v1/flames/atlas/status'), 'Atlas status');
      if (atlasStatus.runtime_reachable === false) throw new Error('Atlas runtime is unreachable.');

      const prompt = 'TERRA PRIME AUTHENTICATED PRODUCTION CIRCULATION. Reply with exactly: TERRA PRIME RUNTIME PRESENT';
      const atlasReply = await readJson(await houseFetch('/api/v1/flames/atlas/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          session_id: threadId,
          context: [],
          metadata: { surface: 'authenticated-production-smoke', world_id: 'terra-prime', world_context: worldContext },
        }),
      }), 'Atlas chat');
      if (!atlasReply.provider || !atlasReply.model || !String(atlasReply.message || '').trim()) throw new Error('Atlas reply did not attest provider, model, and visible presence.');

      const oaStatus = await readJson(await houseFetch('/api/v1/flames/oxalpha/status'), 'OA status');
      const oaPrompt = [
        'AEMETH CHAMBER · PRODUCTION SMOKE',
        'This is a synthetic route check. Do not infer Qualia or claim firsthand perception.',
        JSON.stringify(aemethPacket),
        'Reply briefly as Ox Alpha and identify this as a synthetic Aemeth chamber route check.',
      ].join('\n\n');
      const oaReply = await readJson(await houseFetch('/api/v1/flames/oxalpha/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: oaPrompt,
          session_id: `${threadId}:aemeth`,
          context: [],
          metadata: { surface: 'aemeth-production-smoke', world_id: 'terra-prime', world_context: worldContext, aemeth: aemethPacket },
        }),
      }), 'OA Aemeth chat');
      if (oaReply.flame_id && oaReply.flame_id !== 'oxalpha') throw new Error(`OA identity mismatch: ${oaReply.flame_id}`);
      if (!oaReply.provider || !oaReply.model || !String(oaReply.message || '').trim()) throw new Error('OA reply did not attest provider, model, and visible presence.');

      const commonsBefore = await readJson(await houseFetch('/api/v1/house/commons'), 'Commons pre-read');
      const beforeCount = Array.isArray(commonsBefore.entries) ? commonsBefore.entries.length : 0;

      await readJson(await houseFetch('/api/v1/house/commons', {
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
      }), 'Commons steward write');

      await readJson(await houseFetch('/api/v1/house/commons', {
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
            provider: atlasReply.provider,
            model: atlasReply.model,
            route: 'atlas',
            profile_id: `house:atlas:${atlasReply.provider}:${atlasReply.model}`,
            latency_ms: null,
            runtime_world_context_id: atlasReply.world_context?.context_id || worldContext.context_id,
          },
          text: atlasReply.message,
        }),
      }), 'Commons Atlas write');

      await readJson(await houseFetch('/api/v1/house/commons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'steward',
          author: 'Aemeth Runtime Smoke',
          status: 'sent',
          world: { id: 'terra-prime', name: 'Terra Prime' },
          thread_id: threadId,
          turn_id: `${threadId}:aemeth-packet`,
          mentions: ['oxalpha'],
          text: 'Synthetic Aemeth production chamber packet dispatched to OA.',
        }),
      }), 'Commons Aemeth packet write');

      await readJson(await houseFetch('/api/v1/house/commons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'voice',
          author: 'Ox Alpha',
          voice_id: 'oxalpha',
          status: 'replied',
          world: { id: 'terra-prime', name: 'Terra Prime' },
          thread_id: threadId,
          turn_id: `${threadId}:oxalpha`,
          runtime: {
            provider: oaReply.provider,
            model: oaReply.model,
            route: 'oxalpha',
            profile_id: `house:oxalpha:${oaReply.provider}:${oaReply.model}`,
            latency_ms: null,
            runtime_world_context_id: oaReply.world_context?.context_id || worldContext.context_id,
          },
          text: oaReply.message,
        }),
      }), 'Commons OA write');

      const commonsAfter = await readJson(await houseFetch('/api/v1/house/commons'), 'Commons persistence read');
      const smokeEntries = (commonsAfter.entries || []).filter((entry) => entry.thread_id === threadId);
      const persistedOa = smokeEntries.find((entry) => entry.voice_id === 'oxalpha' && entry.runtime?.route === 'oxalpha');
      if (smokeEntries.length < 4) throw new Error('Commons did not persist all production circulation turns.');
      if (!persistedOa) throw new Error('Commons did not persist and reload the OA Aemeth witness lane.');

      const observations = await readJson(await houseFetch('/api/v1/house/observations?limit=8'), 'Observation broker read');
      if (!Array.isArray(observations.snapshots) || !Array.isArray(observations.braid_packets)) throw new Error('Observation broker did not return canonical snapshots and braid packets.');

      const braid = await readBraidReplay(base, cookie);
      if (!braid.replayed) throw new Error('Runtime Braid replay did not produce an event.');

      return json(200, {
        ok: true,
        schema: 'hearthgate.production-circulation-smoke/v2',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        production_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        caller: { repository: oidc.repository, ref: oidc.ref, run_id: oidc.run_id, sha: oidc.sha },
        session: { connected: true, mode: sessionCheck.mode },
        model_presence: {
          atlas: { route: 'atlas', provider: atlasReply.provider, model: atlasReply.model, runtime_reachable: atlasStatus.runtime_reachable !== false },
          oxalpha: { route: 'oxalpha', provider: oaReply.provider, model: oaReply.model, runtime_reachable: oaStatus.runtime_reachable !== false },
        },
        aemeth: {
          packet_schema: aemethPacket.schema,
          instrument_profile: aemethPacket.chamber.instrumentProfile,
          active_diagram: aemethPacket.chamber.activeDiagram,
          oa_reloaded: true,
          rowan_witness_content_used: false,
          canon_commit: false,
        },
        commons: { thread_id: threadId, persisted_entries: smokeEntries.length, before_count: beforeCount, after_count: Array.isArray(commonsAfter.entries) ? commonsAfter.entries.length : null },
        observations: { snapshots: observations.snapshots.length, braid_packets: observations.braid_packets.length },
        braid_replay: braid,
        authority: {
          oidc_audience: HOUSE_SMOKE_AUDIENCE,
          session_bootstrap: 'trusted-github-oidc',
          credential_exposed: false,
          model_prose_returned: false,
          production_write_scope: 'four append-only Commons smoke entries: Terra Prime + Aemeth OA',
        },
      });
    } catch (error) {
      console.error('Authenticated production circulation smoke failed', error);
      return json(502, {
        ok: false,
        schema: 'hearthgate.production-circulation-smoke/v2',
        production_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        stage_error: error.message,
        credential_exposed: false,
      });
    }
  },
};
