import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createLiquidOpticalElements,LIQUID_OPTICS_SCHEMA} from '../src/surfaces/liquid-optics-geometry.js';
import {WAYGLASS_MISSION_DOCK_SCHEMA} from '../src/surfaces/observer-mission-dock.js';
const source=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('liquid optical crystal is an actual locally modeled beveled Three.js object',()=>{
  const host=new THREE.Group();
  const optics=createLiquidOpticalElements(THREE,host);
  assert.equal(optics.schema,LIQUID_OPTICS_SCHEMA);
  assert.equal(host.children.length,1);
  assert.ok(optics.prism.children.some(x=>x.isMesh && x.geometry?.type==='ExtrudeGeometry'));
  const crystal=optics.prism.children.find(x=>x.isMesh);
  assert.equal(crystal.material.type,'MeshPhysicalMaterial');
  assert.ok(crystal.material.transmission>0);
  assert.ok(crystal.material.iridescence>0);
  assert.equal(optics.filaments.children.length,6);
  const start=optics.prism.rotation.y;
  optics.frame(4,{paused:true});
  optics.frame(12,{lowStim:true});
  optics.frame(16,{reducedMotion:true});
  assert.equal(optics.prism.rotation.y,start);
  optics.frame(6,{});
  assert.notEqual(optics.prism.rotation.y,start);
  optics.dispose();
  assert.equal(host.children.length,0);
});

test('the N-016 mission dock links only to actual research, sandbox and provenance controls',()=>{
  const mission=source('../src/surfaces/observer-mission-dock.js');
  const observer=source('../src/surfaces/living-observer.js');
  const science=source('../src/surfaces/living-observer-science.js');
  assert.equal(WAYGLASS_MISSION_DOCK_SCHEMA,'wayglass.mission-dock/v1');
  for(const name of ['research','sandbox','provenance'])assert.ok(mission.includes("id:'"+name+"'"));
  assert.match(mission,/data-wg-science-action="lens-invariants"/);
  assert.match(science,/button\(l\.label,'lens-'\+l\.id\)/);
  assert.match(mission,/\.observer-dream/);
  assert.match(mission,/\.observer-wonder/);
  assert.match(observer,/mountObserverMissionDock/);
  assert.match(observer,/disposeMissionDock\(\)/);
  assert.match(mission,/section\.scrollIntoView/);
  assert.doesNotMatch(mission,/invokeWayglassRoute|replyToVoyage|fetch\(|sendMessage\(/);
});

test('the source concept is implemented as real HUD materials and honest LLM layout',()=>{
  const css=source('../src/liquid-optical-materials.css');
  const main=source('../src/main.js');
  const hud=source('../src/surfaces/observer-three-hud.js');
  assert.match(main,/import '\.\/liquid-optical-materials\.css'/);
  assert.match(css,/wg-writing-room/);
  assert.match(css,/#wg-route-state/);
  assert.match(css,/wg-thread/);
  assert.match(css,/wg-composer/);
  assert.match(css,/wg-mission-cards/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(hud,/createLiquidOpticalElements/);
  assert.match(hud,/liquidOptics\?\.frame/);
  assert.match(hud,/liquidOptics\?\.dispose/);
});
