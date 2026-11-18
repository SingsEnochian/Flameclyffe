import test from 'node:test';
import assert from 'node:assert/strict';
import {projectResonance} from '../src/resonance-bridge.js';
const args={resonance:{id:'opal-current',tones:[{frequency_hz:220,gain:.03,duration_s:1,pan:0}],visual:{colour:'#aabbcc',glyph:'◇'},motion:{curl:.4,pulse:.3}},revision:2,source:{participant_id:'wayglass',route_id:'wayglass:ship',receipt_id:'r1'}};
test('projects WTL, visual, Observer and Return without silent audio',()=>{const r=projectResonance(args);assert.deepEqual(r.projections.map(p=>p.lane),['wyrdrune','sensory','observer','return']);assert.equal(r.status,'projection-only')});
test('opt-in enables audio and haptic intent',()=>{const r=projectResonance({...args,audioOptIn:true,hapticsOptIn:true});assert.equal(r.projections.filter(p=>p.kind==='audio').length,1);assert.equal(r.projections.filter(p=>p.kind==='haptic-intent').length,1)});
test('Feather prevents all projection',()=>{assert.deepEqual(projectResonance({...args,feather:true}).projections,[])});
test('missing source or unsafe amplitude fails closed',()=>{assert.throws(()=>projectResonance({...args,source:null}));assert.throws(()=>projectResonance({...args,resonance:{...args.resonance,tones:[{frequency_hz:220,gain:1,duration_s:1,pan:0}]}}))});
