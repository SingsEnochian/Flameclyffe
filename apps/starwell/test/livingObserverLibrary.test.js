import test from 'node:test';
import assert from 'node:assert/strict';
import {LIBRARY_SCHEMA,parseLibraryManifest} from '../../../starwell/deep-observer/living-observer-library.js';

const fixture=(books)=>JSON.stringify({schema:LIBRARY_SCHEMA,books});
const one={
  source_id:'local-agrippa',title:'De Occulta Philosophia II',
  author:'Agrippa',subject:'numerology',source_type:'drive-metadata',
  read_status:'metadata-only',source_url:'https://drive.google.com/file/d/123456/view',
  note:'A locally chosen bibliographical description',
};
test('an opt-in local book manifest keeps title, lens, source and original link',()=>{
 const m=parseLibraryManifest(fixture([one]));
 assert.equal(m.schema,LIBRARY_SCHEMA);
 assert.equal(m.book_count,1);
 assert.equal(m.books[0].subject,'numerology');
 assert.equal(m.books[0].read_status,'metadata-only');
 assert.equal(m.private_context,true);
 assert.equal(m.direct_content_access,false);
 assert.match(m.books[0].authority,/not astronomical measurement/);
});
test('rejects remote javascript, HTTP links and non-Drive hosts',()=>{
 for (const url of ['javascript:alert(1)','http://drive.google.com/file/d/1/view','https://evil.example.com/x']){
   assert.throws(()=>parseLibraryManifest(fixture([{...one,source_url:url}])),/only original Google Drive/);
 }
});
test('declared reader status cannot forge excerpt review',()=>{
 const m=parseLibraryManifest(fixture([{...one,read_status:'read-in-full'}]));
 assert.equal(m.books[0].read_status,'metadata-only');
});
test('does not silently accept a mismatched schema, duplicate ids or unbounded text',()=>{
 assert.throws(()=>parseLibraryManifest(JSON.stringify({schema:'other',books:[]})),/unsupported schema/);
 assert.throws(()=>parseLibraryManifest(fixture([one,one])),/distinct/);
 assert.throws(()=>parseLibraryManifest(fixture([{...one,note:'x'.repeat(1000)}])),/bounded note/);
});
