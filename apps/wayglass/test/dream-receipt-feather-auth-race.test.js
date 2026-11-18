import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDreamReceiptJournal} from '../src/dream-receipt-journal.js';

test('Feather during pending authorisation never enters atomic storage', async () => {
  let resolveAuthorisation;
  const gate = new Promise(resolve => { resolveAuthorisation = resolve; });
  let writes = 0;
  const journal = createDreamReceiptJournal({
    dream_id: 'dream-001',
    owner_id: 'owner-001',
    authorise: async () => gate,
    store: {
      appendAtomic: async () => { writes++; throw Error('storage should not be entered'); },
      readScoped: async () => [],
    },
  });
  const pending = journal.append({event_id:'event-001',stage:'requested',at_ms:1});
  journal.feather();
  resolveAuthorisation(true);
  await assert.rejects(pending, /Feather/);
  assert.equal(writes, 0);
});

test('revoked authorisation never enters atomic storage', async () => {
  let writes = 0;
  const journal = createDreamReceiptJournal({
    dream_id: 'dream-001',
    owner_id: 'owner-001',
    authorise: async () => false,
    store: {
      appendAtomic: async () => { writes++; },
      readScoped: async () => [],
    },
  });
  await assert.rejects(journal.append({event_id:'event-002',stage:'requested',at_ms:2}), /denied or revoked/);
  assert.equal(writes, 0);
});
