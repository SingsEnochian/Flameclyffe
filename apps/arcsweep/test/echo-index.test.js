import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEchoIndex, resolveEchoIndex, ECHO_INDEX_SCHEMA } from '../src/echo-index.js';

const state = {
  worlds:[{ id:'world-terra', name:'Terra Prime', description:'Waking world' }],
  scripts:[{ id:'script-1', name:'Moon Gate', worldId:'world-terra', status:'Draft I', content:'Silver threshold' }],
  records:{ notes:[{ id:'record-1', title:'Bluebird note', worldId:'world-terra', body:'Resonance archive' }] },
  continuity:[{ id:'continuity-1', label:'North Star', worldId:'world-terra' }],
  observatory:{ deep_time_records:[{ id:'deep-1', label:'First crossing', world_id:'world-terra' }] },
};

test('Echo Index resolves existing stores without creating a parallel registry', () => {
  const rows = buildEchoIndex(state);
  assert.ok(rows.every((row) => row.schema === ECHO_INDEX_SCHEMA));
  assert.ok(rows.some((row) => row.kind === 'world' && row.store === 'world-registry'));
  assert.ok(rows.some((row) => row.kind === 'record' && row.store === 'records-room'));
  assert.ok(rows.some((row) => row.kind === 'deep-time' && row.store === 'observer/deep-time'));
});

test('Echo Index keeps source store, identity, authority and world lineage visible', () => {
  const [row] = resolveEchoIndex(state,'Bluebird');
  assert.equal(row.id,'record-1');
  assert.equal(row.store,'records-room');
  assert.equal(row.world_id,'world-terra');
  assert.equal(row.authority_class,'record');
});

test('external adapters can contribute source-library or runtime receipts without equivalence or promotion', () => {
  const rows = resolveEchoIndex(state,'Wheel',{
    externalEntries:[{ kind:'source-segment', store:'source-library', id:'seg-42', label:'Wheel of Time segment', authority_class:'reference-only', provenance:{ revision:'r7' } }],
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].store,'source-library');
  assert.equal(rows[0].authority_class,'reference-only');
  assert.deepEqual(rows[0].provenance,{ revision:'r7' });
});
