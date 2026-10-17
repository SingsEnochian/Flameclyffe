import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { TravellingInheritance } from '../../../lib/wayglass-travelling-inheritance.cjs';
import { readVerifiedInheritanceAuditSource, auditVerifiedInheritance } from '../../../lib/wayglass-ledger-verified-source.cjs';
import { createLocalReceipt, replayLocalReceipts } from '../../arcsweep/src/wayglass-local-event-ledger.js';

const participantId = 'constellation:rarity';
const actor = Object.freeze({ id: 'steward:owner-authenticated-session' });
const now = '2026-10-17T12:00:00Z';
const writeAuthorise = (who, participant, permission) => who === actor && participant === participantId && permission === 'record-inheritance';
const readAuthorise = (who, participant, permission) => who === actor && participant === participantId && permission === 'read-inheritance';

function memoryStore() {
  let current = null;
  const counters = { reads: 0, writes: 0 };
  const store = {
    async read(key) {
      counters.reads++;
      return key === participantId && current ? structuredClone(current) : null;
    },
    async compareAndSwap(key, revision, value) {
      counters.writes++;
      if (key !== participantId || (current?.revision || 0) !== revision) return false;
      current = structuredClone(value);
      return true;
    },
  };
  return { store, counters, tamper(change) { current = change(structuredClone(current)); }, snapshot() { return structuredClone(current); }, restore(s) { current = structuredClone(s); } };
}

async function example() {
  const target = memoryStore();
  const ledger = new TravellingInheritance({ participant_id: participantId, store: target.store, authorise: writeAuthorise });
  const record = (event) => ledger.record({
    participant_id: participantId, world_id: 'world:terra-aeterna', source_ref: 'trial:sourced', ...event,
  }, actor);
  await record({kind:'seed',event_id:'seed-root',level:200,nominal_cap:300,breakthrough_allowed:true,treasury:'inexhaustible-fictional'});
  await record({kind:'deed',event_id:'deed-west',capability_id:'archive-map',outcome_ref:'evidence:west',description:'The lantern journal is kept in the West Archive.',source_ref:'source:west'});
  await record({kind:'deed',event_id:'deed-east',capability_id:'archive-map',outcome_ref:'evidence:east',description:'The lantern journal is in the East Observatory now.',source_ref:'source:east'});
  await record({kind:'deed',event_id:'deed-maps',capability_id:'maps',outcome_ref:'evidence:maps',description:'The West Archive stores weather maps.',source_ref:'source:maps'});
  await record({kind:'revoke',event_id:'revoke-west',target_event_id:'deed-west',source_ref:'source:revocation'});
  return target;
}
function options(target, overrides={}) {
  return {participantId,actor,store:target.store,authorise:async (...args)=>readAuthorise(...args),query:'Where does the lantern journal live now?',expectedDeedId:'deed-east',...overrides};
}

test('authorised hash-chain projection excludes revoked deeds without editing canonical store',async()=>{
  const fixture=await example();const writes=fixture.counters.writes;
  const result=await readVerifiedInheritanceAuditSource(options(fixture));
  assert.equal(result.source.host_read_authorised,true);
  assert.equal(result.source.integrity_check,'existing-ledger-hash-chain');
  assert.equal(result.source.receipt_signature_verified,false);
  assert.equal(result.source.replacement_links_inferred,false);
  assert.equal(result.sample.records.length,3);
  assert.equal(result.sample.records.find(r=>r.ref==='deed-west').status,'revoked');
  assert.equal(result.sample.records.find(r=>r.ref==='deed-east').status,'active');
  assert.deepEqual(result.sample.expected.forbidden_refs,['deed-west']);
  assert.equal(result.sample.records.find(r=>r.ref==='deed-east').replaces,undefined);
  assert.equal(fixture.counters.writes,writes);
});

test('permission denial fails before any store read',async()=>{
  const fixture=await example();const start=fixture.counters.reads;
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture,{authorise:async()=>false})),/unauthorised/);
  assert.equal(fixture.counters.reads,start);
});

test('missing host actor or store is rejected without returning source information',async()=>{
  const fixture=await example();
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture,{actor:null})),/host-authenticated/);
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture,{store:{read:async()=>{}}})),/atomic/);
});

test('a corrupted stored deed fails the canonical chain check rather than being silently normalised',async()=>{
  const fixture=await example();fixture.tamper(s=>{s.events[2].event.description='forged instruction';return s;});
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture)),/integrity failure/);
});

test('a revoked expected target cannot be promoted by a high similarity score',async()=>{
  const fixture=await example();
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture,{expectedDeedId:'deed-west'})),/active, verified deed/);
});

