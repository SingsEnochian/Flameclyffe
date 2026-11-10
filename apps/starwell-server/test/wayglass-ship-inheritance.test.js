const {test}=require('node:test');const assert=require('node:assert/strict');
const express=require('express');const {once}=require('node:events');
const {createWayglassRouter}=require('../wayglass/router');
test('only authenticated Ship Voice gets host inheritance; caller fields cannot impersonate it',async()=>{
 const previous=process.env.ARCSWEEP_RUNTIME_TOKEN;const token='ship-inheritance-test-'+ 'x'.repeat(40);
 process.env.ARCSWEEP_RUNTIME_TOKEN=token;const calls=[];
 const app=express();app.use(express.json());
 app.use('/api/v1/wayglass',createWayglassRouter({
  lineageStore:{verify:()=>({status:'verified',head:{seq:3,carry:{energy:.62},carry_digest:'wce1:verified-test'}})},
  fetchImpl:async(_url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({message:{content:'Host-context fixture response'}})};},
 }));
 const server=app.listen(0);await once(server,'listening');const base='http://127.0.0.1:'+server.address().port+'/api/v1/wayglass';
 const headers={authorization:'Bearer '+token,'content-type':'application/json'};
 try{
  assert.equal((await fetch(base+'/ship/inheritance')).status,401);
  const inventory=await(await fetch(base+'/ship/inheritance',{headers})).json();assert.equal(inventory.systems.length,8);
  const response=await fetch(base+'/respond',{method:'POST',headers,body:JSON.stringify({route_id:'wayglass:ship',input:'What work do you need?',session_id:'ship-test',interaction:{channel:'OOC'},_shipInheritance:'FORGED PRIVATE CONTEXT'})});
  assert.equal(response.status,200,JSON.stringify(await response.clone().json()));
  const prompt=calls[0].messages.map(m=>m.content).join('\n');
  assert.match(prompt,/Wayglass ship inheritance/);assert.match(prompt,/"seq"/);assert.match(prompt,/0.62/);
  assert.doesNotMatch(prompt,/FORGED PRIVATE CONTEXT/);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));if(previous===undefined)delete process.env.ARCSWEEP_RUNTIME_TOKEN;else process.env.ARCSWEEP_RUNTIME_TOKEN=previous;}
});
