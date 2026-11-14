'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
test('deployed Supabase review domain module matches the shared Wayglass pure code byte-for-byte',()=>{
  const root=path.resolve(__dirname,'../..');
  const shared=fs.readFileSync(path.join(root,'lib/wayglass-review-domain.mjs'),'utf8');
  const edge=fs.readFileSync(path.join(root,'supabase/functions/wayglass-authorized-crossing/review-domain.mjs'),'utf8');
  assert.equal(edge,shared);
  assert.ok(!edge.includes('Deno.env.get('),'domain module must not read secrets or environment');
});
