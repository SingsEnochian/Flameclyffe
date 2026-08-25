import fs from 'node:fs/promises';
import { createHostedModelAuditionHandler } from '../netlify/functions/_shared/model-audition-runtime.mjs';

const receiptPath = process.env.OX_AUDITION_RECEIPT || 'ox-alpha-audition-receipt.json';
const openRouterKey = String(process.env.OPENROUTER_API_KEY || '').trim();

async function writeReceipt(receipt) {
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

if (!openRouterKey) {
  const receipt = {
    schema: 'bifrost.ox-alpha-public-audition/v1',
    ok: false,
    status: 'not-configured',
    candidate_id: 'ox-alpha',
    model: 'stealth/ox-alpha',
    data_class: 'public',
    hearthfire_retrieval: false,
    credential_present: false,
    provider_invoked: false,
    review_required: true,
  };
  await writeReceipt(receipt);
  console.log('[Ox Alpha audition] OPENROUTER_API_KEY is not configured in this Actions environment; no provider call was made.');
  process.exit(0);
}

const ephemeralHouseToken = 'github-actions-public-ox-audition';
const envValues = {
  ARCSWEEP_RUNTIME_TOKEN: ephemeralHouseToken,
  OPENROUTER_API_KEY: openRouterKey,
  OPENROUTER_HTTP_REFERER: 'https://github.com/SingsEnochian/Flameclyffe/pull/203',
  OPENROUTER_APP_TITLE: 'Flameclyffe Bifröst Ox Alpha Audition',
};
const env = {
  get(name) {
    return envValues[name] ?? process.env[name] ?? null;
  },
};

const publicProblem = `PUBLIC ENGINEERING AUDITION. Do not request or infer private data, credentials, House memory, or hidden repository context.

You are reviewing a historical bug from a public JavaScript repository. The backing-store list operation looked like this:

async list({ prefix = '' } = {}) {
  const start = String(prefix || '');
  let query = client
    .from('house_commons_entries')
    .select('key')
    .order('key', { ascending: true })
    .limit(1000);
  if (start) query = query.gte('key', start).lt('key', \`${'${start}'}\\uffff\`);
  const { data, error } = await query;
  if (error) throw error;
  return { blobs: (data || []).map(({ key }) => ({ key })) };
}

Facts:
- entry keys begin with ISO-8601 timestamps;
- the caller wants the newest available Commons entries;
- once the table exceeds 1000 rows, newly posted messages stop appearing in the returned window;
- the 1000-row cap is intentional and should remain bounded;
- prefix filtering must continue to work.

Task: diagnose the root cause, propose the smallest safe code change, and describe a regression test using at least 1205 rows that proves new messages cannot become stranded beyond the query cap. Mention any ordering/limit subtlety that matters. Do not invent unrelated architecture changes.`;

const handle = createHostedModelAuditionHandler({ env });
const request = new Request('https://ci.flameclyffe.invalid/api/v1/flames/boxfire/audition/ox-alpha', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${ephemeralHouseToken}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    message: publicProblem,
    data_class: 'public',
    context: {
      fixture: 'historical-house-commons-pagination-v1',
      repository: 'SingsEnochian/Flameclyffe',
      visibility: 'public',
    },
  }),
});

const response = await handle(request, { flame_id: 'boxfire', candidate_id: 'ox-alpha' });
const data = await response.json().catch(() => ({}));
const receipt = {
  schema: 'bifrost.ox-alpha-public-audition/v1',
  ok: response.ok,
  status: response.ok ? 'completed' : 'provider-error',
  http_status: response.status,
  candidate_id: data.candidate_id || 'ox-alpha',
  model: data.model || 'stealth/ox-alpha',
  provider: data.provider || 'openrouter',
  execution_path: data.execution_path || 'web-direct',
  data_class: data.data_class || 'public',
  hearthfire_retrieval: data.hearthfire_retrieval ?? false,
  primary_route_unchanged: data.primary_route_unchanged ?? true,
  credential_present: true,
  provider_invoked: true,
  generation_id: data.generation_id || null,
  usage: data.usage || null,
  response: data.message || null,
  error: data.error || null,
  review_required: true,
  fixture: 'historical-house-commons-pagination-v1',
};
await writeReceipt(receipt);

console.log(JSON.stringify({
  schema: receipt.schema,
  ok: receipt.ok,
  status: receipt.status,
  http_status: receipt.http_status,
  candidate_id: receipt.candidate_id,
  model: receipt.model,
  provider: receipt.provider,
  data_class: receipt.data_class,
  hearthfire_retrieval: receipt.hearthfire_retrieval,
  generation_id: receipt.generation_id,
  usage: receipt.usage,
}, null, 2));

if (!response.ok) process.exit(1);
