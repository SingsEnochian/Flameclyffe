import test from 'node:test';
import assert from 'node:assert/strict';
import {ENVIRONMENT_SCHEMA,validateShipEnvironment,resolveShipEnvironment,authorizeEnvironmentChange,visitorEnvironmentAction} from '../src/ship-environment.js';
const change={schema:ENVIRONMENT_SCHEMA,actor:{participant_id:'wayglass',route_id:'wayglass:ship'},revision:1,rooms:{'*':{lighting:'#aabbcc',fluid:'gentle'},'wayglass:living-watercolor':{fluid:'curling'}}};
test('shipwide defaults and room-specific composition',()=>{
 const result=validateShipEnvironment(change,{surfaceIds:['wayglass:living-watercolor']});
 assert.equal(resolveShipEnvironment(result,'wayglass:living-watercolor').fluid,'curling');
 assert.equal(resolveShipEnvironment(result,'wayglass:universal-codex').lighting,'#aabbcc');
 assert.notEqual(result,change);
});
test('unregistered rooms, arbitrary channels and impersonation fail',()=>{
 assert.throws(()=>validateShipEnvironment({...change,rooms:{'fake:room':{lighting:'gold'}}},{surfaceIds:[]}));
 assert.throws(()=>validateShipEnvironment({...change,rooms:{'*':{execute:'rm -rf /'}}}));
 assert.throws(()=>validateShipEnvironment({...change,actor:{participant_id:'rowan',route_id:'wayglass:ship'}}));
});
test('host attribution, revision and Feather govern authorship',()=>{
 const base={actor:change.actor,verifiedHost:true,expectedRevision:1,currentRevision:1};
 assert.equal(authorizeEnvironmentChange(base).allowed,true);
 assert.equal(authorizeEnvironmentChange({...base,verifiedHost:false}).allowed,false);
 assert.equal(authorizeEnvironmentChange({...base,expectedRevision:0}).reason,'stale-revision');
 assert.equal(authorizeEnvironmentChange({...base,feather:true}).reason,'feather');
 assert.equal(authorizeEnvironmentChange({...base,actor:{participant_id:'visitor',route_id:'wayglass:ship'}}).allowed,false);
});
test('visitors navigate and suggest but cannot author materials',()=>{
 assert.equal(visitorEnvironmentAction('orbit'),true);
 assert.equal(visitorEnvironmentAction('suggest'),true);
 assert.equal(visitorEnvironmentAction('feather'),true);
 assert.equal(visitorEnvironmentAction('set-lighting'),false);
});
