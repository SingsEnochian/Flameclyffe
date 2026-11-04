const test=require('node:test');const assert=require('node:assert/strict');
const {inspectProjectFederation,publicProjectFederation}=require('../lib/wayglass-project-federation.cjs');
test('project federation manifest validates',()=>assert.deepEqual(inspectProjectFederation(require('../security/wayglass-project-federation.json')),[]));
test('published project catalog cannot grant authority or pretend to mount',()=>{const result=publicProjectFederation();assert.equal(result.authority_grant,false);assert.ok(result.projects.length>=8);assert.ok(result.projects.every(p=>p.mounted===false&&!('root' in p)&&!('access' in p)));});
test('rejects traversal and unknown mode',()=>assert.ok(inspectProjectFederation({schema:'wayglass.project-federation/v1',projects:[{id:'bad',root:'../secrets',mode:'unknown',role:'x'}]}).length>=2));

test('malformed project collections fail closed without throwing',()=>{
 for(const projects of [null,{},'not-an-array',42,true]){
  assert.doesNotThrow(()=>inspectProjectFederation({schema:'wayglass.project-federation/v1',projects}));
  assert.ok(inspectProjectFederation({schema:'wayglass.project-federation/v1',projects}).includes('projects'));
 }
});
