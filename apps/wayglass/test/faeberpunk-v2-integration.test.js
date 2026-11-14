import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveWayglassEntry} from '../src/wayglass-entry.js';
import {shipDeckGroup} from '../src/ship-deck-navigation.js';
import {MANUSCRIPT_STORAGE_KEY} from '../src/faeberpunk-manuscript.js';
import {FAEBERPUNK_LOCI} from '../src/faeberpunk-loci.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('all four FAEberpunk rooms exist in the same registered ship',()=>{
  const main=read('../src/main.js');
  const w=read('../src/surfaces/arcsweep-writing.js');
  const o=read('../src/surfaces/living-observer.js');
  const c=read('../src/surfaces/universal-codex.js');
  const water=read('../src/surfaces/living-watercolor.js');
  assert.match(main,/mountUniversalCodex/);
  assert.match(main,/surface_id:'wayglass:universal-codex'/);
  assert.match(main,/faeberpunk-rooms\.css/);
  assert.match(w,/fae-manuscript-host/);
  assert.match(w,/mountFaepunkManuscript/);
  assert.match(w,/wayglass:universal-codex/);
  assert.match(o,/data-fae-observer-source/);
  assert.match(o,/data-fae-observer-quad/);
  assert.match(c,/data-codex-english/);
  assert.match(c,/data-codex-receipts/);
  assert.match(water,/data-wc-room="wayglass:universal-codex"/);
  assert.equal(shipDeckGroup('wayglass:universal-codex'),'creation');
  const entry=resolveWayglassEntry({
    room:'codex',available:['wayglass:living-watercolor','wayglass:universal-codex'],
  });
  assert.equal(entry.surface_id,'wayglass:universal-codex');
  assert.deepEqual(FAEBERPUNK_LOCI.map(x=>x.id),['door','identity','worktable','wonder','return']);
});

test('Universal Codex reads and verifies source, with a conscious Writing handoff',()=>{
  const codex=read('../src/surfaces/universal-codex.js');
  assert.match(codex,/previewWyrdrune\(source\)/);
  assert.match(codex,/result\.verification\?\.verified!==true/);
  assert.match(codex,/animateWyrdruneCypher/);
  assert.match(codex,/draftWyrdruneDiscussion/);
  assert.match(codex,/HANDOFF_KEY/);
  assert.match(codex,/sessionStorage/);
  assert.match(codex,/WAYGLASS_FEATHER_EVENT/);
  assert.match(codex,/cypher\?\.stop\(\)/);
  assert.match(codex,/role="status"/);
  assert.doesNotMatch(codex,/invokeWayglassRoute/);
  assert.doesNotMatch(codex,/sendMessage\(/);
  const writer=read('../src/surfaces/arcsweep-writing.js');
  assert.match(writer,/wayglass:universal-codex:writing-handoff\/v1/);
  assert.match(writer,/input\.value=joined/);
  assert.doesNotMatch(writer,/passTurn\(staged\)/);
});

test('rich manuscript is a persistent locally editable document, separate from provider turns',()=>{
  const script=read('../src/faeberpunk-manuscript.js');
  assert.equal(MANUSCRIPT_STORAGE_KEY,'wayglass:manuscript-local/v1');
  assert.match(script,/contenteditable="true"/);
  assert.match(script,/data-manuscript-cmd="bold"/);
  assert.match(script,/data-manuscript-cmd="italic"/);
  assert.match(script,/data-manuscript-cmd="underline"/);
  assert.match(script,/data-manuscript-cmd="insertUnorderedList"/);
  assert.match(script,/data-manuscript-cmd="formatBlock"/);
  assert.match(script,/sanitizedManuscriptFragment/);
  assert.match(script,/getData\('text\/plain'\)/);
  assert.match(script,/store\?\.setItem/);
  assert.match(script,/onStage\(text\)/);
  assert.match(script,/feather\(\)/);
  assert.doesNotMatch(script,/fetch\(/);
});

test('Observer shows provenance without inventing channel availability',()=>{
  const observer=read('../src/surfaces/living-observer.js');
  assert.match(observer,/data-fae-observer-source/);
  assert.match(observer,/data-fae-observer-quad/);
  assert.match(observer,/source\.textContent='Source/);
  assert.match(observer,/quad\.evidence\.filter\(x=>x\.status==='observed'\)/);
  assert.match(observer,/:'Not observed'/);
  assert.match(observer,/wayglass:universal-codex/);
});

test('room-wide FAEberpunk design respects accessibility and responsive devices',()=>{
  const css=read('../src/faeberpunk-rooms.css');
  const codex=read('../src/surfaces/universal-codex.css');
  const ship=read('../src/faeberpunk.css');
  for(const stylesheet of [css,codex,ship]){
    assert.match(stylesheet,/prefers-reduced-motion:reduce/);
    assert.match(stylesheet,/prefers-reduced-transparency:reduce/);
    assert.match(stylesheet,/forced-colors:active/);
  }
  assert.match(css,/:focus-visible/);
  assert.match(codex,/:focus-visible/);
  assert.match(css,/min-height:44px/);
  assert.match(codex,/min-height:44px/);
  assert.match(css,/@media\(max-width:690px\)/);
  assert.match(codex,/@media\(max-width:700px\)/);
  const doc=read('../../../docs/wayglass/FAEBERPUNK_LIVING_SHIP_EXPERIENCE_V2.md');
  assert.match(doc,/Watercolour, Door/);
  assert.match(doc,/Writing Room, Worktable/);
  assert.match(doc,/Observer, Wonder Window/);
  assert.match(doc,/Universal Codex, Native Language/);
});
