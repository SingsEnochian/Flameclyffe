import { HOUSE_SMOKE_AUDIENCE, verifyGitHubActionsOidc } from '../../_shared/github-actions-oidc.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';
import { houseSessionCookie, issueHouseSession } from '../../../netlify/functions/_shared/house-session.mjs';
import { buildProductionSmokeWorldContext } from '../../../netlify/functions/_shared/production-smoke-world-context.mjs';

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
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

export const config = { maxDuration: 60 };

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json(405, { error: 'POST required.' });

    let oidc;
    try {
      oidc = await verifyGitHubActionsOidc(bearer(request));
    } catch (error) {
      return json(401, { error: 'Trusted runtime-heartbeat identity required.', detail: error.message });
    }

    const startedAt = new Date().toISOString();
    const base = new URL(request.url).origin;
    const threadId = `runtime-heartbeat:${Date.now()}`;
    const turnId = `${threadId}:atlas`;

    try {
      const internalSession = issueHouseSession(env);
      const sessionCookieHeader = houseSessionCookie(request, internalSession.token, internalSession.ttl);
      const cookie = sessionCookieHeader.split(';')[0].trim();
      if (!cookie) throw new Error('Trusted heartbeat session mint returned no sealed session cookie.');

      const houseFetch = (path, init = {}) => {
        const headers = new Headers(init.headers || {});
        headers.set('cookie', cookie);
        return fetch(`${base}${path}`, { ...init, headers, cache: 'no-store' });
      };

      const session = await readJson(await houseFetch('/api/v1/house/session'), 'House session validation');
      if (session.connected !== true || session.mode !== 'session') {
        throw new Error('House session cookie did not validate as a sealed session.');
      }

      const worldContext = await buildProductionSmokeWorldContext(startedAt);
      const prompt = 'ARCSWEEP RUNTIME HEARTBEAT. Reply with exactly: ARCSWEEP HEARTBEAT PRESENT';
      const reply = await readJson(await houseFetch('/api/v1/flames/atlas/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          session_id: threadId,
          context: [],
          metadata: {
            surface: 'runtime-heartbeat-smoke',
            world_id: 'terra-prime',
            world_context: worldContext,
            commons_thread_id: threadId,
            commons_turn_id: turnId,
            request_id: turnId,
          },
        }),
      }), 'Atlas runtime heartbeat');

      if (!reply.provider || !reply.model || !String(reply.message || '').trim()) {
        throw new Error('Atlas heartbeat did not attest provider, model, and non-empty model speech.');
      }

      const receipt = reply.runtime_braid || null;
      if (receipt?.persisted !== true || receipt?.readback_verified !== true) {
        throw new Error(`Model reply did not produce a verified durable runtime receipt: ${receipt?.reason || 'missing runtime_braid proof'}`);
      }
      if (receipt.thread_id !== threadId || receipt.turn_id !== turnId || receipt.voice_id !== 'atlas') {
        throw new Error('Runtime receipt identity did not match the heartbeat turn.');
      }
      if (receipt.provider !== reply.provider || receipt.model !== reply.model) {
        throw new Error('Runtime receipt provider/model did not match the server-observed reply.');
      }

      return json(200, {
        ok: true,
        schema: 'hearthgate.runtime-heartbeat-proof/v1',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        production_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        caller: { repository: oidc.repository, ref: oidc.ref, run_id: oidc.run_id, sha: oidc.sha },
        runtime_receipt: {
          persisted: true,
          readback_verified: true,
          event_id: receipt.event_id,
          event_sequence: receipt.event_sequence,
          packet_fingerprint: receipt.packet_fingerprint,
          world_id: receipt.world_id,
          thread_id: receipt.thread_id,
          turn_id: receipt.turn_id,
          voice_id: receipt.voice_id,
          provider: receipt.provider,
          model: receipt.model,
          route: receipt.route,
        },
        authority: {
          oidc_audience: HOUSE_SMOKE_AUDIENCE,
          session_bootstrap: 'trusted-github-oidc',
          credential_exposed: false,
          model_prose_returned: false,
          production_write_scope: 'one genuine model-reply-receipted event, idempotent by House turn and Flame',
        },
      }, { 'set-cookie': sessionCookieHeader });
    } catch (error) {
      console.error('Runtime heartbeat proof failed', error);
      return json(502, {
        ok: false,
        schema: 'hearthgate.runtime-heartbeat-proof/v1',
        production_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        stage_error: error.message,
        credential_exposed: false,
      });
    }
  },
};
