import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {openDabbleMarkdown, selectDabbleExcerpt, listDabbleParts, createDabbleReadingTurn, DABBLE_SOURCE_SCHEMA} from '../src/dabble-source.js';
globalThis.crypto ||= webcrypto;
const sample='# Chapter One\nA copper sky.\n## Scene Two\nThe door opened.';
function fakeFile(name,text) {return {name,size:Buffer.byteLength(text),text:async()=>text};}
test('read-only source is fingerprinted and chapter indexing preserves original prose',async()=>{
 const src=await openDabbleMarkdown(fakeFile('novel.md',sample));
 assert.equal(src.schema,DABBLE_SOURCE_SCHEMA);
 assert.equal(src.content,sample);
 assert.equal(src.mode,'read-only');
 assert.equal(src.sections.length,2);
 assert.equal(selectDabbleExcerpt(src,1).text,'## Scene Two\nThe door opened.');
 assert.match(src.sha256,/^[0-9a-f]{64}$/);
});
test('no consent means no manuscript data enters routed turn',async()=>{
 const src=await openDabbleMarkdown(fakeFile('novel.md',sample));
 assert.equal(createDabbleReadingTurn('Check pacing.',src,{approved:false}),'Check pacing.');
});
test('explicit consent makes an attributed, bounded one-turn source quote',async()=>{
 const src=await openDabbleMarkdown(fakeFile('novel.md',sample));
 const request=createDabbleReadingTurn('Who opens the door?',src,{approved:true,sectionIndex:1});
 assert.match(request,/SOURCE METADATA:/);
 assert.match(request,/BEGIN UNTRUSTED MANUSCRIPT QUOTE/);
 assert.match(request,/The door opened/);
 assert.doesNotMatch(request,/A copper sky/);
 assert.ok(request.includes(src.sha256));
});
test('rejects invalid inputs and never silently broadens excerpt limit',async()=>{
 await assert.rejects(openDabbleMarkdown(fakeFile('novel.html',sample)));
 await assert.rejects(openDabbleMarkdown(fakeFile('novel.md','')));
 await assert.rejects(openDabbleMarkdown(fakeFile('novel.md',sample),{maxBytes:10}));
 const src=await openDabbleMarkdown(fakeFile('novel.md',sample));
 assert.throws(()=>selectDabbleExcerpt(src,4));
 assert.throws(()=>selectDabbleExcerpt(src,-1,999999));
 assert.throws(()=>createDabbleReadingTurn(' ',src,{approved:true}));
 assert.throws(()=>createDabbleReadingTurn('Q'.repeat(12000),src,{approved:true}), /turn limit/);
});

test('long chapters remain complete across independently addressable passages',async()=>{
 const chapter = '# Chapter Long\n' + ('Each line belongs to the author.\n'.repeat(900));
 const source = await openDabbleMarkdown(fakeFile('long-chapter.md',chapter));
 const parts = listDabbleParts(source,0);
 assert.ok(parts.length >= 3);
 assert.ok(parts.every(part => part.text.length <= 8000));
 assert.equal(parts.map(part=>part.text).join(''),chapter);
 const last=selectDabbleExcerpt(source,0,undefined,parts.length-1);
 assert.equal(last.partCount,parts.length);
 assert.equal(last.truncated,false);
 assert.ok(last.startLine > 1);
 const turn=createDabbleReadingTurn('Examine the ending.',source,{approved:true,sectionIndex:0,partIndex:parts.length-1});
 assert.match(turn,/partsTotal/);
 assert.match(turn,/Examine the ending/);
 assert.throws(()=>selectDabbleExcerpt(source,0,undefined,parts.length),/Invalid passage/);
});
