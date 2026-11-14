'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {verify}=require('../scripts/verify-wayglass-pr-preflight.cjs');
const root=path.resolve(__dirname,'..');
const headRef='rarity/wayglass-eightfold-build-preflight-20261114';
const manifest='.wayglass/preflights/rarity-wayglass-eightfold-build-preflight-20261114.json';
test('requires branch-specific manifest when Wayglass code changes',()=>{
 assert.match(verify({root,headRef,changed:['apps/wayglass/src/main.js']})[0],/Missing PR-specific/);
});
test('rejects a manifest that does not cover changed systems',()=>{
 const errors=verify({root,headRef,changed:[manifest,'apps/wayglass/src/main.js']});
 assert.ok(errors.some(e=>e.includes('changed_systems')));
});
test('valid branch-specific manifest covers the preflight workflow',()=>{
 assert.deepEqual(verify({root,headRef,changed:[manifest,'.github/workflows/wayglass-architecture-preflight.yml','scripts/wayglass-build-preflight.cjs','scripts/verify-wayglass-pr-preflight.cjs']}),[]);
});
test('unrelated changes do not require Wayglass preflight',()=>{
 assert.deepEqual(verify({root,headRef,changed:['README.md']}),[]);
});

test('requires shipwide FAEberpunk matrix even for backend-only changes',()=>{
 const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'wg-preflight-'));
 try{
   const rel='.wayglass/preflights/'+headRef.replace(/[^a-zA-Z0-9._-]+/g,'-')+'.json';
   const target=path.join(tmp,rel);
   fs.mkdirSync(path.dirname(target),{recursive:true});
   const plan=JSON.parse(fs.readFileSync(path.join(root,manifest),'utf8'));
   delete plan.faeberpunk;
   plan.existing_evidence=['WAYGLASS_CURRENT.md'];
   fs.writeFileSync(target,JSON.stringify(plan));
   fs.copyFileSync(path.join(root,'WAYGLASS_CURRENT.md'),path.join(tmp,'WAYGLASS_CURRENT.md'));
   const errors=verify({root:tmp,headRef,changed:[rel,'apps/starwell-server/wayglass/mcp-bridge.js']});
   assert.ok(errors.some(e=>e.includes('faeberpunk')));
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
