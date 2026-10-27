import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  extractAtlasLandmarks,distanceSpectrum,mismatch,transformed,
  calculateGeometryInvariantTrial,calculateIndependentGeometryTrial,runGeometryInvariantTrial,replayGeometryInvariantTrial
} from '../src/geometry-invariant-trial.js';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('canonical Flower and Metatron landmarks use explicitly sourced SVG circles',()=>{
  const flower=extractAtlasLandmarks('flower'),metatron=extractAtlasLandmarks('metatron');
  assert.equal(flower.points.length,7);assert.equal(metatron.points.length,7);
  assert.deepEqual(flower.points[0],[0,0]);assert.deepEqual(metatron.points[0],[0,0]);
  assert.equal(flower.source,metatron.source);
  assert.match(flower.dependence,/axialPoint/);
  assert.throws(()=>extractAtlasLandmarks('unknown'),/only canonical/);
});
test('distance spectrum is exactly invariant to relabelling, translation, rotation and uniform scale within rounding',()=>{
  const points=extractAtlasLandmarks('flower').points;
  assert.equal(distanceSpectrum(points).length,21);
  assert.ok(mismatch(points,transformed(points))<=1e-9);
  assert.ok(mismatch(points,points.toReversed())<=1e-9);
  assert.throws(()=>distanceSpectrum([[0,0],[0,0],[0,0]]),/degenerate/);
});
test('positive, negative and angular null controls are separated and deterministic',()=>{
  const x=calculateGeometryInvariantTrial({seed:104729,nullTrials:399});
  const y=calculateGeometryInvariantTrial({seed:104729,nullTrials:399});
  assert.deepEqual(x,y);
  assert.equal(x.verdict.matched_within_svg_rounding,true);
  assert.equal(x.verdict.controls_discriminate,true);
  assert.equal(x.verdict.independent_emergence,false);
  assert.ok(x.measurements.distorted_control_mismatch>0.01);
  assert.ok(x.measurements.null_median>x.measurements.observed_mismatch);
  assert.ok(x.measurements.null_rank>=1/400);
  assert.match(x.null,/NOT shuffled labels/);
  assert.throws(()=>calculateGeometryInvariantTrial({seed:0}),/positive 32-bit/);
  assert.throws(()=>calculateGeometryInvariantTrial({nullTrials:3}),/99–1999/);
});
test('SHA-256 replay verifies a deterministic local receipt and rejects tampering',async()=>{
  const r=await runGeometryInvariantTrial({seed:57,nullTrials:99});
  assert.match(r.sha256,/^[a-f0-9]{64}$/);
  assert.equal((await replayGeometryInvariantTrial(r)).valid,true);
  assert.equal((await replayGeometryInvariantTrial({...r,sha256:'f'.repeat(64)})).valid,false);
  assert.equal(r.trial.evidence_register.includes('not physical data'),true);
});
test('Observer science and spatial HUD are integrated, no remote models and lifecycle cleanup',()=>{
  const science=source('../src/surfaces/living-observer-science.js');
  const observer=source('../src/surfaces/living-observer.js');
  const hud=source('../src/surfaces/observer-three-hud.js');
  const css=source('../src/surfaces/observer-three-hud.css');
  assert.match(science,/id:'invariants',label:'Invariant Trial'/);
  assert.match(science,/runGeometryInvariantTrial/);
  assert.match(science,/replayGeometryInvariantTrial/);
  assert.match(observer,/mountObserverThreeHUD/);
  assert.match(observer,/opticalDeck\?\.dispose/);
  assert.match(observer,/paused,lowStim,rotation/);
  assert.match(hud,/import\('three'\)/);
  assert.match(hud,/MeshPhysicalMaterial/);
  assert.match(hud,/ResizeObserver/);
  assert.match(hud,/webglcontextlost/);
  assert.match(hud,/if\(paused\|\|lowStim\|\|reducedMotion\)/);
  assert.match(css,/wg-spatial-hud/);
  assert.match(css,/pointer-events:none/);
});

test('independently declared point arrays can be compared without asserting verified source independence',async()=>{
  const a={id:'model-A',provenance:'Independent equation solver A, source v1',points:[[0,0],[1,0],[0,1],[1,1]]};
  const b={id:'model-B',provenance:'Different derivation by separate investigator',points:[[3,5],[3,7],[1,5],[1,7]]};
  const trial=calculateIndependentGeometryTrial({datasetA:a,datasetB:b,seed:101,nullTrials:99,tolerance:.0001});
  assert.equal(trial.verdict.matched_within_registered_tolerance,true);
  assert.equal(trial.verdict.source_independence_verified,false);
  assert.equal(trial.verdict.independently_emergent,false);
  assert.ok(trial.measurements.null_median>trial.measurements.observed_mismatch);
  const receipt=await runGeometryInvariantTrial({datasetA:a,datasetB:b,seed:101,nullTrials:99});
  assert.equal((await replayGeometryInvariantTrial(receipt)).valid,true);
  const altered={...receipt,trial:{...receipt.trial,verdict:{...receipt.trial.verdict,independently_emergent:true}}};
  assert.equal((await replayGeometryInvariantTrial(altered)).valid,false);
  assert.throws(()=>calculateIndependentGeometryTrial({datasetA:a,datasetB:{...b,id:'model-A'}}),/source IDs must differ/);
  assert.throws(()=>calculateIndependentGeometryTrial({datasetA:a,datasetB:{...b,points:[[0,0],[1,0],[0,1]]}}),/matched point counts/);
});

