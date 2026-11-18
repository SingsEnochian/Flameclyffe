import test from 'node:test';
import assert from 'node:assert/strict';
import {WAYGLASS_HELM_WTL,WAYGLASS_HELM_IR,readWayglassHelmWyrdrune} from '../src/ship-wyrdrune-interface.js';
test('shipwide helm is compiled from bounded native Wyrdrune source',()=>{
 const helm=readWayglassHelmWyrdrune();
 assert.equal(helm.source,WAYGLASS_HELM_WTL);
 assert.equal(helm.material,'opaline');
 assert.equal(helm.nodes.find(x=>x.kind==='heading')?.text,'WAYGLASS');
 assert.ok(helm.nodes.some(x=>x.action==='feather'));
 assert.ok(helm.nodes.some(x=>x.action==='open-writing'));
 assert.ok(helm.nodes.some(x=>x.action==='open-codex'));
 assert.equal(WAYGLASS_HELM_IR.epistemic_register,'local-explicit-WTL-subset');
 assert.equal(helm.author,'wayglass-native-ship');
});
