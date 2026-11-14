import test from 'node:test';
import assert from 'node:assert/strict';
import {indexMarkdown, importMarkdown, BRIDGE_SCHEMA} from '../dabble-import.mjs';
test('indexes headings without changing manuscript', async () => {
 const input = '# Chapter One\r\nHello <script>alert(1)</script>\r\n## Scene Two\r\nUnchanged.\r\n';
 const entry = await importMarkdown({name:'book.md',text:input});
 assert.equal(entry.schema,BRIDGE_SCHEMA);
 assert.equal(entry.content,input);
 assert.equal(entry.sections.length,2);
 assert.equal(entry.sections[1].line,3);
 assert.equal(entry.mode,'read-only');
 assert.equal(entry.authorisedWriteBack,false);
 assert.match(entry.sha256,/^[a-f0-9]{64}$/);
});
test('rejects unsupported, empty, oversized inputs', async () => {
 await assert.rejects(importMarkdown({name:'book.html',text:'hi'}));
 await assert.rejects(importMarkdown({name:'book.md',text:''}));
 await assert.rejects(importMarkdown({name:'book.md',text:'abc',maxBytes:2}));
});
test('handles heading-free prose', () => assert.deepEqual(indexMarkdown('A paragraph\nAnother.'),[]));
