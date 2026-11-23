import test from 'node:test';
import assert from 'node:assert/strict';
import {createMorphPlan,verifyMorphPlan,previewMorphPlan} from './soma-nova-morphogenesis.mjs';
const base={identity_ref:'rowan',form_id:'base-1',domains:['appearance','structure'],appearance:{hair:'dark'},capabilities:[],sensory_profile:{accessibility:['keyboard']},environment_profile:{gravity:'1g'},return_anchor:'base-1',memory:'held',agency:'held',values:'held',consent:'held'};
const target={...base,form_id:'form-2',parent_form_id:'base-1',appearance:{hair:'silver',eyes:'hazel'},domains:['appearance','structure','sensory'],sensory_profile:{accessibility:['keyboard','screen-reader']}};
test('plan is deterministic, attributable and leaves source forms unchanged',()=>{
 const before=structuredClone(base),after=structuredClone(target);
 const a=createMorphPlan(base,target,{author:'rowan',source:'folio',hashSource:s=>'sha:'+s.length});
 const b=createMorphPlan(base,target,{author:'rowan',source:'folio',hashSource:s=>'sha:'+s.length});
 assert.equal(a.plan_id,b.plan_id);assert.equal(a.changes.length,6);
 assert.deepEqual(base,before);assert.deepEqual(target,after);
});
test('identity anchor and protected continuity fields cannot be rewritten',()=>{
 assert.throws(()=>createMorphPlan(base,{...target,identity_ref:'other'}),/Identity anchor/);
 assert.throws(()=>createMorphPlan(base,{...target,memory:'rewritten'}),/Protected/);
});
test('unknown compatibility remains unknown and blocks commit',()=>{
 const plan=createMorphPlan(base,target);
 const report=verifyMorphPlan(plan,{environmentRequirements:[{name:'pressure',status:'unknown'}]});
 assert.equal(report.status,'unknown');assert.equal(report.canPreview,true);assert.equal(report.canCommit,false);
});
test('unsupported requirements block commit',()=>{
 const plan=createMorphPlan(base,target);
 const report=verifyMorphPlan(plan,{environmentRequirements:[{name:'atmosphere',status:'unsupported',evidence:'fixture'}]});
 assert.equal(report.status,'unsupported');assert.equal(report.canCommit,false);
});
test('preview is inspectable and has no persistence or external effects',()=>{
 const plan=createMorphPlan(base,target);
 const report=verifyMorphPlan(plan,{environmentRequirements:[{name:'gravity',status:'supported',evidence:'declared 1g'}]});
 const preview=previewMorphPlan(plan,report);
 assert.equal(report.canCommit,true);assert.equal(preview.state,'preview-only');
 assert.equal(preview.persisted,false);assert.equal(preview.externalEffects,'none');
 assert.equal(preview.identity_ref,'rowan');assert.equal(preview.return_anchor,undefined);
});
test('preview refuses a report for another plan',()=>{
 const plan=createMorphPlan(base,target),other=createMorphPlan(base,{...target,appearance:{hair:'red'}});
 const report=verifyMorphPlan(other);
 assert.throws(()=>previewMorphPlan(plan,report),/Matching/);
});
test('parent lineage and form identity are required',()=>{
 assert.throws(()=>createMorphPlan(base,{...target,parent_form_id:'wrong'}),/parent_form_id/);
 assert.throws(()=>createMorphPlan(base,{...target,form_id:'base-1'}),/distinct/);
});
