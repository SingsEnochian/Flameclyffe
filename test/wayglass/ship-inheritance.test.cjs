const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {SYSTEMS,buildShipInheritance,readShipInheritance,shipInheritanceContext}=require('../../lib/wayglass-ship-inheritance.cjs');

test('whole ship inventory carries eight systems with independently hashed current sources',()=>{
 const root=path.resolve(__dirname,'../..'),value=buildShipInheritance(root);
 assert.equal(value.systems.length,8);
 assert.ok(value.systems.every(s=>s.sources.every(f=>f.status==='source-included'&&/^[a-f0-9]{64}$/.test(f.sha256))));
 assert.equal(value.autonomous_execution_enabled,false);
 assert.equal(value.runtime_verification,'pending');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ship-inheritance-'));
 try{
  const file=path.join(dir,'manifest.json');fs.writeFileSync(file,JSON.stringify(value));
  assert.deepEqual(readShipInheritance(file),value);
  value.systems[0].sources[0].sha256='missing';fs.writeFileSync(file,JSON.stringify(value));
  assert.equal(readShipInheritance(file).runtime_verification,'unavailable');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('unverified learning memory cannot be promoted into ship model continuity',()=>{
 const inventory=buildShipInheritance(path.resolve(__dirname,'../..'));
 const refused=shipInheritanceContext(inventory,{status:'refused',head:{carry:{private:'DO NOT IMPORT'}}});
 assert.doesNotMatch(refused,/DO NOT IMPORT/);
 const context=shipInheritanceContext(inventory,{status:'verified',head:{seq:2,carry:{energy:.5},carry_digest:'wce1:test'}});
 assert.match(context,/"seq":2/);assert.match(context,/"energy":0.5/);
 for(const s of SYSTEMS)assert.match(context,new RegExp('"id":"'+s.id+'"'));
 assert.match(context,/proposal is not an executed action/);
});
