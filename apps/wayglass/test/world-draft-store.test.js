import test from 'node:test';
import assert from 'node:assert/strict';
import {createWayglassWorldDraftStore,WORLD_DRAFT_KEY} from '../src/world-draft-store.js';
test('native world draft saves and restores without overwriting corrupt existing data',()=>{
 const values=new Map(),storage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};
 const store=createWayglassWorldDraftStore({storage});
 assert.equal(store.read(),null);
 const saved=store.save({title:'Terra Prime',notes:'The heart awakens'});
 assert.equal(saved.schema,WORLD_DRAFT_KEY);
 assert.equal(store.read().notes,'The heart awakens');
 const prior=values.get(WORLD_DRAFT_KEY);
 assert.throws(()=>store.save({title:' ',notes:'bad'}));assert.equal(values.get(WORLD_DRAFT_KEY),prior);
 values.set(WORLD_DRAFT_KEY,'{broken');
 assert.throws(()=>store.read(),/unreadable/);
 assert.equal(values.get(WORLD_DRAFT_KEY),'{broken');
});
