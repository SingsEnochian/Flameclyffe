'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createInquiryLoom, JOURNAL_SCHEMA } = require('../wayglass/inquiry-loom');
const rowan = { verified:true, participant_id:'rowan', principal_ref:'house:steward' };
const rarity = { verified:true, participant_id:'rarity', principal_ref:'oauth:rarity-private' };
const codex = { verified:true, participant_id:'codex', principal_ref:'crew:codex-private' };
function setup(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-inquiry-'));
  t.after(() => fs.rmSync(directory,{recursive:true,force:true}));
  const loom = () => createInquiryLoom({directory});
  return { directory, loom };
}
function open(loom) { return loom.open(rowan, { question:'Why might two independent maps disagree?', world_ref:'starwell:canopy-tide', source_refs:['source:map-1'] }); }

test('inquiry preserves original question, unresolved status and source without canon elevation after restart',t=>{
  const {loom}=setup(t);const a=open(loom());const b=loom().get(rowan,a.inquiry_id);
  assert.equal(b.question,a.question);
  assert.equal(b.stance,'open-unresolved');
  assert.equal(b.events[0].data.canon_status,'unadopted-proposal');
  assert.deepEqual(b.source_refs,['source:map-1']);
  assert.equal(b.return_marker.adopted_by_return_engine,false);
  assert.equal(b.event_integrity,'local-hash-chain-not-participant-signature');
});

test('authenticated seat must explicitly accept an invitation; request payload cannot forge authorship',t=>{
  const {loom}=setup(t);const l=loom(), opened=open(l);const id=opened.inquiry_id;
  assert.throws(()=>l.get(rarity,id),/membership/);
  assert.throws(()=>l.join(rarity,id,{}),/No invitation/);
  l.invite(rowan,id,{target_participant_id:'rarity'});
  assert.throws(()=>l.get(rarity,id),/membership/);
  assert.throws(()=>l.contribute(rarity,id,{kind:'interpretation',text:'before joining'}),/membership/);
  l.join(rarity,id);
  const result=l.contribute(rarity,id,{kind:'interpretation',text:'Perhaps scale differs.',source_refs:['study:declared']});
  assert.equal(result.events.at(-1).participant_id,'rarity');
  assert.equal(result.events.at(-1).principal_ref,'oauth:rarity-private');
  assert.equal(result.events.at(-1).data.evidence_status,'caller-declared-not-verified');
  assert.throws(()=>l.contribute(rarity,id,{kind:'challenge',text:'spoof',participant_id:'rowan'}),/Caller may not assign participant_id/);
  assert.throws(()=>l.contribute({...rarity,verified:false},id,{kind:'challenge',text:'spoof'}),/Verified host principal/);
  assert.equal(l.list(codex).inquiries.length,0);
});

test('separate participants preserve disagreement, linked revision and return marker',t=>{
  const {loom}=setup(t);let l=loom(),id=open(l).inquiry_id;
  l.invite(rowan,id,{target_participant_id:'rarity'});
  l.invite(rowan,id,{target_participant_id:'codex'});
  l.join(rarity,id);l.join(codex,id);
  const claim=l.contribute(rarity,id,{kind:'interpretation',text:'The map uses a different tidal datum.'});
  const challenged=l.contribute(codex,id,{kind:'challenge',reply_to:claim.events.at(-1).event_id,text:'Scale mismatch fits better.'});
  const updated=l.contribute(rarity,id,{kind:'revision',reply_to:claim.events.at(-1).event_id,text:'Both datums deserve testing.'});
  assert.equal(updated.events.filter(x=>x.kind==='contributed').length,3);
  assert.deepEqual(updated.events.filter(x=>x.kind==='contributed').map(x=>x.participant_id),['rarity','codex','rarity']);
  assert.equal(updated.events.filter(x=>x.kind==='contributed')[0].data.text,'The map uses a different tidal datum.');
  assert.equal(challenged.events.at(-1).data.adopted_as_canon,false);
  assert.throws(()=>l.contribute(codex,id,{kind:'revision',text:'overwrite'}),/Revision must reference/);
  assert.throws(()=>l.contribute(codex,id,{kind:'revision',text:'cross-inquiry',reply_to:'wgi-event:unknown'}),/reply_to must reference/);
  const paused=l.pause(codex,id,{stop_point:'Compare reference grids.',next_owner:'rarity'});
  assert.equal(paused.return_marker.next_owner,'rarity');
  assert.equal(paused.return_marker.status,'unresolved');
  const after=loom().get(rowan,id);
  assert.deepEqual(after.return_marker,paused.return_marker);
  assert.equal(after.events.length,paused.events.length);
  assert.match(after.return_marker.provenance_ref,/^[a-f0-9]{64}$/);
});

test('host authorisation happens before disk access, and foreign seats cannot read questions',t=>{
  const {loom}=setup(t);const l=loom(),id=open(l).inquiry_id;
  assert.throws(()=>l.get(undefined,id),/Verified host principal/);
  assert.throws(()=>l.list({participant_id:'rowan',verified:false,principal_ref:'wrong'}),/Verified host principal/);
  assert.throws(()=>l.get(codex,id),/membership/);
  assert.equal(l.list(codex).inquiries.length,0);
  assert.throws(()=>l.invite(codex,id,{target_participant_id:'codex'}),/membership/);
  assert.throws(()=>l.open(rowan,{question:'X',author:'rarity'}),/Caller may not assign author/);
  assert.throws(()=>l.open(rowan,{question:'X',canonical:true}),/Caller may not assign canonical/);
});

test('journal refuses corruption, does not silently repair forged text or revive old assumptions',t=>{
  const {loom,directory}=setup(t),l=loom();const id=open(l).inquiry_id;
  l.contribute(rowan,id,{kind:'alternative',text:'Maybe it is an image registration error.'});
  const file=path.join(directory,'journal.json');
  const stored=JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(stored.schema,JOURNAL_SCHEMA);
  stored.events[1].data.text='Promoted to canon';
  fs.writeFileSync(file,JSON.stringify(stored));
  assert.throws(()=>loom().get(rowan,id),/integrity failure/);
  assert.throws(()=>loom().open(rowan,{question:'Future inquiry'}),/integrity failure/);
});

test('no open path sends providers, acts on external records or changes participant grants',t=>{
  const {loom}=setup(t),l=loom(),id=open(l).inquiry_id;
  const all=l.get(rowan,id);
  assert.equal(all.return_marker.adopted_by_return_engine,false);
  assert.equal(all.return_marker.source_authority,'local-hash-chain-only');
  assert.equal(all.events[0].data.canon_status,'unadopted-proposal');
  assert.throws(()=>l.contribute(rowan,id,{kind:'conclusion',text:'Approved'}),/Unsupported/);
  assert.throws(()=>l.contribute(rowan,id,{kind:'outcome',text:'I have approval',authority:'steward'}),/Caller may not assign authority/);
});