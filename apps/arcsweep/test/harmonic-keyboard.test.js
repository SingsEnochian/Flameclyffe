import assert from 'node:assert/strict';
import test from 'node:test';
import {KEY_LAYOUT,WORLD_ROOTS,GALDR_NOTES,keyboardWorld,keyboardNote,keyboardMidiNote,keyboardEvent} from '../harmonic-keyboard/keyboard-model.js';
import {keystrokeTone} from '../src/typing-sonification.js';
test('QWERTY piano is deterministic with 13 distinct note positions and one octave',()=>{
 assert.equal(KEY_LAYOUT.length,13);
 assert.equal(new Set(KEY_LAYOUT.map(x=>x.key)).size,13);
 const first=keyboardNote('a',{rootHz:220});
 assert.equal(first.frequency_hz,220);
 assert.equal(keyboardNote('k',{rootHz:220}).frequency_hz,440);
 assert.deepEqual(keyboardNote('w',{rootHz:220}),keyboardNote('W',{rootHz:220}));
});
test('world roots retune the physical keyboard without altering world canon',()=>{
 for(const [name,world] of Object.entries(WORLD_ROOTS)){
  const resolved=keyboardWorld(name);
  const note=keyboardNote('a',{rootHz:resolved.rootHz});
  assert.equal(note.frequency_hz,world.rootHz);
  assert.equal(note.canon_effect,false);
 }
 assert.equal(keyboardWorld('custom',327).rootHz,327);
 assert.throws(()=>keyboardWorld('custom',0),RangeError);
 assert.throws(()=>keyboardWorld('unknown'),TypeError);
});
test('glyph keyboard reuses real ArcSweep text-to-tone mapping',()=>{
 const tone=keyboardNote('a',{mode:'glyph',rootHz:369});
 assert.equal(tone.frequency_hz,keystrokeTone('a',369).frequency_hz);
 assert.equal(tone.source,'arcsweep.typing-sonification');
 assert.equal(tone.physical_crossing_claim,false);
});
test('Galdr mode uses existing Kelyran study frequencies and does not invent new strokes',()=>{
 assert.equal(GALDR_NOTES[0].frequency,369);
 assert.equal(keyboardNote('a',{mode:'galdr'}).frequency_hz,369);
 assert.equal(keyboardNote('h',{mode:'galdr'}).frequency_hz,1318);
 assert.equal(keyboardNote('j',{mode:'galdr'}),null);
 assert.equal(keyboardNote('u',{mode:'galdr'}),null);
});
test('MIDI input maps notes without claiming identity or navigation authority',()=>{
 const note=keyboardMidiNote(60,{rootHz:528});
 assert.equal(note.frequency_hz,528);
 assert.equal(keyboardMidiNote(72,{rootHz:528}).frequency_hz,1056);
 assert.equal(keyboardMidiNote(60,{mode:'galdr'}).frequency_hz,369);
 assert.equal(keyboardMidiNote(75,{mode:'glyph'}),null);
 assert.throws(()=>keyboardMidiNote(128),RangeError);
 assert.throws(()=>keyboardNote('a',{mode:'unknown'}),TypeError);
});
test('unrelated keys never create phantom notes',()=>{
 for(const key of ['Shift','x','1','',' '])assert.equal(keyboardNote(key),null);
});
test('performance events are honest local observations, not ship kernel receipts',()=>{
 const note=keyboardNote('g',{rootHz:220});
 const event=keyboardEvent(note,{action:'note-on',via:'qwerty',worldId:'terra-aeterna',at:'2026-10-13T21:25:00Z',velocity:80});
 assert.equal(event.canonical_receipt,false);
 assert.equal(event.ship_navigation,false);
 assert.equal(event.velocity,80);
 assert.throws(()=>keyboardEvent(note,{action:'teleport',via:'qwerty'}),TypeError);
 assert.throws(()=>keyboardEvent(note,{action:'note-on',via:'fake'}),TypeError);
});
