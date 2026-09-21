import { HOUSE_SMOKE_AUDIENCE, verifyGitHubActionsOidc } from '../../_shared/github-actions-oidc.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';
import { houseSessionCookie, issueHouseSession } from '../../../netlify/functions/_shared/house-session.mjs';

const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') return json(405, { error: 'POST required.' });

    let oidc;
    try {
      oidc = await verifyGitHubActionsOidc(bearer(request));
    } catch (error) {
      return json(401, { error: 'Trusted production smoke identity required.', detail: error.message });
    }

    const session = issueHouseSession(env);
    const sessionCookieHeader = houseSessionCookie(request, session.token, session.ttl);
    return json(200, {
      ok: true,
      schema: 'hearthgate.production-smoke-session/v1',
      production_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      caller: {
        repository: oidc.repository,
        ref: oidc.ref,
        run_id: oidc.run_id,
        sha: oidc.sha,
      },
      session: {
        issued: true,
        mode: 'session',
      },
      authority: {
        oidc_audience: HOUSE_SMOKE_AUDIENCE,
        session_bootstrap: 'trusted-github-oidc',
        credential_exposed: false,
        session_cookie_returned_only_as_http_header: true,
        model_dependency: 'none',
        production_write_scope: 'none',
      },
    }, { 'set-cookie': sessionCookieHeader });
  },
};
