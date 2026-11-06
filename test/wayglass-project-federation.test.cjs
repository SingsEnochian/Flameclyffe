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

test('rejects ambiguous, absolute and drive-qualified project roots',()=>{
 const base={id:'sample',mode:'native',role:'test'};
 for(const root of ['', ' ', '.', './apps/wayglass', 'apps//wayglass', 'apps/./wayglass', 'apps/../secrets', '/etc/passwd', 'C:/secrets', 'C:\\secrets', 'apps\\wayglass']){
  const errors=inspectProjectFederation({schema:'wayglass.project-federation/v1',projects:[{...base,root}]});
  assert.ok(errors.includes('unsafe root'),`expected unsafe root rejection for ${JSON.stringify(root)}`);
 }
 assert.deepEqual(inspectProjectFederation({schema:'wayglass.project-federation/v1',projects:[{...base,root:'apps/wayglass'}]}),[]);
});

test('public federation serialization never exposes manifest paths or authority capabilities',()=>{
 const catalog=publicProjectFederation();
 const encoded=JSON.stringify(catalog);
 assert.deepEqual(Object.keys(catalog).sort(),['authority_grant','projects','schema','status']);
 assert.equal(catalog.status,'declared-not-runtime-mounted');
 assert.equal(catalog.authority_grant,false);
 for(const project of catalog.projects){
  assert.deepEqual(Object.keys(project).sort(),['id','mode','mounted','role']);
  assert.equal(project.mounted,false);
 }
 for(const forbidden of ['"root"','"credentials"','"token"','"permissions"','"access"','"mayExecute"']){
  assert.equal(encoded.includes(forbidden),false,`unexpected privileged field: ${forbidden}`);
 }
});

test('malformed federation entries and duplicate identities reject without throwing',()=>{
 const valid={id:'sample',root:'apps/wayglass',mode:'native',role:'test'};
 for(const entry of [null,false,42,'sample',{}, {...valid,id:'Bad ID'}, {...valid,mode:''}, {...valid,role:'  '}]){
  const manifest={schema:'wayglass.project-federation/v1',projects:[entry]};
  assert.doesNotThrow(()=>inspectProjectFederation(manifest));
  assert.notDeepEqual(inspectProjectFederation(manifest),[],`accepted malformed entry: ${JSON.stringify(entry)}`);
 }
 assert.ok(inspectProjectFederation({schema:'wayglass.project-federation/v1',projects:[valid,{...valid}]}).includes('duplicate id'));
});
