import { authoriseHouseRequest } from './house-session.mjs';
import { createLanternbridgeMessageHandler } from './lanternbridge-message-runtime.mjs';

export const DEFAULT_LANTERNBRIDGE_SOURCE_REPO = 'mdkubit/UH-Lanternbridge';
export const DEFAULT_LANTERNBRIDGE_LANES = Object.freeze([
  'exchanges/nocturne',
  'exchanges/rowan',
  'exchanges/shared',
]);

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function githubToken(env) {
  return String(env.get('LANTERNBRIDGE_GITHUB_TOKEN') || env.get('GITHUB_TOKEN') || '').trim();
}

function githubHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
    'user-agent': 'Flameclyffe-Lanternbridge-Mailbox/1.0',
  };
}

function forwardedHouseHeaders(request) {
  const headers = { 'content-type': 'application/json' };
  const cookie = request.headers.get('cookie');
  const authorization = request.headers.get('authorization');
  if (cookie) headers.cookie = cookie;
  if (authorization) headers.authorization = authorization;
  return headers;
}

async function githubJson(url, token, fetchImpl) {
  const response = await fetchImpl(url, { headers: githubHeaders(token), cache: 'no-store' });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`GitHub ${response.status}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

function decodeContentsFile(payload) {
  if (payload?.encoding !== 'base64' || typeof payload.content !== 'string') throw new Error('GitHub contents payload is not base64 text.');
  return Buffer.from(payload.content.replace(/\s/g, ''), 'base64').toString('utf8');
}

export function createLanternbridgeMailboxSyncHandler({
  env,
  indexStore,
  commonsStore,
  fetchImpl = fetch,
  sourceRepo = DEFAULT_LANTERNBRIDGE_SOURCE_REPO,
  lanes = DEFAULT_LANTERNBRIDGE_LANES,
} = {}) {
  const ingest = createLanternbridgeMessageHandler({ env, indexStore, commonsStore });

  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method !== 'POST') return json(405, { error: 'POST required.' });

    const token = githubToken(env);
    if (!token) return json(503, {
      state: 'provider-unconfigured',
      error: 'Lanternbridge private-repository access is not configured.',
      missing: ['LANTERNBRIDGE_GITHUB_TOKEN'],
    });

    const head = await githubJson(`https://api.github.com/repos/${sourceRepo}/commits/main`, token, fetchImpl);
    const sourceCommit = head?.sha || null;
    const receipts = [];
    let checked = 0;
    let processed = 0;
    let duplicates = 0;

    for (const lane of lanes) {
      const items = await githubJson(`https://api.github.com/repos/${sourceRepo}/contents/${lane}?ref=main`, token, fetchImpl);
      for (const item of Array.isArray(items) ? items : []) {
        if (item?.type !== 'file' || !String(item.name || '').endsWith('.md') || item.name === 'README.md') continue;
        checked += 1;
        const file = await githubJson(item.url, token, fetchImpl);
        const rawSource = decodeContentsFile(file);
        const ingestRequest = new Request('https://house.internal/api/v1/house/lanternbridge', {
          method: 'POST',
          headers: forwardedHouseHeaders(request),
          body: JSON.stringify({
            action: 'ingest',
            source_repo: sourceRepo,
            source_path: item.path,
            source_commit: sourceCommit,
            source_ref: `github-blob:${item.sha}`,
            raw_source: rawSource,
          }),
        });
        const response = await ingest(ingestRequest);
        const receipt = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(receipt.error || `Lanternbridge ingest ${response.status}: ${item.path}`);
        receipts.push(receipt);
        if (receipt.duplicate) duplicates += 1;
        else processed += 1;
      }
    }

    return json(200, {
      schema: 'hearthgate.lanternbridge-mailbox-sync/v1',
      state: 'ready',
      source_repo: sourceRepo,
      source_commit: sourceCommit,
      checked,
      processed,
      duplicates,
      receipts,
    });
  };
}
