import test from 'node:test';
import assert from 'node:assert/strict';
import {mountNurseryLanguagePanel} from '../src/surfaces/nursery-language.js';

class Element {
  constructor(tagName,doc){
    this.tagName=tagName;this.ownerDocument=doc;this.children=[];
    this.listeners={};this.attributes={};this.dataset={};this.value='';
    this.disabled=false;this.hidden=false;this.textContent='';
  }
  append(...parts){this.children.push(...parts);}
  replaceChildren(...parts){this.children=parts;}
  addEventListener(event,callback){this.listeners[event]=callback;}
  removeEventListener(event){delete this.listeners[event];}
  setAttribute(name,value){this.attributes[name]=value;}
  focus(){this.focused=true;}
}
const doc={createElement(name){return new Element(name,doc);}};
const click=(panel,kind)=>panel.listeners.click({
  target:{closest:()=>({dataset:{nurseryAction:kind}})}
});
const example={generation:0,paused:false,cells:[],names:{},utterances:[],groundedUtterances:[]};

test('iPhone/iPad Nursery Steward sign-in uses existing House session, clears credentials and loads host state',async()=>{
  const calls=[],root=new Element('main',doc);
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    if(url==='/api/v1/house/session')return {
      ok:true,json:async()=>({connected:true,role:'steward'}),
    };
    if(url==='/api/v1/wayglass/cell-garden/nursery')return {
      ok:true,json:async()=>example,
    };
    throw new Error('Unexpected route '+url);
  };
  const off=mountNurseryLanguagePanel(root,{fetchImpl,scope:{addEventListener(){},removeEventListener(){}}});
  const panel=root.children[0],form=panel.children[3],field=form.children[0].children[0];
  assert.equal(form.hidden,true);
  click(panel,'signin');
  assert.equal(form.hidden,false);
  field.value='ephemeral-test-only';
  await form.listeners.submit({preventDefault(){}});
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'/api/v1/house/session');
  assert.equal(calls[0].options.method,'POST');
  assert.equal(calls[0].options.credentials,'same-origin');
  assert.deepEqual(JSON.parse(calls[0].options.body),{credential:'ephemeral-test-only'});
  assert.equal(calls[1].url,'/api/v1/wayglass/cell-garden/nursery');
  assert.equal(calls[1].options.method,'GET');
  assert.equal(field.value,'','password never persists after submit');
  assert.equal(form.hidden,true);
  assert.equal(panel.children[4].textContent,'Nursery host state verified.');
  off();
  assert.equal(field.value,'');
  assert.equal(form.listeners.submit,undefined);
});

test('a refused host session shows private sign-in without granting nursery execution',async()=>{
  const root=new Element('main',doc);
  const calls=[];
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    return {ok:false,status:401,json:async()=>({error:'House session required'})};
  };
  const off=mountNurseryLanguagePanel(root,{fetchImpl,scope:{addEventListener(){},removeEventListener(){}}});
  const panel=root.children[0],form=panel.children[3],field=form.children[0].children[0];
  click(panel,'observe');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(form.hidden,false);
  assert.match(panel.children[4].textContent,/House Steward sign-in required/);
  field.value='wrong-code';
  await form.listeners.submit({preventDefault(){}});
  assert.equal(field.value,'');
  assert.equal(form.hidden,false);
  assert.equal(calls.length,2);
  assert.equal(calls[1].url,'/api/v1/house/session');
  assert.equal(panel.children[2].children[1].disabled,true,'cannot advance without authenticated colony');
  off();
});
