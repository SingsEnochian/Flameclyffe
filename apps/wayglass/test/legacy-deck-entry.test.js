import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWayglassEntry} from '../src/wayglass-entry.js';
const available=['wayglass:living-watercolor','wayglass:world-deck','arcsweep:deck'].map(surface_id=>({surface_id}));
test('native world deck and legacy ArcSweep deck remain independently deep-linkable',()=>{
 assert.equal(resolveWayglassEntry({available,room:'nativeDeck'}).surface_id,'wayglass:world-deck');
 assert.equal(resolveWayglassEntry({available,room:'legacyDeck'}).surface_id,'arcsweep:deck');
 assert.equal(resolveWayglassEntry({available}).surface_id,'wayglass:living-watercolor');
 assert.throws(()=>resolveWayglassEntry({available:available.slice(0,2),room:'legacyDeck'}),/not registered/);
});

test('Wyrdrune Cell Garden is a native room and cannot alias the old deck',()=>{
 const rooms=[...available,{surface_id:'wayglass:cell-garden'}];
 assert.equal(resolveWayglassEntry({available:rooms,room:'cellGarden'}).surface_id,'wayglass:cell-garden');
 assert.throws(()=>resolveWayglassEntry({available,room:'cellGarden'}),/not registered/);
 assert.equal(resolveWayglassEntry({available:rooms,room:'nativeDeck'}).surface_id,'wayglass:world-deck');
});
