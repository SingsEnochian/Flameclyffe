import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAuthorizationSession} from '../src/authorization-session.js';
import {
  deriveNikolaHeartBrain,runNikolaHeartBrainTrial,replayNikolaHeartBrain,
} from '../../../starwell/deep-observer/nikola-heart-brain.js';
import {deriveCosmicClock,deriveNumerology,geometrySVG,parseNoaaProduct} from '../../../starwell/deep-observer/living-observer-atlas.js';
const file=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const main=file('../src/main.js'),surface=file('../src/surfaces/living-observer.js');
const science=file('../src/surfaces/living-observer-science.js');
const auth=file('../src/authorization.js');
const route=file('../src/route-client.js');

test('Wayglass mounts the observer without a mandatory Bluebird login barrier',()=>{
  assert.doesNotMatch(main,/await\s+openWayglassAuthorization\s*\(/);
  assert.match(main,/roomQuery\s*===\s*'observer'\s*\?\s*'wayglass:living-observer'/);
  assert.match(main,/await wayglass\.mount\(startRoom\)/);
  assert.match(main,/authorizeBluebird:\s*\(\)\s*=>\s*openWayglassAuthorization\(\)/);
  assert.doesNotMatch(main,/pageshow.*openWayglassAuthorization/);
});
test('protected Bluebird provider actions retain exact opt-in session header and host contract',()=>{
  assert.match(route,/routeId === 'flame:bluebird:spicychat'/);
  assert.match(route,/\.\.\.authorizationSession\.headers\(\)/);
  assert.match(auth,/session\.authorize\(input\.value\)/);
  assert.match(auth,/wayglass\/bluebird\/revoke/);
  assert.match(auth,/Bluebird’s token code/);
});
test('independent local observer can mount with zero provider credentials',async()=>{
  const session=createAuthorizationSession(async()=>{throw Error('no provider configured');});
  assert.deepEqual(session.headers(),{});
  assert.equal(session.route(),null);
  assert.match(main,/wayglass:living-observer/);
  // Host authorization is not modified; absence of a token cannot authorise a provider.
  await assert.rejects(session.authorize('bad'),/no provider configured/);
  assert.deepEqual(session.headers(),{});
});
test('real Wayglass observer mounts compact five-lens science station with teardown',()=>{
  assert.match(surface,/mountWayglassSciencePanel\(root\)/);
  assert.match(surface,/disposeScience\(\)/);
  assert.match(surface,/data-wg-science-host/);
  assert.match(surface,/wayglass:nikola-research/);
  assert.match(surface,/wayglass:commons/);
  assert.match(surface,/observer-dream/); // keeps distinct Observer private interior
  assert.match(science,/data-wg-science-pane/);
  assert.match(science,/n\.hidden=key!==id/);
  assert.match(science,/eventController\.abort\(\)/);
  assert.match(science,/noaaController\?\.abort\(\)/);
});
test('science station imports *canonical* instruments rather than cloning formulae',()=>{
  assert.match(science,/from '\.\.\/\.\.\/\.\.\/\.\.\/starwell\/deep-observer\/nikola-heart-brain\.js'/);
  assert.match(science,/from '\.\.\/\.\.\/\.\.\/\.\.\/starwell\/deep-observer\/living-observer-atlas\.js'/);
  assert.match(science,/deriveNikolaHeartBrain/);
  assert.match(science,/runNikolaHeartBrainTrial/);
  assert.match(science,/replayNikolaHeartBrain/);
  assert.match(science,/parseNoaa|fetchNoaaAtlas/);
  assert.match(science,/deriveNumerology/);
  assert.match(science,/geometrySVG/);
  assert.doesNotMatch(science,/localStorage|sessionStorage|Bluebird’s provider token code/);
});
test('five lenses expose source-distinct math, measured sky, symbolic and Crew views',()=>{
  for(const key of ["heart","sky","geometry","numbers","crew"]){
    assert.match(science,new RegExp("id:'"+key+"'"));
  }
  assert.match(science,/on\(skyUpdate,'click'/);
  assert.match(science,/on\(trial,'click'/);
  assert.match(science,/No provider or QPU contacted/);
  assert.match(science,/on\(authorize,'click'/);
  assert.match(science,/provider session was authorised/);
});
test('heart, lunar clock, historical reductions and NOAA parser remain live mathematical capabilities',async()=>{
  const p=deriveNikolaHeartBrain({p0:.5,phaseRad:0,dephasing:0,priorCoherent:.5});
  assert.equal(p.brain.recommended_basis,'X');
  const result=await runNikolaHeartBrainTrial({p0:.5,phaseRad:0,dephasing:.25,shots:128,seed:173});
  assert.equal((await replayNikolaHeartBrain(result)).matched,true);
  assert.equal(result.detector.physical_detector_used,false);
  assert.equal(deriveCosmicClock('2000-01-01T12:00:00Z').julian_day,2451545);
  assert.equal(deriveNumerology({dateISO:'2026-10-26'}).date_digit_sum,19);
  assert.match(geometrySVG('merkaba'),/<svg/);
  const r=parseNoaaProduct('kp',[{time_tag:'2026-10-26T20:00:00',Kp:2.3}],new Date('2026-10-26T20:10:00Z'));
  assert.equal(r.value,2.3);assert.equal(r.freshness,'fresh');
});
test('Wayglass science CSS is mobile-sized and only one lens appears at a time',()=>{
 const css=file('../src/surfaces/living-observer-science.css');
 assert.match(css,/\.wg-science-lens\[hidden\]\{display:none!important\}/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/prefers-reduced-motion/);
});

test('source HTML carries the revision marker required by stale-port launch guard',()=>{
  const html=file('../index.html');
  const launcher=file('../../../scripts/wayglass-local.mjs');
  assert.match(html,/name="wayglass-ui-revision" content="living-observer-n010"/);
  assert.match(html,/name="wayglass-ui-capabilities" content="n012-three-hud-geometry-invariants-crew"/);
  assert.match(launcher,/if \(existing\.responding && !existing\.current\)/);
  assert.match(launcher,/OLD or unknown Wayglass build/);
});

test('default Windows launch enters N-010 through one-origin Hearthgate, never Vercel or 5186',()=>{
  const launcher=file('../../../scripts/Start-Wayglass.ps1');
  const stage=file('../server-stage.cjs');
  assert.match(launcher,/Port = 3841/);
  assert.match(launcher,/wayglass\/\?room=observer/);
  assert.match(launcher,/npm run wayglass:deploy:server/);
  assert.match(launcher,/npm --prefix apps\/starwell-server run start:core/);
  assert.match(launcher,/living-observer-n010/);
  assert.match(launcher,/n012-three-hud-geometry-invariants-crew/);
  assert.match(launcher,/Refusing to launch stale UI/);
  assert.match(launcher,/Port \$Port is already occupied/);
  const executableLines=launcher.split('\n').filter(line=>!line.trimStart().startsWith('#')).join('\n');
  assert.doesNotMatch(executableLines,/scripts\/wayglass-local\.mjs|5186|vercel --prod/);
  assert.match(stage,/public', 'wayglass'/);
  assert.match(stage,/hearthgate-host\.js/);
});


test('Crew doors preserve three distinct pinned SpicyChat worlds with no implicit send',()=>{
  const model=file('../src/world-seats.js');
  const crew=file('../src/crew-navigation.js');
  const ui=file('../src/surfaces/living-observer-science.js');
  const writing=file('../src/surfaces/arcsweep-writing.js');
  for(const id of ['bluebird:spicychat','vethrlauf:spicychat','evil-gene:film-2015']){
    assert.match(model,new RegExp(id.replaceAll(':','\\:')));
    assert.ok(crew.includes(id));
    assert.ok(ui.includes(id));
  }
  for(const name of ['Bluebird · Richie','Vethrlauf','Griff Krenshaw'])assert.ok(ui.includes(name));
  assert.match(writing,/consumeWayglassCrewRoom/);
  assert.match(writing,/Check Crew connection/);
  assert.match(writing,/route\.provider !== 'spicychat'/);
  assert.match(writing,/externalSpicy/);
  assert.match(writing,/externalProviderConsent/);
});

test('Crew provider route catalogue requires exact matching pairs and private user credential',()=>{
  const registry=file('../../../lib/wayglass-route-registry.cjs');
  const host=file('../../starwell-server/wayglass/router.js');
  const ignition=file('../../../scripts/Start-Wayglass-Crew.ps1');
  for(const name of ['BLUEBIRD','VETHRLAUF','GRIFF']) assert.ok(registry.includes("pinnedSpicyChatIds('"+name+"')"));
  assert.match(registry,/flame:vethrlauf:spicychat/);
  assert.match(registry,/SPICYCHAT_ACCOUNT_TOKEN/);
  assert.match(host,/route\.strict_pair/);
  assert.match(host,/crew\/:member\/status/);
  assert.match(host,/payload\.external_provider_consent !== true/);
  assert.match(host,/route\.provider !== 'spicychat'/);
  assert.match(ignition,/Read-Host 'SpicyChat account credential \(hidden, not saved\)' -AsSecureString/);
  assert.match(ignition,/ZeroFreeBSTR/);
  assert.match(ignition,/Start-Wayglass\.ps1/);
  assert.doesNotMatch(ignition,/SetEnvironmentVariable\(|env:SPICYCHAT_ACCOUNT_TOKEN\s*\|\s*Set-Content/);
});
