import {test} from 'node:test';
import assert from 'node:assert/strict';
import {allowedWayglassPath,createTailnetGate,TAILNET_GATE_PORT,HOST_PORT} from '../../../scripts/wayglass-tailnet-gate.mjs';

test('remote gateway admits only Wayglass and House sign-in paths',()=>{
 for(const path of ['/wayglass/','/wayglass/assets/main.js','/api/v1/wayglass/healthz','/api/v1/house/session']){
  assert.equal(allowedWayglassPath(path),true,path);
 }
 for(const path of ['/api/boxfire/status','/mcp','/api/v1/chat','/api/v1/flames',
  '//evil.example/wayglass/','/wayglass/%2e%2e/api/boxfire/status','http://evil.example/wayglass/',
  '/wayglass\\api/boxfire','/wayglass%0d%0aevil']){
  assert.equal(allowedWayglassPath(path),false,path);
 }
});
test('gateway only binds loopback and uses a dedicated port',()=>{
 assert.equal(HOST_PORT,3000);
 assert.equal(TAILNET_GATE_PORT,32861);
 const gate=createTailnetGate({port:32862});
 assert.equal(typeof gate.listen,'function');
 assert.equal(typeof gate.close,'function');
});
