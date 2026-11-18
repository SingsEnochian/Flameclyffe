'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCellGarden, PHASES, ECOLOGY_SCHEMAS } = require('../../../lib/wayglass-cell-mitosis.cjs');

async function daughters(garden = createCellGarden({maxActive: 4, maxGeneration: 3})) {
  const p = await garden.propose({cell_id:'cell:origin', expected_revision:0});
  const {culture} = garden.commit({proposal_id:p.proposal_id, expected_revision:0, owner_confirmed:true});
  return {garden, ids:culture.cells.filter(c=>c.status==='active').map(c=>c.cell_id)};
}
async function specialised(garden) {
  const created = await daughters(garden);
  const [a,b] = created.ids;
  const x = await garden.specialise({cell_id:a,role:'resonance',expected_revision:1,owner_confirmed:true});
  const y = await garden.specialise({cell_id:b,role:'observation',expected_revision:2,owner_confirmed:true});
  return {a,b,x,y,garden};
}
const phases = receipt => assert.deepEqual(receipt.wtl.phase_receipts.map(x=>x.phase),PHASES);

test('daughters specialise independently without rewriting ancestry or inheriting authority',async()=>{
  const garden=createCellGarden({maxActive:4,maxGeneration:3});
  const {a,b,x,y}=await specialised(garden);
  const state=garden.snapshot();
  const son=state.cells.find(c=>c.cell_id===a),daughter=state.cells.find(c=>c.cell_id===b);
  assert.equal(x.receipt.schema,ECOLOGY_SCHEMAS.specialisation);
  assert.equal(y.receipt.status,'committed-in-memory');
  assert.equal(son.specialisation,'resonance');
  assert.equal(daughter.specialisation,'observation');
  assert.equal(son.parent_id,daughter.parent_id);
  assert.notEqual(son.acoustic_address,daughter.acoustic_address);
  assert.equal(son.lineage_root,daughter.lineage_root);
  assert.deepEqual(son.capabilities,[]);
  assert.deepEqual(daughter.capabilities,[]);
  assert.equal(x.receipt.self_authored_identity,false,'No fake independent model selection');
  await assert.rejects(garden.specialise({
    cell_id:a,role:'observation',expected_revision:3,owner_confirmed:true,
  }),/rewrite/i);
  await assert.rejects(garden.specialise({
    cell_id:b,role:'observation',expected_revision:3,owner_confirmed:true,
  }),/already/i);
});

test('an exchanged observation carries typed WTL provenance and a real addressed acoustic marker',async()=>{
  const garden=createCellGarden({maxActive:4,maxGeneration:3});
  const {a,b}=await specialised(garden);
  const receipt= (await garden.exchange({
    from_id:a,to_id:b,message:'Hum beneath the hum',expected_revision:3,
    owner_confirmed:true,receiver_route_approved:true,
  })).receipt;
  assert.equal(receipt.schema,ECOLOGY_SCHEMAS.exchange);
  assert.equal(receipt.status,'delivered-in-memory');
  phases(receipt);
  assert.equal(receipt.acoustic.encoding,'marker-and-open-status-only');
  assert.equal(receipt.acoustic.playback_started,false);
  assert.equal(receipt.acoustic.request.recipient,receipt.acoustic.reply.sender);
  assert.equal(receipt.acoustic.request.sender,receipt.acoustic.reply.recipient);
  assert.equal(receipt.acoustic.request.marker,receipt.acoustic.reply.marker);
  assert.equal(receipt.acoustic.reply.resolution,'open');
  assert.ok(receipt.acoustic.request.marker>=1 && receipt.acoustic.request.marker<=65535);
  const state=garden.snapshot();
  assert.deepEqual(state.cells.find(x=>x.cell_id===a).memory_refs,[]);
  assert.deepEqual(state.cells.find(x=>x.cell_id===b).memory_refs,[receipt.message_id],
    'Only receiver acquires this local memory reference');
  assert.equal(receipt.physical_audio_verified,false);
  assert.equal(receipt.model_invoked,false);
  await assert.rejects(garden.exchange({
    from_id:a,to_id:b,message:'stale',expected_revision:3,
    owner_confirmed:true,receiver_route_approved:true,
  }),/revision/i);
});

