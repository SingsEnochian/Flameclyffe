import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WAYGLASS_WORLD_ATLAS_SCHEMA,
  WAYGLASS_SOURCE_WORLDS,
  projectWayglassWorldAtlas,
  listWayglassAtlasWorlds,
  importArcSweepWorldNavigationExport,
  clearWayglassAtlasImports,
} from '../src/world-atlas.js';
import { listWayglassWorldSeats, findWayglassWorldSeat, wayglassWorldStatus } from '../src/world-seats.js';
import { resolveWayglassDeck } from '../src/ship-environment.js';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const byId = id => WAYGLASS_SOURCE_WORLDS.find(world=>world.world_id===id);

test('World Atlas is a provenance-preserving projection of existing ArcSweep records', () => {
  const again = projectWayglassWorldAtlas();
  assert.deepEqual(again, WAYGLASS_SOURCE_WORLDS);
  assert.ok(again.length >= 20);
  const ids = again.map(world=>world.world_id);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ['hearthweave-foundation','terra-aeterna','luna','feather-and-flame','taveren-vaen','starsong','a-momento-creatonis','dreaming-grove','between-the-dreaming','star-wars-mandalorian','eternia','recreators']) {
    assert.ok(byId(id),id);
  }
  for(const world of again) {
    assert.equal(world.schema,WAYGLASS_WORLD_ATLAS_SCHEMA);
    assert.equal(world.authority,'discovery-projection-not-canon');
    assert.equal(world.transport_status,'navigation-only');
    assert.ok(world.source_refs.length);
  }
});

test('four requested destinations are visible but missing source material is never fabricated', () => {
  const requested = ['stargate','sanctuary','the-never-ending-story','the-last-unicorn'];
  for(const id of requested) {
    const world=byId(id);
    assert.ok(world,id);
    assert.equal(world.source_status,'awaiting-source-reconciliation');
    assert.equal(world.canon_status,'not-imported');
    assert.deepEqual(world.source_refs,['owner-request:2026-10-19']);
    assert.match(wayglassWorldStatus(findWayglassWorldSeat(id)),/original world record/);
  }
});

test('Steins;Gate canon and distinct related variants keep reference provenance', () => {
  const primary=byId('steins-gate');
  assert.ok(primary);
  assert.equal(primary.canon_status,'reference-only');
  assert.ok(primary.source_refs.includes('apps/arcsweep/public/canon/steins-gate/canon-pack.json'));
  assert.ok(primary.related_canon.some(x=>x.includes('Steins;Gate 0')));
  const zero=byId('steins-gate-0');
  assert.equal(zero.canon_status,'related-variant-reference-only');
  assert.notEqual(zero.world_id,primary.world_id);
  assert.ok(byId('recreators').source_refs.some(ref=>ref.endsWith('recreators/canon-pack.json')));
  assert.ok(byId('star-trek-sundancer'));
  assert.ok(byId('equestria-starsong'));
  assert.notEqual(byId('equestria-starsong').world_id,byId('starsong').world_id);
});

test('existing separate Griff seat and route remain unchanged', () => {
  const original = findWayglassWorldSeat('evil-gene:film-2015');
  assert.equal(original.character?.character_id,'griff-krenshaw');
  assert.equal(original.character?.desired_route_id,'flame:griff:spicychat');
  assert.equal(original.character?.route_verified,false);
  assert.ok(byId(original.world_id));
});

test('private ArcSweep export imports only safe navigation labels into ephemeral session', () => {
  clearWayglassAtlasImports();
  const result=importArcSweepWorldNavigationExport({worlds:[
    {id:'owner-world-2040',name:'Owner World 2040',kind:'Dreamed World',description:'PRIVATE STORY SECRET',identity:{name:'PRIVATE IDENTITY'},api_key:'SECRET TOKEN',relationships:['PRIVATE']},
    {id:'terra-aeterna',name:'Overwrite my canon'},
    {id:'bad id!',name:'Bad'}
  ]});
  assert.equal(result.added,1);
  assert.equal(result.conflicts,1);
  assert.equal(result.rejected,1);
  assert.equal(result.imported_private_dossiers,0);
  assert.equal(result.persisted,false);
  assert.equal(result.provider_sent,false);
  const imported=findWayglassWorldSeat('owner-world-2040');
  assert.equal(imported.name,'Owner World 2040');
  assert.equal(imported.atlas_source_status,'owner-session-only');
  const text=JSON.stringify(listWayglassAtlasWorlds());
  for(const secret of ['PRIVATE STORY SECRET','PRIVATE IDENTITY','SECRET TOKEN','PRIVATE']) assert.ok(!text.includes(secret));
  assert.equal(findWayglassWorldSeat('terra-aeterna').name,'Terra Aeterna');
  clearWayglassAtlasImports();
  assert.equal(findWayglassWorldSeat('owner-world-2040'),null);
});

test('World Atlas is a browser-runnable deck and gives the Writing Room explicit world navigation', () => {
  assert.equal(resolveWayglassDeck('?room=worlds'),'wayglass:world-atlas');
  const main=source('../src/main.js');
  const writing=source('../src/surfaces/arcsweep-writing.js');
  const atlas=source('../src/surfaces/world-atlas.js');
  assert.match(main,/surface_id: 'wayglass:world-atlas'/);
  assert.match(writing,/listWayglassWorldSeats\(\)/);
  assert.match(writing,/atlasParams.get\('from'\) === 'atlas'/);
  assert.match(atlas,/Choose in Writing Room/);
  assert.match(atlas,/type="file"/);
  assert.match(atlas,/importArcSweepWorldNavigationExport/);
  assert.match(atlas,/searchParams.set\('from','atlas'\)/);
  assert.ok(listWayglassWorldSeats().length >= WAYGLASS_SOURCE_WORLDS.length + 1);
});

test('invalid and malicious exports fail closed without silently creating worlds', () => {
  clearWayglassAtlasImports();
  assert.throws(()=>importArcSweepWorldNavigationExport({hello:'world'}),/Expected a world/);
  assert.throws(()=>importArcSweepWorldNavigationExport({worlds:Array(251).fill({id:'test',name:'test'})}),/max 250/);
  assert.equal(findWayglassWorldSeat('bad id!'),null);
});
