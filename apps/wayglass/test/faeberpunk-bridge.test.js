import test from 'node:test';
import assert from 'node:assert/strict';
import { faeberpunkFrame, installFaeberpunkBridge } from '../src/faeberpunk-bridge.js';
class Events {
  listeners = new Map();
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, detail) { for (const fn of this.listeners.get(name) || []) fn({detail}); }
}
function element() {
  return { dataset:{}, properties:new Map(), children:[], hidden:false,
    style:{setProperty(k,v){this.parent.properties.set(k,v);},removeProperty(k){this.parent.properties.delete(k);}},
    setAttribute(){}, append(...children){this.children.push(...children);}, remove(){this.removed=true;} };
}
function fixture() {
  const scope=new Events(),preference=new Events(),root=element(),host=element(),plays=[];
  root.style.parent=root; preference.matches=false;scope.matchMedia=()=>preference;
  scope.document={createElement:()=>element()};
  const bridge=installFaeberpunkBridge({scope,root,inscriptionHost:host,soundscape:{play:kind=>plays.push(kind)}});
  return {scope,preference,root,host,plays,bridge};
}
test('material state is bounded and does not claim cognition or transport',()=>{
  const f=faeberpunkFrame({strength:100,intent:-4,mode:'handoff',canon_state:'verified'});
  assert.equal(f.mode,'handoff');assert.ok(f.light<=1);assert.equal(f.model_inference,false);
  assert.equal(f.observed_transport,false);assert.equal(f.canon_state,'verified');
});
test('one material signal coordinates light and pigment with still fallback',()=>{
  const f=fixture();f.scope.emit('wayglass:material-wake',{strength:.9,ownership:1,handoff_progress:.5,mode:'handoff'});
  assert.equal(f.root.dataset.wgFaeMode,'handoff');assert.equal(f.bridge.snapshot().phase,'active');
  assert.equal(f.bridge.snapshot().pigment,.8);assert.equal(f.plays.length,0);
  f.preference.matches=true;for(const fn of f.preference.listeners.get('change'))fn({matches:true});
  assert.equal(f.bridge.snapshot().transition_ms,0);assert.equal(f.root.dataset.wgFaePhase,'still');
  f.bridge.destroy();
});
test('Wyrdrune and English remain separate text, with no HTML interpolation or invented translation',()=>{
  const f=fixture();f.scope.emit('wayglass:wyrdrune-inscription',{wyrdrune:'ᚹ <script>',english:'Read <not execute>',owner_presentation_consent:true});
  assert.equal(f.host.children[0].children[0].textContent,'ᚹ <script>');
  assert.equal(f.host.children[0].children[1].textContent,'Read <not execute>');
  assert.equal(f.bridge.snapshot().inscription.english,'Read <not execute>');
  f.scope.emit('wayglass:wyrdrune-inscription',{wyrdrune:'ᚹ'});
  assert.equal(f.bridge.snapshot().inscription.english,'Read <not execute>');
  f.scope.emit('wayglass:wyrdrune-inscription',{clear:true});
  assert.equal(f.bridge.snapshot().inscription,null);assert.equal(f.host.children[0].hidden,true);f.bridge.destroy();
});
test('audio/haptics are never started by passive material signals; cues route only through opt-in soundscape',()=>{
  const f=fixture();f.scope.emit('wayglass:material-wake',{mode:'return'});assert.deepEqual(f.plays,[]);
  f.scope.emit('wayglass:faeberpunk-cue',{kind:'return'});assert.deepEqual(f.plays,['waygate:return']);
  f.scope.emit('wayglass:faeberpunk-cue',{kind:'unknown'});assert.equal(f.plays.length,1);f.bridge.destroy();
});
test('Feather blocks events; confirmed release remains at rest, no automatic sound',()=>{
  const f=fixture();f.scope.emit('wayglass:material-wake',{mode:'handoff'});
  f.scope.emit('wayglass:feather',{stopped:true});
  f.scope.emit('wayglass:faeberpunk-cue',{kind:'handoff'});
  f.scope.emit('wayglass:material-wake',{mode:'inscription'});
  assert.equal(f.bridge.snapshot().phase,'feather');assert.equal(f.plays.length,0);
  f.scope.emit('wayglass:feather',{stopped:false});assert.equal(f.bridge.snapshot().feather_stopped,true);
  f.scope.emit('wayglass:feather',{stopped:false,confirmed:true});
  assert.equal(f.bridge.snapshot().phase,'still');assert.equal(f.bridge.snapshot().mode,'rest');
  f.bridge.destroy();
});
test('destroy detaches all listeners and removes transient presentation state',()=>{
  const f=fixture();f.bridge.destroy();f.bridge.destroy();
  assert.equal(f.root.properties.size,0);assert.equal(Object.keys(f.root.dataset).length,0);
  assert.equal(f.host.children[0].removed,true);
  for(const listeners of f.scope.listeners.values())assert.equal(listeners.size,0);
  for(const listeners of f.preference.listeners.values())assert.equal(listeners.size,0);
});
