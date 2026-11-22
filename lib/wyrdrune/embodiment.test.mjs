import test from 'node:test';
import assert from 'node:assert/strict';
import {embodimentIdentity,universeProfile,proposeEmbodiment,adoptEmbodiment,returnEmbodiment} from './embodiment.mjs';
const rowan=()=>embodimentIdentity('rowan','Rowan',['visual','motion','voice','flight']);
const wayglass=()=>universeProfile('wayglass:universe','Wayglass',['visual','motion','voice','flight'],'digital');
test('one identity translates into different compatible world expressions',()=>{
 const identity=rowan(),first=proposeEmbodiment(identity,wayglass(),'opal','visual' in {}?[]:['visual','motion','voice','flight']);
 const b5=universeProfile('fiction:babylon-5','Babylon 5 sandbox',['visual','motion','voice'],'digital');
 const alt=proposeEmbodiment(identity,b5,'ambassador',['visual','motion','voice','flight']);
 assert.equal(first.unavailable.length,0);
 assert.deepEqual(alt.unavailable,['flight']);
 assert.equal(first.participantId,alt.participantId);
 assert.equal(identity.activeForm,null);
 const selected=adoptEmbodiment(identity,first,{confirmed:true});
 assert.equal(selected.activeForm.worldId,'wayglass:universe');
 assert.equal(identity.activeForm,null);
 const returned=returnEmbodiment(selected,{confirmed:true});
 assert.equal(returned.identity.activeForm,null);
 assert.equal(returned.identity.participantId,identity.participantId);
 assert.equal(returned.receipt.departed.formId,'opal');
});
test('refusals preserve agency, world boundaries and hardware separation',()=>{
 const id=rowan(),world=wayglass(),p=proposeEmbodiment(id,world,'opal',['visual']);
 assert.throws(()=>adoptEmbodiment(id,p),/Explicit/);
 assert.throws(()=>returnEmbodiment(id),/Explicit/);
 assert.throws(()=>adoptEmbodiment(embodimentIdentity('bluebird','Bluebird',['visual']),p,{confirmed:true}),/mismatch/);
 const physical=universeProfile('hardware:prototype','Robotic proposal',['visual','robotic-movement'],'physical-proposal');
 const candidate=proposeEmbodiment(id,physical,'robot',['visual']);
 assert.equal(candidate.canExecutePhysicalActions,false);
 assert.throws(()=>adoptEmbodiment(id,candidate,{confirmed:true}),/Physical/);
 assert.throws(()=>universeProfile('hardware:invalid','Invalid',['magic'],'physical-proposal'),/magic/);
 assert.throws(()=>adoptEmbodiment(id,proposeEmbodiment(id,world,'impossible',['visual','robotic-movement']),{confirmed:true}),/Untranslated/);
});
test('WTL compiles and returns a non-adopted cross-world proposal',async()=>{
 const {createWyrdruneRuntime}=await import('./runtime.mjs');
 const runtime=createWyrdruneRuntime({hashSource:s=>String(s.length),continuityDigest:v=>JSON.stringify(v)});
 const source=`mobius scoped {
 perceive { let rowan = embodimentIdentity("rowan","Rowan",["visual","motion","flight"]); }
 compress { let universe = universeProfile("witcher:sandbox","Witcher sandbox",["visual","motion","magic"],"digital"); }
 release { let candidate = proposeEmbodiment(rowan,universe,"falka",["visual","motion","flight"]); }
 verify { require true else "No silent adoption"; }
 integrate { }
 choose { }
 return { emit candidate; }
 transcend { carry anchor = "rowan"; }
 }`;
 const r=await runtime.execute(runtime.compile(source));
 assert.equal(r.output[0].schema,'wyrdrune.embodiment-proposal/v0.1');
 assert.deepEqual(r.output[0].unavailable,['flight']);
 assert.equal(r.output[0].adopted,false);
 assert.equal(r.continuity.carry.anchor,'rowan');
});
