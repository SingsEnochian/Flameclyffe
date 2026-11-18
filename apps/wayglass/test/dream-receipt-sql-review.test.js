import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../../../docs/wayglass/DREAMING_RECEIPT_SQL_REVIEW_ONLY.sql',import.meta.url),'utf8');
test('review-only SQL has one complete transaction and one definition per RPC',()=>{
 assert.equal((sql.match(/^begin;$/gm)||[]).length,1);
 assert.equal((sql.match(/^commit;$/gm)||[]).length,1);
 assert.equal((sql.match(/create or replace function public\.wayglass_dream_receipt_append_v1/g)||[]).length,1);
 assert.equal((sql.match(/create or replace function public\.wayglass_dream_receipt_read_v1/g)||[]).length,1);
 assert.equal((sql.match(/\bas \$\$/g)||[]).length,2);
 assert.equal((sql.match(/end \$\$;/g)||[]).length,2);
 assert.match(sql,/UNRESOLVED, BLOCKS DEPLOYMENT/);
 assert.match(sql,/revocation can race/);
});
test('SQL uses invoker permissions and no anonymous access',()=>{
 assert.equal((sql.match(/security invoker/g)||[]).length,2);
 assert.doesNotMatch(sql,/security definer/i);
 assert.match(sql,/enable row level security/g);
 assert.match(sql,/owner_uid = \(select auth\.uid\(\)\)/);
 assert.match(sql,/revoke all on function public\.wayglass_dream_receipt_append_v1/);
});
