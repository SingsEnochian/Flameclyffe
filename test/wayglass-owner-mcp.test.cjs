'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {respond}=require('../lib/wayglass-owner-mcp.cjs');
function call(name,args){return respond({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}});}
test('MCP announces only read-only inspection tools',()=>{
 const response=respond({jsonrpc:'2.0',id:1,method:'tools/list'});
 assert.deepEqual(response.result.tools.map(x=>x.name),['wayglass_inspect_gate','wayglass_inspect_continuation','wayglass_inspect_route']);
});
test('world passage inspection does not grant authority',()=>{
 const result=JSON.parse(call('wayglass_inspect_gate',{waygate_id:'rarity',world_id:'wayglass:home'}).result.content[0].text);
 assert.equal(result.grants_authority,false);
 assert.equal(result.mutates_canon,false);
});
test('invalid continuation is refused and unknown calls fail closed',()=>{
 const packet=call('wayglass_inspect_continuation',{packet:{}});
 assert.equal(JSON.parse(packet.result.content[0].text).can_restore_context,false);
 assert.equal(call('wayglass_delete_world',{}).result.isError,true);
});
test('unknown MCP method is rejected',()=>{
 assert.equal(respond({jsonrpc:'2.0',id:1,method:'admin/override'}).error.code,-32601);
});
