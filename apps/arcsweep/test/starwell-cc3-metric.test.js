import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = new URL('../skills/sources/starwell-canopy-tide/', import.meta.url);
const load = name => JSON.parse(readFileSync(new URL(name, root),'utf8'));
const coord = load('coordinates_and_invariants.json');
const geo = load('cc3_map_features_local_m.geojson');
const seed = load('location-seed.v0.2.json');

const vertices = geom => {
 if (geom.type === 'Point') return [geom.coordinates];
 if (geom.type === 'LineString') return geom.coordinates;
 if (geom.type === 'Polygon') return geom.coordinates.flat();
 if (geom.type === 'MultiPolygon') return geom.coordinates.flat(2);
 throw new Error(`Unexpected geometry type: ${geom.type}`);
};

test('metric sheet stays 24×16km with 10m per bitmap pixel', () => {
 assert.deepEqual(coord.extent_m,[0,0,24000,16000]);
 assert.deepEqual(coord.trace_bitmap_pixels,[2400,1600]);
 assert.equal(coord.bitmap_scale_m_per_px,10);
 assert.equal(coord.units,'metres (1 drawing unit = 1 m)');
});
test('local study geometry is bounded and makes no Earth datum claim', () => {
 assert.equal(geo.features.length,11);
 assert.match(geo.crs_note,/not EPSG/);
 for (const feature of geo.features) {
  assert.equal(feature.properties.status,'proposed');
  for(const [x,y] of vertices(feature.geometry)){
   assert.ok(x>=0 && x<=24000,`${feature.properties.name} x ${x}`);
   assert.ok(y>=0 && y<=16000,`${feature.properties.name} y ${y}`);
  }
 }
});
test('synthetic freshwater main channel terminates at declared tidal head', () => {
 const river=geo.features.find(f=>f.properties.feature_type==='freshwater_river').geometry.coordinates;
 assert.deepEqual(river.at(-1),[12900,8370]);
 assert.ok(river.every((v,i)=>!i||v[0]>river[i-1][0]));
 assert.equal(coord.flows.main_river.includes('x=12900'),true);
});
test('four site proposals have distinct identities and nonmarine elevations', () => {
 const sites=geo.features.filter(f=>f.properties.feature_type==='district_site');
 assert.equal(sites.length,4);
 assert.equal(new Set(sites.map(f=>f.properties.site_id)).size,4);
 assert.ok(sites.every(f=>Number.isFinite(f.properties.nominal_elevation_m)&&f.properties.nominal_elevation_m>0));
});
test('floating-island geography and canon adoption remain explicitly unmade',()=>{
 assert.equal(coord.floating_islands.startsWith('off map'),true);
 assert.equal(seed.metric_field_map.floating_isles_location,'NOT-MAPPED');
 assert.equal(seed.parent_world_link,'hypothesis-for-review');
 assert.equal(seed.authority,'proposed-design-only');
 assert.equal(seed.metric_field_map.map_approval,'requires Rowan CC3+ visual/scale review');
});