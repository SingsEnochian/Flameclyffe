import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTimelineOriginal,buildAlteredTimeline,rewindAlteredTimeline,
  validateWyrdruneRipple,TIMELINE_ALTERED_SCHEMA,
} from '../src/altered-timeline.js';

const at='2026-11-14T10:12:00.000Z';
const ripple={
  schema:'wayglass.altered-timeline-ripple/v0.1',mode:'hypothetical',
  reversible:true,requires_explicit_choice:true,confirmed:true,
  probability_claimed:false,inferred_events:0,
  levels:[
    {id:'near',label:'First ripple',intensity:.36},
    {id:'middle',label:'Second ripple',intensity:.198},
    {id:'far',label:'Third ripple',intensity:.1089},
    {id:'echo',label:'Open echo',intensity:.04356},
  ],
};
function original(){
  return createTimelineOriginal({worldId:'council',worldName:'Council experiment',
    at,events:[
      {id:'before',at:'2026-11-14',title:'The council debates the pilot.'},
      {id:'after',at:'2027-01-05',title:'The pilot becomes public.'},
    ]});
}
const change=(mode='replace',title='The council introduces human oversight.')=>({
  mode,target_id:'before',title,reason:'Explore a deliberate alternative',
  magnitude:.5,ripple,wtl_source_sha256:'a'.repeat(64),
  source_refs:['owner:local-what-if'],
});
const build=(source,changes,opts={})=>buildAlteredTimeline({
  original:source,branchId:'council-altered',changes,approved:true,at,...opts,
});
test('Worldseed fork preserves original and opens an altered descendant',()=>{
  const source=original(),snapshot=structuredClone(source);
  const result=build(source,[change()]);
  assert.equal(result.schema,TIMELINE_ALTERED_SCHEMA);
  assert.equal(result.original.world.id,'council');
  assert.equal(result.altered.world.parentWorldId,'council');
  assert.equal(result.altered.world.id,'council-altered');
  assert.equal(result.altered.world.parentSeedFingerprint,result.worldseed.seed_fingerprint);
  assert.equal(result.worldseed.fork_receipt.mode,'experimental');
  assert.equal(result.original.events[0].title,'The council debates the pilot.');
  assert.equal(result.altered.events[0].title,'The council introduces human oversight.');
  assert.equal(result.altered.events[1].continuation_status,'inherited-unverified-after-divergence');
  assert.deepEqual(source,snapshot);
  assert.equal(result.comparison.replaced[0],'before');
  assert.equal(result.model_dispatch,false);
  assert.equal(result.physical_timeline_changed,false);
  assert.equal(result.canon_commit,false);
});
test('insert creates a child event, never writes into original',()=>{
  const source=original(),result=build(source,[change('insert','A citizen assembly is formed.')]);
  assert.equal(source.events.length,2);
  assert.equal(result.altered.events.length,3);
  assert.equal(result.altered.events[0].title,'The council debates the pilot.');
  assert.equal(result.altered.events[1].title,'A citizen assembly is formed.');
  assert.equal(result.comparison.added.length,1);
  assert.equal(result.change_receipts[0].before.id,'before');
  assert.ok(result.change_receipts[0].result_event_id.includes('insert:1'));
});
test('omit is a branch-level omission and keeps a source receipt',()=>{
  const source=original(),result=build(source,[change('omit','')]);
  assert.equal(source.events.length,2);
  assert.deepEqual(result.comparison.removed,['before']);
  assert.ok(result.change_receipts[0].before.title.includes('council'));
  assert.equal(result.change_receipts[0].after,null);
  assert.equal(result.altered.events[0].id,'after');
});
test('two changes and exact rewind restore prior altered state with original intact',()=>{
  const source=original(),two=[change(),change('insert','The council forms a public lab.')];
  const full=build(source,two);
  const previous=rewindAlteredTimeline({
    original:source,branchId:'council-altered',changes:two,at,approved:true,
  });
  assert.equal(full.change_receipts.length,2);
  assert.equal(previous.change_receipts.length,1);
  assert.deepEqual(previous.altered.events,build(source,[two[0]]).altered.events);
  assert.equal(source.events[0].title,'The council debates the pilot.');
});
test('refuses unknown source, bad date, duplicate events and malformed plan',()=>{
  assert.throws(()=>createTimelineOriginal({events:[]}),/1–64 events/);
  assert.throws(()=>createTimelineOriginal({events:[{id:'x',at:'2026-02-30',title:'bad'}]}),/real ISO/);
  assert.throws(()=>createTimelineOriginal({events:[
    {id:'x',at:'2026-11-14',title:'first'},{id:'x',at:'2026-11-15',title:'second'}
  ]}),/Duplicate/);
  assert.throws(()=>validateWyrdruneRipple({...ripple,probability_claimed:true}),/native Wyrdrune/);
  assert.throws(()=>build(original(),[{...change(),ripple:{...ripple,inferred_events:1}}]),/native Wyrdrune/);
  assert.throws(()=>build(original(),[{...change(),target_id:'unknown'}]),/original event|source-world event/);
});
test('Feather, missing deliberate choice and forbidden branch ID stop mutation',()=>{
  const source=original(),before=structuredClone(source);
  assert.throws(()=>build(source,[change()],{featherStopped:true}),/Feather/);
  assert.throws(()=>buildAlteredTimeline({
    original:source,branchId:'other',changes:[change()],approved:false,
  }),/explicit local owner choice/);
  assert.throws(()=>buildAlteredTimeline({
    original:source,branchId:'council',changes:[change()],approved:true,
  }),/distinct world ID/);
  assert.deepEqual(source,before);
});
test('cannot insert after a removed branchpoint; no silent recreation',()=>{
  assert.throws(()=>build(original(),[change('omit',''),change('insert','Hidden change')]),
    /omitted event/);
});
test('ripple values are illustration only, not probabilities or inferred future events',()=>{
  const result=build(original(),[change()]);
  const changeReceipt=result.change_receipts[0];
  assert.deepEqual(changeReceipt.ripple_horizons.map(x=>x.intensity),
    ripple.levels.map(x=>x.intensity));
  assert.equal(changeReceipt.model_invoked,false);
  assert.equal(changeReceipt.physical_timeline_changed,false);
});
