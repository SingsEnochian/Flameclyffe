import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {LIFT_ROOMS,liftStep,liftSelection} from '../src/triptych-lift-state.mjs';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';

const source=readFileSync(new URL('../../../lib/wyrdrune/triptych-mobius-lift.wtl',import.meta.url),'utf8');
const runtime=createWyrdruneRuntime({hashSource:s=>createHash('sha256').update(s).digest('hex')});

async function getPlan(){
 const execution=await runtime.execute(runtime.compile(source));
 return {execution,plan:execution.output.find(x=>x?.schema==='wayglass.triptych-lift/v0.1')};
}
test('step navigation is bounded and reversible, without implicit room crossing',()=>{
 assert.equal(liftStep(0,1),1);
 assert.equal(liftStep(1,1),2);
 assert.equal(liftStep(2,1),2);
 assert.equal(liftStep(2,-1),1);
 assert.equal(liftStep(1,-1),0);
 assert.equal(liftStep(0,-1),0);
 assert.equal(liftStep(0,2),2);
 for(const input of [-1,3,NaN,1.5]) assert.throws(()=>liftStep(input,1),/Unknown chamber/);
 for(const input of [NaN,1.3,3,Infinity]) assert.throws(()=>liftStep(1,input),/Invalid lift direction/);
});
test('Wyrdrune is the score source and authorises exactly the three ship rooms',async()=>{
 const {execution,plan}=await getPlan();
 assert.equal(execution.withness.completedCycles,2);
 assert.equal(execution.receipts.length,16);
 assert.equal(plan.autoplay,false);
 assert.equal(plan.reversible,true);
 assert.deepEqual(plan.panels.map(p=>p.destination),LIFT_ROOMS);
 for(let i=0;i<3;i++)assert.equal(liftSelection(plan,i),plan.panels[i]);
 assert.throws(()=>liftSelection(plan,3),/allowlisted/);
 assert.throws(()=>liftSelection({panels:[{...plan.panels[0],destination:'outside:unknown'}]},0),/allowlisted/);
 assert.throws(()=>liftSelection({panels:[{...plan.panels[0],gain:1}]},0),/audible/);
 assert.throws(()=>liftSelection({panels:[{...plan.panels[0],root_hz:Infinity}]},0),/audible/);
});
test('lowercase audio controls are explicit and no live model is simulated by WTL',async()=>{
 const {execution,plan}=await getPlan();
 assert.equal(plan.autoplay,false);
 assert.ok(plan.panels.every(p=>p.gain<=.12));
 assert.ok(execution.receipts.every(r=>r.principalId===null));
 assert.ok(execution.output.every(v=>v?.kind!=='wayglass.model-observation/v0.1'));
});
