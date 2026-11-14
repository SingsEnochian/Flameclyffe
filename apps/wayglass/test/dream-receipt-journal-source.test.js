import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';

test('Dreaming journal revocation checks are parseable JavaScript',async()=>{
 const source=await readFile(join(dirname(fileURLToPath(import.meta.url)),'../src/dream-receipt-journal.js'),'utf8');
 // Regression: an earlier GitHub edit accidentally inserted literal backslash-n
 // tokens into JavaScript statements, disabling the entire Dreaming journal.
 assert.equal(source.includes('\\\\n  if('),false);
 const module=await import('../src/dream-receipt-journal.js');
 assert.equal(typeof module.createDreamReceiptJournal,'function');
});
