import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultKelyranSchool } from '../src/kelyran-school.js';
import { mergeKelyranSchools, syncKelyranSchool } from '../src/kelyran-sync.js';

const NOW = '2026-08-18T04:00:00.000Z';

test('merge retains independent local and remote receipts and reports', () => {
  const local = createDefaultKelyranSchool(NOW);
  const remote = createDefaultKelyranSchool(NOW);
  local.learner.receipts.push({ schema: 'local', createdAt: '2026-08-18T04:01:00.000Z' });
  remote.learner.receipts.push({ schema: 'remote', createdAt: '2026-08-18T04:02:00.000Z' });
  local.reporting.reports.push({ id: 'local-report', modelId: 'altair', createdAt: NOW });
  remote.reporting.reports.push({ id: 'remote-report', modelId: 'atlas', createdAt: NOW });
  const merged = mergeKelyranSchools(local, remote, '2026-08-18T04:03:00.000Z');
  assert.deepEqual(new Set(merged.learner.receipts.map((item) => item.schema)), new Set(['local', 'remote']));
  assert.deepEqual(new Set(merged.reporting.reports.map((item) => item.id)), new Set(['local-report', 'remote-report']));
});

test('merge refuses incompatible canon revisions', () => {
  const local = createDefaultKelyranSchool(NOW);
  const remote = createDefaultKelyranSchool(NOW);
  remote.canonRevision = 'kelyran-canon/other';
  assert.throws(() => mergeKelyranSchools(local, remote, NOW), /canon revisions diverged/i);
});

test('merge cannot admit an approved lexeme without its source receipt', () => {
  const local = createDefaultKelyranSchool(NOW);
  const remote = createDefaultKelyranSchool(NOW);
  remote.lexicon.push({ id: 'unsafe', lemma: 'invented', gloss: 'no', status: 'approved', updatedAt: NOW });
  assert.equal(mergeKelyranSchools(local, remote, NOW).lexicon.some((item) => item.id === 'unsafe'), false);
});

test('sync requires a signed-in user and upserts a merged snapshot', async () => {
  const local = createDefaultKelyranSchool(NOW);
  const writes = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'learner-one' } }, error: null }) },
    from() {
      return {
        select() { return this; }, eq() { return this; },
        maybeSingle: async () => ({ data: null, error: null }),
        upsert(row) { writes.push(row); return this; },
        single: async () => ({ data: { school: writes[0].school, updated_at: NOW }, error: null }),
      };
    },
  };
  const result = await syncKelyranSchool(local, supabase, NOW);
  assert.equal(result.state, 'created');
  assert.equal(writes[0].user_id, 'learner-one');
});