test('signal transfer refuses unapproved routes, unknown cells and oversize data without mutations',async()=>{
  const garden=createCellGarden({maxActive:4,maxGeneration:3});
  const {a,b}=await specialised(garden);
  const state=garden.snapshot();
  const send=(overrides={})=>garden.exchange({
    from_id:a,to_id:b,message:'one',expected_revision:3,
    owner_confirmed:true,receiver_route_approved:true,...overrides
  });
  await assert.rejects(send({receiver_route_approved:false}),/opt-in/i);
  await assert.rejects(send({owner_confirmed:false}),/authorisation/i);
  await assert.rejects(send({from_id:b,to_id:b}),/distinct/i);
  await assert.rejects(send({to_id:'cell:ghost'}),/not active/i);
  await assert.rejects(send({message:'a'.repeat(201)}),/bounded/i);
  assert.deepEqual(garden.snapshot(),state);
});

test('fusion must follow a real crossing; it proposes a third hybrid without consuming either daughter',async()=>{
  const garden=createCellGarden({maxActive:4,maxGeneration:3});
  const {a,b}=await specialised(garden);
  await assert.rejects(garden.proposeFusion({
    left_id:a,right_id:b,expected_revision:3
  }),/prior cell exchange/i);
  const {receipt:signal}=await garden.exchange({
    from_id:a,to_id:b,message:'a shared rhythm, different interpretations',
    expected_revision:3,owner_confirmed:true,receiver_route_approved:true,
  });
  const before=garden.snapshot();
  const proposal=await garden.proposeFusion({left_id:a,right_id:b,expected_revision:4});
  phases(proposal);
  assert.equal(proposal.status,'proposed-not-committed');
  assert.equal(proposal.candidate.specialisation,'hybrid');
  assert.deepEqual(proposal.parent_ids,[a,b].sort());
  assert.deepEqual(proposal.candidate.memory_refs,[signal.message_id]);
  assert.equal(proposal.candidate.capabilities.length,0);
  assert.equal(garden.snapshot().cells.length,before.cells.length);
  assert.throws(()=>garden.commitFusion({
    proposal_id:proposal.proposal_id,expected_revision:4
  }),/authorisation/i);
  const {receipt,culture}=garden.commitFusion({
    proposal_id:proposal.proposal_id,expected_revision:4,owner_confirmed:true
  });
  assert.equal(receipt.schema,ECOLOGY_SCHEMAS.fusion);
  assert.equal(receipt.independent_parents_retained,true);
  assert.equal(culture.cells.filter(c=>c.status==='active').length,3);
  assert.ok(culture.cells.find(x=>x.cell_id===a && x.status==='active'));
  assert.ok(culture.cells.find(x=>x.cell_id===b && x.status==='active'));
  const child=culture.cells.find(x=>x.cell_id===receipt.hybrid_id);
  assert.deepEqual(child.parent_ids,[a,b].sort());
  assert.equal(child.specialisation,'hybrid');
  assert.equal(child.authority_inherited,undefined);
  assert.throws(()=>garden.commitFusion({
    proposal_id:proposal.proposal_id,expected_revision:5,owner_confirmed:true
  }),/stale|revoked/i);
});

test('Feather stops fusion, revoked proposals never become authority and resume does not resurrect them',async()=>{
  const garden=createCellGarden({maxActive:4,maxGeneration:3});
  const {a,b}=await specialised(garden);
  await garden.exchange({
    from_id:a,to_id:b,message:'recognition',expected_revision:3,
    owner_confirmed:true,receiver_route_approved:true
  });
  const proposal=await garden.proposeFusion({left_id:a,right_id:b,expected_revision:4});
  garden.feather();
  assert.equal(garden.snapshot().fusion_pending,null);
  assert.throws(()=>garden.commitFusion({
    proposal_id:proposal.proposal_id,expected_revision:4,owner_confirmed:true
  }),/Feather/i);
  garden.resume({owner_confirmed:true});
  assert.throws(()=>garden.commitFusion({
    proposal_id:proposal.proposal_id,expected_revision:4,owner_confirmed:true
  }),/stale|revoked/i);
  assert.equal(garden.snapshot().cells.filter(c=>c.status==='active').length,2);
});

test('fusion is denied if generation or population limits would be crossed',async()=>{
  const garden=createCellGarden({maxActive:2,maxGeneration:1});
  const {a,b}=await specialised(garden);
  await garden.exchange({
    from_id:a,to_id:b,message:'signal',expected_revision:3,
    owner_confirmed:true,receiver_route_approved:true
  });
  await assert.rejects(garden.proposeFusion({
    left_id:a,right_id:b,expected_revision:4
  }),/budget/i);
});
