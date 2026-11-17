import test from 'node:test';
import assert from 'node:assert/strict';
import {mountWayglassWorldDeck} from '../src/surfaces/world-deck.js';
class Element{constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.listeners={};this.attributes={};}setAttribute(k,v){this.attributes[k]=v;}addEventListener(k,fn){this.listeners[k]=fn;}removeEventListener(k){delete this.listeners[k];}append(...items){this.children.push(...items);}replaceChildren(...items){this.children=items;}click(){this.listeners.click?.();}}
const doc={createElement(tag){return new Element(tag,doc);}};
test('native Wayglass world deck opens rooms without ArcSweep and disposes observer',async()=>{
 const root=new Element('main',doc),calls=[];let unsubscribed=false;
 const cleanup=mountWayglassWorldDeck(root,{listRooms:()=>[{surface_id:'wayglass:writing-room',label:'Writing',mount:()=>{}},{surface_id:'arcsweep:deck',label:'Legacy',mount:()=>{}}],readRoute:()=>null,subscribe:()=>()=>{unsubscribed=true;},navigate:id=>calls.push(id),sound:{feather:()=>calls.push('feather')},worldStore:()=>({read:()=>null,save:()=>({saved_at:'test'})})});
 const section=root.children[0],nav=section.children.find(x=>x.tagName==='nav');
 assert.equal(nav.children.length,1);assert.equal(nav.children[0].dataset.room,'wayglass:writing-room');
 nav.children[0].click();await Promise.resolve();assert.deepEqual(calls,['wayglass:writing-room']);
 section.children.find(x=>x.tagName==='button').click();assert.deepEqual(calls,['wayglass:writing-room','feather']);
 cleanup();assert.equal(unsubscribed,true);
});
