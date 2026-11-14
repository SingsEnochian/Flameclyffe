import test from 'node:test';
import assert from 'node:assert/strict';
import {
  observeIntegratedVoyage,latestIntegratedVoyage,
} from '../src/integrated-voyage-visual.js';
import {watercolorSnapshot} from '../src/watercolor-bridge.js';
import {runIntegratedVoyage} from '../../../lib/wayglass-integrated-voyage.cjs';

const principal={id:'participant:visual-fixture',authorized:true};
const baseline={source_ref:'visual:baseline',observed_at:'2026-11-13T20:00:00Z',
 kind:'simulation',network:{p95_ms:850,error_rate:0.18},
 intelligence:{success_rate:0.7},fallback_independent:true};
const candidate={source_ref:'visual:candidate',observed_at:'2026-11-13T20:01:00Z',
 kind:'simulation',network:{p95_ms:475,error_rate:0.04},
 intelligence:{success_rate:0.9},fallback_independent:true};
function inputs(){return {
 principal,world_id:'wayglass:visual-test',next_owner:principal.id,
 identity_declarations:[{participant_id:principal.id,declaration:'fixture self-description'}],
 coevolution:{
  mode:'repair',
  seeds:{infrastructure:{queue_capacity:24,timeout_ms:1200},
   intelligence:{concurrency:4,context_tokens:2048}},
  observation:baseline,
  trial:{baseline,candidate,configuration:{
   infrastructure:{queue_capacity:20,timeout_ms:1450},
   intelligence:{concurrency:3,context_tokens:1792},
  }},
 },
 mythience:{request:{
  traveller_id:'traveller:visual-fiction',origin_universe:'universe:field',
  destination_universe:'universe:harbour',
  ability:{id:'ability:light',origin_universe:'universe:field',modality:'magic'},
  history:[],field:{intention:.9,shifting:.9,porosity:.9,resonance:.9,compatibility:.9},
  consent:{traveller:true,origin:true,destination:true},event_id:'encounter:visual',
 }},
 recorded_at:'2026-11-13T20:02:00Z',
};}
test('native four-engine Return receipt is visualised by existing watercolour without autoplay',async()=>{
 const host=await runIntegratedVoyage(inputs());
 assert.equal(host.status,'connected-sandbox-preview');
 const initial=watercolorSnapshot().events.length;
 const reading=observeIntegratedVoyage(host);
 assert.equal(reading.status,'projected');
 assert.equal(reading.persisted,false);
 assert.equal(reading.autoplay,false);
 assert.equal(reading.canon_commit,false);
 assert.equal(latestIntegratedVoyage().receipt_ref,host.visualisation_proposal.receipt.receipt_id.slice(0,180));
 const snap=watercolorSnapshot();
 assert.equal(snap.events.length,initial+1);
 const event=snap.events.at(-1);
 assert.equal(event.kind,'fold:witness');
 assert.equal(event.authority,'render-only');
 assert.equal(event.qualia_inferred,false);
 assert.equal(event.evidence_state,'referenced-not-independently-verified');
});
test('no forged or failed integrated receipt can publish a colour',()=>{
 const count=watercolorSnapshot().events.length;
 assert.throws(()=>observeIntegratedVoyage({schema:'wayglass.integrated-voyage/v0.1',status:'connected-sandbox-preview'}),/returned/);
 assert.equal(watercolorSnapshot().events.length,count);
});
