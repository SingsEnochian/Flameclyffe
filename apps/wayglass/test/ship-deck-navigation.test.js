import test from 'node:test';
import assert from 'node:assert/strict';
import {SHIP_DECK_GROUPS,shipDeckGroup,shipDeckMatches,shipDeckDestinationLabel} from '../src/ship-deck-navigation.js';

test('ship map keeps each room in exactly one declared destination area',()=>{
  assert.deepEqual(SHIP_DECK_GROUPS.map(g=>g.id),['contact','creation','observation','commons']);
  assert.equal(shipDeckGroup('wayglass:living-watercolor'),'contact');
  assert.equal(shipDeckGroup('arcsweep:writing-room'),'contact');
  assert.equal(shipDeckGroup('wayglass:acoustic-room'),'creation');
  assert.equal(shipDeckGroup('wayglass:quad-gestalt'),'observation');
  assert.equal(shipDeckGroup('wayglass:library'),'commons');
  assert.equal(shipDeckGroup('future:world'),'commons');
});
test('room search handles names, identifiers, spaces and case without changing navigation state',()=>{
  const room={label:'Wayglass · Acoustic Room',surface_id:'wayglass:acoustic-room'};
  assert.equal(shipDeckMatches(room,'   '),true);
  assert.equal(shipDeckMatches(room,'ACOUSTIC'),true);
  assert.equal(shipDeckMatches(room,'wayglass:acoustic'),true);
  assert.equal(shipDeckMatches(room,'quantum kitchen'),false);
});
test('readout names mounted rooms using registry and does not invent unknown names',()=>{
  const surfaces=[{surface_id:'wayglass:living-watercolor',label:'Living Watercolor'}];
  assert.equal(shipDeckDestinationLabel('wayglass:living-watercolor',surfaces),'Living Watercolor');
  assert.equal(shipDeckDestinationLabel('unknown:route',surfaces),'Unidentified room');
});
