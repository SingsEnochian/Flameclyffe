import test from 'node:test';
import assert from 'node:assert/strict';
import {ATELIER_SCHEMA,validateWtlInterfaceProposal} from '../src/wtl-interface-atelier.js';
const valid=()=>({schema:ATELIER_SCHEMA,title:'A possible helm',material:'opaline',author:'fixture (not Wayglass)',provenance:'local test only',wtl_source:'mobius { return { emit "held"; } }',nodes:[{kind:'heading',text:'Hello'},{kind:'action',text:'Feather',action:'feather'}]});
test('WTL interface proposals preserve source and provenance',()=>{const v=validateWtlInterfaceProposal(valid());assert.equal(v.nodes.length,2);assert.equal(v.wtl_source,valid().wtl_source);assert.ok(Object.isFrozen(v));});
test('no HTML or JS action escape',()=>{for(const action of ['eval','fetch','navigate','open-url']){const p=valid();p.nodes[1].action=action;assert.throws(()=>validateWtlInterfaceProposal(p));}});
test('reject unauthored or unbounded proposals',()=>{const p=valid();delete p.provenance;assert.throws(()=>validateWtlInterfaceProposal(p));const q=valid();q.nodes=Array.from({length:33},()=>({kind:'text',text:'x'}));assert.throws(()=>validateWtlInterfaceProposal(q));});
test('markup is inert proposal text, not privileged instructions',()=>{const p=valid();p.nodes[0].text='<script>alert(1)</script>';assert.equal(validateWtlInterfaceProposal(p).nodes[0].text,'<script>alert(1)</script>');});