test('N-013 optical deck is a single instrument: Three core, 2D contacts and explicit classic fallback',()=>{
 const observer=source('../src/surfaces/living-observer.js');
 const hud=source('../src/surfaces/observer-three-hud.js');
 const css=source('../src/surfaces/observer-three-hud.css');
 assert.match(observer,/spatial:isSpatial\(\)/);
 assert.match(observer,/if\(!spatial\)/);
 assert.match(observer,/data-observer-optics/);
 assert.match(observer,/opticalDeck\?\.setEnabled/);
 assert.match(hud,/setEnabled/);
 assert.match(hud,/envTarget=pmrem.fromEquirectangular/);
 assert.match(hud,/pmrem\.dispose/);
 assert.match(hud,/webglcontextlost/);
 assert.match(hud,/wayglass:optics-change/);
 assert.match(hud,/envTarget\?\.dispose/);
 assert.match(css,/\.wg-hud-identity/);
 assert.match(css,/data-optical-mode="three"/);
 assert.match(css,/data-optical-mode="fallback"/);
});
test('N-013 shared hull ties all eight destinations into one accessible nav without changing provider authority',()=>{
 const deck=source('../src/ship-deck.js');
 const main=source('../src/main.js');
 const css=source('../src/ship-wide-hud.css');
 for(const name of ['arcsweep:writing-room','wayglass:living-observer','wayglass:systems',
  'wayglass:video-atelier','wayglass:commons','wayglass:library',
  'wayglass:toybox','wayglass:nikola-research']){
  assert.ok(deck.includes(name),name);
 }
 for(const who of ['bluebird:spicychat','vethrlauf:spicychat','evil-gene:film-2015']){
  assert.ok(deck.includes(who),who);
 }
 assert.match(deck,/aria-current/);
 assert.match(deck,/prepareWayglassCrewRoom/);
 assert.match(main,/installShipDeck\(root,surfaceId/);
 assert.match(css,/wg-ship-deck/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/:focus-visible/);
});

test('Three.js official spline docking rig remains local, deterministic, pausable and disposable',async()=>{
 const THREE=await import('three');
 const {createOpticalDockingRig,OPTICAL_DOCKING_SCHEMA}=await import('../src/surfaces/observer-docking-motion.js');
 const host=new THREE.Group();
 const rig=createOpticalDockingRig(THREE,host);
 assert.equal(rig.schema,OPTICAL_DOCKING_SCHEMA);
 assert.equal(host.children.length,1);
 assert.equal(rig.root.children.filter(node=>/synthetic-docking-marker/.test(node.name)).length,3);
 const first=rig.root.children.find(node=>node.name==='ALPHA-synthetic-docking-marker');
 const initial=first.position.clone();
 rig.tick(1000,{focus:'time'});
 rig.tick(1045,{focus:'time'});
 assert.ok(first.position.distanceTo(initial)>0,'Three.js curve marker should advance with time');
 const stop=first.position.clone();
 rig.tick(1200,{paused:true});
 rig.tick(1800,{lowStim:true});
 rig.tick(2400,{reducedMotion:true});
 assert.ok(first.position.distanceTo(stop)<1e-9,'safety modes must freeze synthetic orbit');
 rig.setEnabled(false);
 rig.tick(2500,{focus:'time'});
 assert.equal(rig.root.visible,false);
 assert.ok(first.position.distanceTo(stop)<1e-9);
 rig.dispose();
 assert.equal(host.children.length,0);
});
test('N-015 bloom addon is opt-in and optical motion shares existing Observer animation ownership',()=>{
 const hud=source('../src/surfaces/observer-three-hud.js');
 const observer=source('../src/surfaces/living-observer.js');
 const css=source('../src/surfaces/observer-three-hud.css');
 const ship=source('../src/ship-deck.js');
 assert.match(hud,/createOpticalDockingRig/);
 assert.match(hud,/import\('three\/addons\/postprocessing\/EffectComposer\.js'\)/);
 assert.match(hud,/import\('three\/addons\/postprocessing\/UnrealBloomPass\.js'\)/);
 assert.match(hud,/import\('three\/addons\/postprocessing\/OutputPass\.js'\)/);
 assert.match(hud,/async function setBloom\(on\)/);
 assert.match(hud,/if\(bloomEnabled&&composer&&!lowStim&&!reducedMotion\)/);
 assert.match(hud,/docking\?\.tick\(time,\{paused,lowStim,reducedMotion,rotation\}\)/);
 assert.match(hud,/composer\?\.dispose\(\)/);
 assert.match(observer,/data-observer-bloom/);
 assert.match(observer,/root\.dataset\.lowStim/);
 assert.match(observer,/root\.dataset\.featherHeld/);
 assert.match(observer,/paintBloomPreference\(\)/);
 assert.match(css,/\.wg-hud-rail/);
 assert.match(css,/@keyframes wgOpticalSweep/);
 assert.match(css,/data-low-stim="true"/);
 assert.match(ship,/ArrowRight/);
 assert.match(ship,/\.focus\(\)/);
});

test('Feather is a single explicit stop for Observer, shader field and pointer motion',()=>{
  const observer=source('../src/surfaces/living-observer.js');
  const shader=source('../src/glass-field.js');
  const pointer=source('../src/motion-choreography.js');
  for(const name of ['wayglass:feather','held:paused','held:false'])assert.ok(observer.includes(name));
  assert.match(shader,/globalThis\.addEventListener\?\.\('wayglass:feather', feather\)/);
  assert.match(shader,/if \(!alive \|\| featherHeld\) return;/);
  assert.match(shader,/cancelAnimationFrame\(frame\)/);
  assert.match(shader,/if \(featherHeld\) return;/);
  assert.match(pointer,/globalThis\.addEventListener\?\.\('wayglass:feather', feather\)/);
  assert.match(pointer,/if \(reduced \|\| featherHeld\) return;/);
});
