import test from 'node:test';
import assert from 'node:assert/strict';
import {stateEngine,geometryEngine,temporalEngine,runQuadEngine} from '../src/quad-engine.js';
test('Hadamard interference returns normalized balanced probabilities',()=>{
 const result=stateEngine.hadamard([{re:1,im:0},{re:0,im:0}]);
 assert.ok(stateEngine.probabilities(result).every(p=>Math.abs(p-0.5)<1e-12));
});
test('fold index is bounded for nonzero singular values',()=>assert.equal(geometryEngine.foldIndex([4,1]).foldIndex,0.75));
test('lease prevents premature temporal execution',()=>assert.equal(temporalEngine.schedule({now:'2026-11-02T20:00:00Z',nextDueAt:'2026-11-02T19:00:00Z',leaseUntil:'2026-11-02T21:00:00Z'}).ready,false));
test('quad receipt labels simulation and rejects authority promotion',()=>{
 const receipt=runQuadEngine();assert.equal(receipt.execution,'classical-simulation');assert.equal(receipt.becoming.authorityGrant,false);
});
