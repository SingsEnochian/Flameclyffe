import test from 'node:test';
import assert from 'node:assert/strict';
import {RESONANCE_SCHEMA,validateResonance,resolveResonanceForRoom,resonancePlaybackAllowed} from '../src/resonance-forge.js';
const proposal={schema:RESONANCE_SCHEMA,id:'opal-current',name:'Opal Current',meaning:'A proposed visual and sonic motif',tones:[{frequency_hz:220,gain:.03,duration_s:1,pan:0}],visual:{colour:'#aabbcc',glyph:'◇'},motion:{curl:.4,pulse:.3},rooms:['*']};
test('ship may author a bounded resonance for every room',()=>{
 const r=validateResonance(proposal,{verifiedShipRoute:true});
 assert.equal(resolveResonanceForRoom(r,'wayglass:universal-codex').id,'opal-current');
 assert.notEqual(r,proposal);
});
test('caller assertion is not sufficient attribution',()=>{
 assert.throws(()=>validateResonance(proposal));
});
test('unbounded sound and unrecognised fields are refused',()=>{
 assert.throws(()=>validateResonance({...proposal,tones:[{frequency_hz:220,gain:1,duration_s:1,pan:0}]},{verifiedShipRoute:true}));
 assert.throws(()=>validateResonance({...proposal,execute:'script'},{verifiedShipRoute:true}));
});
test('sound requires opt in and Feather always silences',()=>{
 assert.equal(resonancePlaybackAllowed({audioOptIn:true}),true);
 assert.equal(resonancePlaybackAllowed({audioOptIn:true,feather:true}),false);
 assert.equal(resonancePlaybackAllowed({audioOptIn:false}),false);
});
