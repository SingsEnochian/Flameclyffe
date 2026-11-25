import test from 'node:test';
import assert from 'node:assert/strict';
import {createHarnessWorldBridge} from '../src/harness-world-bridge.js';

test('two independent observations produce one provenance-bound Watercolour projection',()=>{
  const rendered=[];
  const bridge=createHarnessWorldBridge({publish:event=>rendered.push(event)});
  bridge.begin({trialId:'trial-one',harnessId:'pi',sourceReceipt:'run:original',baseline:39});
  assert.throws(()=>bridge.assess('trial-one'),/Two independent observations/);
  bridge.observe({trialId:'trial-one',observationReceipt:'test:first',measurement:54,
    sourceKind:'test'});
  assert.throws(()=>bridge.assess('trial-one'),/Two independent observations/);
  bridge.observe({trialId:'trial-one',observationReceipt:'test:second',measurement:56,
    sourceKind:'test'});
  const scene=bridge.assess('trial-one');
  assert.equal(scene.assessment.delta,16);
  assert.deepEqual(scene.assessment.observation_receipts,['test:first','test:second']);
  assert.equal(scene.projection_status,'visual-expression-only');
  assert.equal(rendered.length,1);
  assert.equal(rendered[0].kind,'learning:verified');
  assert.equal(rendered[0].receipt.receipt_id,'run:original');
});
test('untrusted self-report and duplicate receipts fail closed',()=>{
  const bridge=createHarnessWorldBridge({publish:()=>{}});
  bridge.begin({trialId:'trial-two',harnessId:'hermes',sourceReceipt:'run:original',baseline:0});
  assert.throws(()=>bridge.observe({trialId:'trial-two',observationReceipt:'run:original',
    measurement:5,sourceKind:'test'}));
  assert.throws(()=>bridge.observe({trialId:'trial-two',observationReceipt:'model:claim',
    measurement:5,sourceKind:'model-claim'}));
});
test('Feather stops evaluation and requires deliberate owner resume',()=>{
  const rendered=[];
  const bridge=createHarnessWorldBridge({publish:e=>rendered.push(e)});
  bridge.begin({trialId:'trial-three',harnessId:'opencode',sourceReceipt:'run:original',baseline:2});
  bridge.feather();
  assert.equal(bridge.observe({trialId:'trial-three',observationReceipt:'test:one',
    measurement:4,sourceKind:'test'}).status,'feather-stopped');
  assert.equal(bridge.assess('trial-three').status,'feather-stopped');
  assert.throws(()=>bridge.resume(),/Owner approval/);
  bridge.resume({ownerApproved:true});
  assert.equal(bridge.snapshot().stopped,false);
  assert.equal(rendered.length,0);
});
