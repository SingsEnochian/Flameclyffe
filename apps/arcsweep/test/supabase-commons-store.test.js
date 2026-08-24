import assert from 'node:assert/strict';
import test from 'node:test';

import { createSupabaseCommonsLedgerStore } from '../../../api/_shared/supabase-commons-store.mjs';

function fakeLedgerClient(keys) {
  return {
    from(table) {
      assert.equal(table, 'house_commons_entries');
      const state = { ascending: true, limit: Infinity, lower: null, upper: null };
      const query = {
        select(columns) {
          assert.equal(columns, 'key');
          return query;
        },
        order(field, { ascending }) {
          assert.equal(field, 'key');
          state.ascending = ascending;
          return query;
        },
        limit(value) {
          state.limit = value;
          return query;
        },
        gte(field, value) {
          assert.equal(field, 'key');
          state.lower = value;
          return query;
        },
        lt(field, value) {
          assert.equal(field, 'key');
          state.upper = value;
          return query;
        },
        then(resolve, reject) {
          let selected = [...keys];
          if (state.lower != null) selected = selected.filter((key) => key >= state.lower);
          if (state.upper != null) selected = selected.filter((key) => key < state.upper);
          selected.sort((left, right) => state.ascending ? left.localeCompare(right) : right.localeCompare(left));
          selected = selected.slice(0, state.limit);
          return Promise.resolve({ data: selected.map((key) => ({ key })), error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test('Supabase Commons ledger keeps newest 1000 keys when history is larger than the query cap', async () => {
  const keys = Array.from({ length: 1205 }, (_, index) => `entries/${String(index).padStart(4, '0')}`);
  const store = createSupabaseCommonsLedgerStore({ get: () => null }, { client: fakeLedgerClient(keys) });

  const { blobs } = await store.list({ prefix: 'entries/' });
  const visible = blobs.map(({ key }) => key);

  assert.equal(visible.length, 1000);
  assert.equal(visible[0], 'entries/1204');
  assert.equal(visible.at(-1), 'entries/0205');
  assert.equal(visible.includes('entries/0204'), false);
  assert.equal(visible.includes('entries/1204'), true);
});
