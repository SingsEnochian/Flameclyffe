import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistry } from '../scripts/verify-wayglass-shield-inventory.mjs';

const valid = {schema:'wayglass.capability-registry/v1',policy:'default-deny',entries:[{
id:'test',path:'test',purpose:'test',execution:'runtime',network:'none',risk:'high',authority:'owner',permissions:'scoped',review:'required',rollback:'restore',data:[]
}]};
test('valid inventory shape passes',()=>assert.deepEqual(validateRegistry(valid),[]));
test('unknown policy fails',()=>assert.ok(validateRegistry({...valid,policy:'allow'}).length));
test('duplicate IDs fail',()=>assert.ok(validateRegistry({...valid,entries:[valid.entries[0],valid.entries[0]]}).some(x=>x.includes('duplicate'))));
test('unbounded permission fails',()=>assert.ok(validateRegistry({...valid,entries:[{...valid.entries[0],permissions:'*'}]}).some(x=>x.includes('unbounded'))));
