import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mountWayglassCellGarden} from '../src/surfaces/cell-garden.js';

class Element {
 constructor(name,doc){
  this.tagName=name;this.ownerDocument=doc;this.children=[];this.dataset={};
  this.attributes={};this.listeners={};this.value='';this.disabled=false;this.textContent='';
 }
 append(...children){this.children.push(...children);}
 replaceChildren(...children){
  this.children=children;
  if(this.tagName==='select')this.value=children[0]?.value??'';
 }
 setAttribute(key,value){this.attributes[key]=value;}
 addEventListener(name,listener){this.listeners[name]=listener;}
 removeEventListener(name){delete this.listeners[name];}
}
const doc={createElement(name){return new Element(name,doc);}};
const next=()=>new Promise(resolve=>setImmediate(resolve));
const click=(section,action)=>section.listeners.click({
 target:{closest:()=>({dataset:{cellAction:action}})}
});
const founder={
 cell_id:'cell:origin',parent_id:null,generation:0,
 status:'active',twist:{orientation:1,phase:0},capabilities:[],
};
const offspring=[
 {cell_id:'cell:child-a',parent_id:'cell:origin',generation:1,status:'active',twist:{orientation:1,phase:1}},
 {cell_id:'cell:child-b',parent_id:'cell:origin',generation:1,status:'active',twist:{orientation:-1,phase:2}},
];

test('native Cell Garden previews before explicit commit and never invokes a provider',async()=>{
 let culture={schema:'wayglass.cell-mitosis/v0.1',status:'ready',revision:0,cells:[founder]};
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,body:options.body?JSON.parse(options.body):null});
  if(url.endsWith('/preview'))return {ok:true,json:async()=>({
   proposal_id:'wce1:proposal',parent_id:'cell:origin',expected_revision:0,
   daughters:offspring,wtl:{phase_receipts:['perceive','compress','release','verify','integrate','choose','return','transcend'].map(phase=>({phase})),checkpoint_digest:'wce1:123456789abcdef'}
  })};
  if(url.endsWith('/commit')){
   assert.equal(JSON.parse(options.body).owner_confirmed,true);
   culture={...culture,revision:1,cells:[{...founder,status:'divided'},...offspring]};
   return {ok:true,json:async()=>({culture,receipt:{status:'committed-in-memory'}})};
  }
  return {ok:true,json:async()=>culture};
 };
 const scope={addEventListener(){},removeEventListener(){}};
 const sound={snapshot:()=>({feather_stopped:false}),feather(){},releaseFeather(){}};
 const root=new Element('main',doc);
 const dispose=mountWayglassCellGarden(root,{fetchImpl,scope,sound});
 await next();
 assert.deepEqual(calls.map(x=>x.method),['GET']);
 const section=root.children[0],controls=section.children[1];
 assert.equal(controls.children[2].disabled,true,'Commit disabled until proposal');
 click(section,'preview');await next();
 assert.deepEqual(calls.map(x=>x.method),['GET','POST']);
 assert.equal(calls[1].url.endsWith('/preview'),true);
 assert.equal(controls.children[2].disabled,false);
 click(section,'commit');await next();
 assert.equal(calls.at(-1).url.endsWith('/commit'),true);
 assert.equal(culture.revision,1);
 assert.equal(section.children[3].children[1].children.length,3);
 assert.equal(controls.children[2].disabled,true);
 dispose();
 assert.equal(section.listeners.click,undefined);
});
