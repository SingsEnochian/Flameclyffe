import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recordLateEncounter,lateEncounterObservations,subscribeLateEncounter,LATE_ENCOUNTER_SCHEMA} from '../src/mythience-late-observations.js';

test('late receipts are minimal, non-authoritative and never contain private payloads',()=>{
  const received=[],off=subscribeLateEncounter(entry=>received.push(entry));
  const entry=recordLateEncounter({
    route:'mythience-crossing',event_id:'encounter:42',status:'candidate-returned',
    input_hash:'a'.repeat(64),phase:'response-parsed-after-cancellation',
    prompt:'PRIVATE',token:'SECRET',result:{text:'DO NOT STORE'},
  });
  assert.equal(entry.schema,LATE_ENCOUNTER_SCHEMA);
  assert.equal(entry.disposition,'observed-not-adopted');
  assert.equal(entry.persistence,'in-memory-session-only');
  assert.equal(entry.upstream_execution,'unknown');
  assert.equal(entry.input_hash,'a'.repeat(64));
  assert.equal(JSON.stringify(entry).includes('PRIVATE'),false);
  assert.equal(JSON.stringify(entry).includes('SECRET'),false);
  assert.equal(JSON.stringify(entry).includes('DO NOT STORE'),false);
  assert.deepEqual(received,[entry]);
  off();
});
test('malformed hashes are discarded and observation history is bounded',()=>{
  const start=lateEncounterObservations().length;
  for(let i=0;i<70;i++)recordLateEncounter({route:'hybrid',event_id:String(i),input_hash:'not-a-hash'});
  const snapshot=lateEncounterObservations();
  assert.equal(snapshot.length,64);
  assert.equal(snapshot.at(-1).event_id,'69');
  assert.equal(snapshot.at(-1).input_hash,null);
  assert.ok(snapshot.length<=start+70);
  assert.ok(Object.isFrozen(snapshot));
});