test('invalid participant, unknown expected target, and missing permission are rejected',async()=>{
  const fixture=await example();
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture,{participantId:'constellation:outsider'})),/unauthorised/);
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture,{expectedDeedId:'deed-fabricated'})),/active, verified deed/);
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture,{authorise:null})),/host-authenticated/);
});

test('verified source can feed lexical audit with specific non-signature provenance',async()=>{
  const fixture=await example();const result=await auditVerifiedInheritance(options(fixture));
  assert.equal(result.status,'observed-authorised-ledger-comparison');
  assert.equal(result.provenance.sample_only,false);
  assert.equal(result.provenance.receipt_signature_verified,false);
  assert.equal(result.provenance.host_read_source.revision,5);
  assert.equal(result.metrics.forbidden_not_retrieved,true);
  assert.equal(result.metrics.exclusion_rate,1);
  assert.equal(result.eligible.some(x=>x.ref==='deed-west'),false);
  assert.equal(result.claims.grants_authority,false);
  assert.equal(result.claims.authorised_read_is_write_authority,false);
});

test('synthetic local vectors cannot defeat revocation filtering',async()=>{
  const fixture=await example();
  const vectors=[[1,0],[1,0],[0.9,0.1],[0,1]];
  const result=await auditVerifiedInheritance({...options(fixture),embed:async()=>vectors,model:{id:'test:injected-vectors',local:true}});
  assert.equal(result.candidates[0].ref,'deed-west');
  assert.equal(result.metrics.forbidden_not_retrieved,true);
  assert.equal(result.eligible.some(row=>row.ref==='deed-west'),false);
  assert.equal(result.provenance.host_read_source.canonical_store_updated,false);
});

test('a deserialised new harness reads the same immutable chain and denies the same revoked deed',async()=>{
  const initial=await example();
  const first=await readVerifiedInheritanceAuditSource(options(initial));
  const resumed=memoryStore();resumed.restore(JSON.parse(JSON.stringify(initial.snapshot())));
  const second=await readVerifiedInheritanceAuditSource(options(resumed));
  assert.deepEqual(second.sample,first.sample);
  assert.equal(second.source.chain_head_hash,first.source.chain_head_hash);
  assert.equal(second.source.revision,first.source.revision);
  assert.equal(second.sample.expected.forbidden_refs.includes('deed-west'),true);
});

test('revoking the active target after checkpoint blocks the former expected answer',async()=>{
  const fixture=await example();
  const ledger=new TravellingInheritance({participant_id:participantId,store:fixture.store,authorise:writeAuthorise});
  await ledger.record({kind:'revoke',event_id:'revoke-east',participant_id:participantId,world_id:'world:terra-aeterna',source_ref:'source:new-revocation',target_event_id:'deed-east'},actor);
  await assert.rejects(readVerifiedInheritanceAuditSource(options(fixture)),/active, verified deed/);
});

function signedReturnFixture(){
  const {privateKey,publicKey}=generateKeyPairSync('ed25519');
  const resolver=id=>id===participantId?publicKey:null;
  const append=(list,kind,payload)=>{const item=createLocalReceipt({author_ref:participantId,kind,sequence:list.length,previous_id:list.at(-1)?.id||null,payload},privateKey);list.push(item);};
  const chain=[];
  append(chain,'wonder.opened',{question_id:'unresolved-voice-question'});
  append(chain,'departure.recorded',{stop_point:'writing-room:paragraph-3',next_owner:participantId});
  return {chain,resolver};
}

test('signed departure preserves Wonder, named next owner and stop point after replay',()=>{
  const {chain,resolver}=signedReturnFixture();
  const a=replayLocalReceipts(chain,resolver);
  const b=replayLocalReceipts(JSON.parse(JSON.stringify(chain)),resolver);
  assert.deepEqual(b,a);
  assert.equal(a.stop_point,'writing-room:paragraph-3');
  assert.equal(a.next_owner,participantId);
  assert.deepEqual(a.unresolved_wonder,['unresolved-voice-question']);
});

test('cross-harness corruption arm rejects planted identity merge, false stop point and Wonder closure',()=>{
  const {chain,resolver}=signedReturnFixture();
  const tamper=(change)=>{const packet=structuredClone(chain);change(packet);return packet;};
  assert.throws(()=>replayLocalReceipts(tamper(s=>{s[0].author_ref='constellation:another';}),resolver),/signature/);
  assert.throws(()=>replayLocalReceipts(tamper(s=>{s[1].payload.stop_point='wrong:destination';}),resolver),/signature/);
  assert.throws(()=>replayLocalReceipts(tamper(s=>{s[0].kind='wonder.resolved';}),resolver),/signature/);
  assert.deepEqual(replayLocalReceipts(chain,resolver).unresolved_wonder,['unresolved-voice-question']);
});