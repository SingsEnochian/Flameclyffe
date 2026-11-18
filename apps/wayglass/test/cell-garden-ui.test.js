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


test('Garden UI keeps acoustic exchange opt-in and proposes a hybrid without replacing parents',async()=>{
 let starts=0,invoked=0;
 const first={...offspring[0],acoustic_address:2,specialisation:null,memory_refs:[]};
 const second={...offspring[1],acoustic_address:3,specialisation:null,memory_refs:[]};
 let culture={schema:'wayglass.cell-mitosis/v0.1',status:'ready',revision:1,
   cells:[{...founder,status:'divided',acoustic_address:1,memory_refs:[]},first,second],history:[]};
 const scope={addEventListener(){},removeEventListener(){},
   AudioContext:class {constructor(){starts++}},navigator:{mediaDevices:{getUserMedia(){invoked++}}}};
 const sound={snapshot:()=>({feather_stopped:false}),feather(){},releaseFeather(){}};
 const calls=[];
 const fetchImpl=async(url,options)=>{
  const body=options.body?JSON.parse(options.body):null;calls.push({url,body});
  let response=culture;
  if(url.endsWith('/specialise')){
   const current=culture.cells.find(c=>c.cell_id===body.cell_id);
   assert.equal(body.owner_confirmed,true);
   culture={...culture,revision:culture.revision+1,
     cells:culture.cells.map(c=>c===current?{...c,specialisation:body.role}:c)};
   response={culture,receipt:{status:'committed-in-memory'}};
  } else if(url.endsWith('/exchange')){
   assert.equal(body.receiver_route_approved,true);
   const receipt={schema:'wayglass.cell-exchange/v0.1',status:'delivered-in-memory',
     from_id:body.from_id,to_id:body.to_id,message:body.message,
     wtl:{source_hash:'a'.repeat(64)},acoustic:{playback_started:false}};
   culture={...culture,revision:culture.revision+1,history:[...culture.history,receipt]};
   response={culture,receipt};
  }else if(url.endsWith('/fusion/preview')){
   response={status:'proposed-not-committed',proposal_id:'fusion-fixture',
     expected_revision:culture.revision,parent_ids:[first.cell_id,second.cell_id],
     candidate:{cell_id:'cell:hybrid'}};
  }else if(url.endsWith('/fusion/commit')){
   assert.equal(body.owner_confirmed,true);
   culture={...culture,revision:culture.revision+1,
     cells:[...culture.cells,{cell_id:'cell:hybrid',parent_ids:[first.cell_id,second.cell_id],
       generation:2,status:'active',specialisation:'hybrid',
       twist:{orientation:1,phase:3},acoustic_address:4,memory_refs:[]}]};
   response={culture,receipt:{status:'committed-in-memory'}};
  }
  return {ok:true,json:async()=>response};
 };
 const root=new Element('main',doc);
 const off=mountWayglassCellGarden(root,{fetchImpl,scope,sound});
 await next();
 const section=root.children[0],select=section.children[1].children[0].children[0];
 const ecology=section.children[5];
 const role=ecology.children[2].children[0].children[0];
 assert.equal(select.value,first.cell_id);
 click(section,'specialise');await next();
 assert.equal(culture.cells[1].specialisation,'resonance');
 select.value=second.cell_id;role.value='observation';
 click(section,'specialise');await next();
 assert.equal(culture.cells[2].specialisation,'observation');
 const from=ecology.children[3].children[0].children[0];
 const to=ecology.children[3].children[1].children[0];
 const observation=ecology.children[4].children[0].children[0];
 const permission=ecology.children[4].children[1].children[0];
 const send=ecology.children[4].children[2];
 assert.equal(from.value,first.cell_id);
 assert.equal(to.value,second.cell_id);
 observation.value='different things, shared provenance';
 section.listeners.input();
 assert.equal(send.disabled,true,'no silent receiver opt-in');
 permission.checked=true;section.listeners.change();
 assert.equal(send.disabled,false);
 click(section,'exchange');await next();
 assert.equal(calls.at(-1).url.endsWith('/exchange'),true);
 assert.equal(permission.checked,false,'new exchange requires new consent');
 assert.equal(culture.history.length,1);
 assert.equal(starts,0,'sound never autoplays');
 assert.equal(invoked,0,'microphone never starts');
 const propose=ecology.children[8].children[0];
 assert.equal(propose.disabled,false);
 click(section,'fusion-preview');await next();
 assert.equal(culture.cells.length,3,'fusion preview does not add a new cell');
 const commit=ecology.children[8].children[1];
 assert.equal(commit.disabled,false);
 click(section,'fusion-commit');await next();
 assert.equal(culture.cells.length,4);
 assert.equal(culture.cells[1].status,'active');
 assert.equal(culture.cells[2].status,'active');
 assert.equal(starts,0);
 off();
});
