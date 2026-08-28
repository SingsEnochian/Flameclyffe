import { createHash, timingSafeEqual } from 'node:crypto';
import { authoriseHouseRequest } from './house-session.mjs';
import {
  authoriseGitHubActionsOidcRequest,
  GITHUB_ACTIONS_OIDC_DEFAULTS,
} from './github-actions-oidc.mjs';
import { parseLanternbridgeRecord } from '../../../apps/arcsweep/src/lanternbridge-receiver.js';
import {
  buildLanternbridgeIndexEntry,
  classifyLanternbridgeDelivery,
  projectLanternbridgeCommonsEntry,
} from '../../../apps/arcsweep/src/lanternbridge-message-index.js';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function ingestKeyAuthorised(request, env) {
  const expected = String(env.get('LANTERNBRIDGE_INGEST_KEY') || '').trim();
  const supplied = String(request.headers.get('x-lanternbridge-ingest-key') || '').trim();
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function deterministicCommonsId(cursorKey) {
  return `lb-${createHash('sha256').update(String(cursorKey)).digest('hex').slice(0, 32)}`;
}

function oidcOptions(env, fetchImpl) {
  return {
    fetchImpl,
    audience: String(env.get('LANTERNBRIDGE_OIDC_AUDIENCE') || GITHUB_ACTIONS_OIDC_DEFAULTS.audience),
    repository: String(env.get('LANTERNBRIDGE_OIDC_REPOSITORY') || GITHUB_ACTIONS_OIDC_DEFAULTS.repository),
    ref: String(env.get('LANTERNBRIDGE_OIDC_REF') || GITHUB_ACTIONS_OIDC_DEFAULTS.ref),
    workflow: String(env.get('LANTERNBRIDGE_OIDC_WORKFLOW') || GITHUB_ACTIONS_OIDC_DEFAULTS.workflow),
  };
}

function oidcSourceProblem(body, claims) {
  if (!claims) return null;
  if (body.source_repo && String(body.source_repo) !== String(claims.repository)) return 'source_repo does not match the attested GitHub repository.';
  if (body.source_commit && claims.sha && String(body.source_commit) !== String(claims.sha)) return 'source_commit does not match the attested GitHub commit.';
  const path = String(body.source_path || '');
  if (!/^exchanges\/(nocturne|rowan|shared)\/.+\.md$/i.test(path)) return 'source_path is outside the Lanternbridge exchange lanes.';
  return null;
}

export function createLanternbridgeMessageHandler({
  env,
  indexStore,
  commonsStore,
  oidcAuthoriser = authoriseGitHubActionsOidcRequest,
  oidcFetchImpl = fetch,
}) {
  return async function handle(request) {
    const houseAuthorised = authoriseHouseRequest(request, env);
    const ingestAuthorised = ingestKeyAuthorised(request, env);
    let oidcAuthority = { authorised: false, reason: 'not_attempted', claims: null };

    if (request.method === 'POST' && !houseAuthorised && !ingestAuthorised) {
      oidcAuthority = await oidcAuthoriser(request, oidcOptions(env, oidcFetchImpl));
    }

    if (!houseAuthorised && !ingestAuthorised && !oidcAuthority.authorised) {
      return json(401, {
        error: 'Valid House Runtime session, Lanternbridge ingest key, or attested GitHub Actions OIDC token required.',
        oidc_reason: oidcAuthority.reason,
      });
    }

    if (request.method === 'GET') {
      if (!houseAuthorised) return json(403, { error: 'House Runtime session required for Lanternbridge index reads.' });
      const url = new URL(request.url);
      const entries = await indexStore.list({ status: url.searchParams.get('status'), limit: url.searchParams.get('limit') });
      return json(200, { schema: 'hearthgate.lanternbridge-message-index/v1', entries });
    }

    if (request.method !== 'POST') return json(405, { error: 'GET or POST required.' });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    if (body.action && body.action !== 'ingest') return json(400, { error: 'Only action=ingest is supported.' });

    const sourceProblem = oidcSourceProblem(body, oidcAuthority.claims);
    if (sourceProblem) return json(422, { error: sourceProblem });

    const rawSource = String(body.raw_source || '');
    if (!rawSource.trim()) return json(400, { error: 'raw_source is required.' });
    if (rawSource.length > 256000) return json(413, { error: 'Lanternbridge source exceeds 256,000 characters.' });

    const record = parseLanternbridgeRecord(rawSource);
    if (record.recognition !== 'VALID') {
      return json(422, {
        error: 'Lanternbridge record is not VALID.',
        recognition: record.recognition,
        validation_errors: record.validationErrors,
      });
    }

    const sourceRepo = oidcAuthority.claims?.repository || body.source_repo;
    const sourceCommit = oidcAuthority.claims?.sha || body.source_commit;
    const respondsTo = record.metadata?.relations?.responds_to || null;
    const parent = respondsTo ? await indexStore.getByBridgeId(respondsTo) : null;
    let indexEntry;
    try {
      indexEntry = buildLanternbridgeIndexEntry(record, {
        sourceRef: body.source_ref,
        sourceSystem: body.source_system,
        sourceRepo,
        sourcePath: body.source_path,
        sourceCommit,
        parent,
      });
    } catch (error) {
      return json(422, { error: error?.message || String(error) });
    }

    const authority = houseAuthorised
      ? 'house_session'
      : ingestAuthorised
        ? 'ingest_key'
        : 'github_actions_oidc';

    const existing = await indexStore.getByCursor(indexEntry.cursor_key);
    const existingState = classifyLanternbridgeDelivery(existing);
    if (existing && existingState !== 'new') {
      return json(200, {
        schema: 'hearthgate.lanternbridge-ingest-receipt/v1',
        delivery: existingState,
        duplicate: true,
        resumed: false,
        authority,
        cursor_key: existing.cursor_key,
        bridge_id: existing.bridge_id,
        commons_entry_id: existing.commons_entry_id,
        thread_id: existing.thread_id,
      });
    }

    const resumed = Boolean(existing && existingState === 'new');
    const commonsEntryId = existing?.commons_entry_id || deterministicCommonsId(indexEntry.cursor_key);
    const durable = existing || await indexStore.insertNew({ ...indexEntry, commons_entry_id: commonsEntryId });
    const currentParent = respondsTo ? await indexStore.getByBridgeId(respondsTo) : parent;
    const commonsEntry = projectLanternbridgeCommonsEntry({ ...indexEntry, commons_entry_id: commonsEntryId }, {
      id: commonsEntryId,
      createdAt: record.metadata.created_at,
      parent: currentParent,
    });

    await commonsStore.setJSON(`entries/${commonsEntry.created_at}-${commonsEntry.id}`, commonsEntry);
    const processed = await indexStore.markProcessed(durable.cursor_key, {
      commonsEntryId: commonsEntry.id,
      threadId: commonsEntry.thread_id,
    });

    if (indexEntry.supersedes) await indexStore.markBridgeStatus(indexEntry.supersedes, 'superseded');
    if (indexEntry.responds_to && String(indexEntry.origin || '').toLowerCase() === 'rowan') {
      await indexStore.markBridgeStatus(indexEntry.responds_to, 'reply_emitted');
    }

    return json(resumed ? 200 : 201, {
      schema: 'hearthgate.lanternbridge-ingest-receipt/v1',
      delivery: 'processed',
      duplicate: false,
      resumed,
      authority,
      cursor_key: processed.cursor_key,
      bridge_id: processed.bridge_id,
      commons_entry_id: processed.commons_entry_id,
      thread_id: processed.thread_id,
      reply_to: commonsEntry.reply_to,
    });
  };
}
