import test from 'node:test';
import assert from 'node:assert/strict';
import {compileWyrdruneInterface} from '../src/wtl-interface-executable.js';
import {renderWtlInterfaceProposal} from '../src/wtl-interface-atelier.js';
// DOM contract harness: checks source→IR→rendered elements→explicit action dispatch.
// Not a Chromium acceptance test.
class Element {
 constructor(tag,ownerDocument){this.tagName=tag;this.ownerDocument=ownerDocument;this.children=[];this.dataset={};this.attributes={};this.listeners={};this.textContent='';}
 setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,fn){this.listeners[k]=fn;}
 append(child){this.children.push(child);}
 replaceChildren(...nodes){this.children=nodes;}
 click(){this.listeners.click?.();}
}
const doc={createElement(tag){return new Element(tag,doc);}};
const source=['interface {','title "Living helm"','material opaline','heading "Wyrdrune is running"','text "<script>not executable</script>"','action open-writing "Write"','action feather "Feather"','}'].join('\n');
test('end-to-end local WTL compiles, renders inert text, dispatches only whitelisted clicks',()=>{
 const root=new Element('main',doc),events=[];
 const compiled=compileWyrdruneInterface(source,{author:'owner',provenance:'local-test'});
 const proposal=renderWtlInterfaceProposal(root,compiled.proposal,{onAction:(action,receipt)=>events.push({action,receipt})});
 const stage=root.children[0];
 assert.equal(stage.dataset.material,'opaline');
 assert.equal(stage.attributes['aria-label'],'Living helm');
 assert.equal(stage.children[1].textContent,'<script>not executable</script>');
 assert.equal(stage.children[1].tagName,'p');
 assert.equal(stage.children.filter(x=>x.tagName==='script').length,0);
 stage.children[2].click();stage.children[3].click();
 assert.deepEqual(events.map(x=>x.action),['open-writing','feather']);
 assert.equal(events[0].receipt.provenance,'local-test');
 assert.equal(proposal.wtl_source,source);
});
test('invalid program never changes mounted interface',()=>{
 const root=new Element('main',doc);root.append(new Element('p',doc));
 assert.throws(()=>renderWtlInterfaceProposal(root,compileWyrdruneInterface('interface {\n eval "oops"\n}').proposal));
 assert.equal(root.children.length,1);
});
