import test from 'node:test';
import assert from 'node:assert/strict';
import {createResonanceLearningLedger} from '../src/resonance-learning.js';
test('learning requires two independently receipted observations, not just invention',()=>{
 const ledger=createResonanceLearningLedger();
 ledger.begin({trialId:'first',resonanceId:'opal',sourceReceipt:'ship:1',baseline:2});
 assert.throws(()=>ledger.assess('first'));
 ledger.observe({trialId:'first',observationReceipt:'observer:1',measurement:3,sourceKind:'instrument'});
 assert.throws(()=>ledger.assess('first'));
 ledger.observe({trialId:'first',observationReceipt:'owner:2',measurement:5,sourceKind:'owner-review'});
 const result=ledger.assess('first');
 assert.equal(result.status,'provisional');assert.equal(result.delta,2);
 assert.equal(ledger.snapshot().trials[0].sourceReceipt,'ship:1');
});
test('a self-reported proposal cannot masquerade as observation',()=>{
 const l=createResonanceLearningLedger();
 l.begin({trialId:'first',resonanceId:'opal',sourceReceipt:'ship:1',baseline:0});
 assert.throws(()=>l.observe({trialId:'first',observationReceipt:'ship:1',measurement:9,sourceKind:'test'}));
 assert.throws(()=>l.observe({trialId:'first',observationReceipt:'observer:1',measurement:9,sourceKind:'model-claim'}));
});
test('Feather prevents new observations or assessment',()=>{
 const l=createResonanceLearningLedger();
 assert.equal(l.begin({trialId:'first',resonanceId:'opal',sourceReceipt:'ship:1',baseline:0,feather:true}).status,'feather-stopped');
 l.begin({trialId:'first',resonanceId:'opal',sourceReceipt:'ship:1',baseline:0});
 assert.equal(l.observe({trialId:'first',observationReceipt:'observer:1',measurement:1,sourceKind:'test',feather:true}).status,'feather-stopped');
 assert.equal(l.snapshot().trials[0].observations.length,0);
});
