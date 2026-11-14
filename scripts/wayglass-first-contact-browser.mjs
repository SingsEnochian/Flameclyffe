import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import firstTouchDemo from '../lib/wayglass-first-touch-demo.cjs';

// Real Chromium against the built application. Host calls use captured transport;
// this verifies browser behavior, never live inference or provider credentials.
const root=resolve(process.env.WAYGLASS_BROWSER_DIST||'dist/wayglass');
const output=resolve(process.env.WAYGLASS_BROWSER_ARTIFACTS||'artifacts/wayglass/first-contact-browser');
const modulePath=process.env.WAYGLASS_PLAYWRIGHT_MODULE;
if(!modulePath)throw new Error('WAYGLASS_PLAYWRIGHT_MODULE must point to pinned playwright@1.62.1/index.mjs');
const moduleFile=resolve(modulePath);
const packageInfo=JSON.parse(await readFile(resolve(dirname(moduleFile),'package.json'),'utf8'));
assert.equal(packageInfo.version,'1.62.1','Browser gate requires the pinned Playwright version');
const {chromium}=await import(pathToFileURL(moduleFile).href);
await stat(resolve(root,'index.html'));
await mkdir(output,{recursive:true});

const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  const local=relative(root,file);
  if(local==='..'||local.startsWith('..'+sep)||local.startsWith(sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('Built asset unavailable');}
});
await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
const origin='http://127.0.0.1:'+server.address().port;
const receipt={schema:'wayglass.first-contact-browser-evidence/v1',source_sha:process.env.GITHUB_SHA||null,
 transport:'captured-host-fixture',browser:'chromium',playwright:packageInfo.version,
 live_model_inference:false,provider_authentication_verified:false,production_deployment:false,
 scenarios:[],requests:[],page_errors:[],transport_errors:[],blocked_external_requests:[],status:'running'};
// First Contact speaks through the dedicated ship voice seat (#584). The catalogue
// marks it configured, as the real host does for a local Ollama-backed route, and the
// captured reply carries the same seat attribution the host receipts.
const fixtureRoute={route_id:'wayglass:ship',provider:'ollama',model:'captured-first-contact-fixture',label:'Wayglass · Ship Voice',
 participant_id:'wayglass',continuity_id:'wayglass:ship',configured:true};
let browser,heldRelease=null,holdNext=false,fixtureSequence=0;
function routeTurn(payload,text){
 const observationId='captured-observation:'+ (++fixtureSequence);
 const at='2026-11-05T23:00:00.000Z';
 return {schema:'wayglass.route-turn/v0.1',...fixtureRoute,output:text,
  kernel_preflight:{status:'ready-for-route',route_id:fixtureRoute.route_id,owner_authenticated:false,world_entry_verified:false},
  observation:{schema:'wayglass.model-observation/v0.1',observation_id:observationId,observed_at:at,
   source:{kind:'model-route',route_id:fixtureRoute.route_id,provider:fixtureRoute.provider,model:fixtureRoute.model,response_id:null},
   interaction:{session_id:payload.session_id,surface_id:payload.surface_id,channel:'OOC'},content:{output:text,deliberation_trace:null}},
  receipt:{response_id:null,observation_id:observationId,session_id:payload.session_id,surface_id:payload.surface_id,
   participant_id:'wayglass',character_id:'wayglass',voice_seat_kind:'system-voice-over-external-route',
   completed_at:at,wayglass_persisted:false,canon_commit:false}};
}
async function prepareContext(options){
 const context=await browser.newContext(options);
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin){receipt.blocked_external_requests.push(url.origin+url.pathname);await route.abort('blockedbyclient');return;}
  if(!url.pathname.startsWith('/api/')){await route.continue();return;}
  if(url.pathname==='/api/v1/wayglass/routes'){
   await route.fulfill({status:200,json:{schema:'wayglass.route-catalogue/v0.1',routes:[fixtureRoute]}});return;
  }
  if(url.pathname==='/api/v1/wayglass/voyage/messages'&&route.request().method()==='GET'){
   await route.fulfill({status:200,json:{schema:'wayglass.voyage-inbox/v0.1',messages:[{
    participant_id:'captured:visitor',kind:'hello',text:'Captured inbox message for browser draft preservation.',
    voyage_ref:'captured:voyage:1',created_at:'2026-11-05T23:00:00.000Z',
   }]}});return;
  }
  if(url.pathname==='/api/v1/wayglass/wyrdrune/first-touch'&&route.request().method()==='POST'){
   try{
    const payload=route.request().postDataJSON();
    const native=await firstTouchDemo.runFirstTouch({
      principal:{id:'house:steward',authorized:true},
      mode:payload.mode,touch:payload.touch,
      now:new Date('2026-11-13T20:00:00.000Z'),
    });
    receipt.requests.push({route_id:'wayglass:first-touch-captured-host',
      evidence_kind:'simulation',wtl_executed:native.status==='connected-sandbox-preview',
      mode:payload.mode,touch:payload.touch,model_invoked:false});
    await route.fulfill({status:200,json:native});
   }catch(error){
    receipt.transport_errors.push(String(error.stack||error));
    await route.fulfill({status:400,json:{error:'Native Wyrdrune captured-host simulation failed'}});
   }
   return;
  }
  if(url.pathname==='/api/v1/wayglass/respond'&&route.request().method()==='POST'){
   try{
   const payload=route.request().postDataJSON();
   assert.equal(payload.route_id,fixtureRoute.route_id,'UI must use the selected captured route');
   assert.equal(payload.character_id,'wayglass','First Contact must request the Wayglass ship voice seat');
   assert.equal(payload.surface_id,'wayglass:living-watercolor');
   assert.equal(typeof payload.session_id,'string');
   receipt.requests.push({route_id:payload.route_id,session_id:payload.session_id,surface_id:payload.surface_id,history_messages:payload.history?.length||0,
    first_hello_present:typeof payload.input==='string'&&payload.input.includes('Wayglass, hello.'),
    optional_contribution_present:typeof payload.input==='string'&&payload.input.includes('Captured delayed request for Feather cancellation.'),transport:'captured-host-fixture'});
   const delayed=holdNext;holdNext=false;
   if(delayed)await new Promise(done=>{heldRelease=done;});
   const text=delayed?'Captured late reply: Feather must leave this unapplied.':'Captured transport reply: I would try a copper tide across this painting.';
   await route.fulfill({status:200,json:routeTurn(payload,text)});
   }catch(error){
    receipt.transport_errors.push(String(error.stack||error));
    await route.fulfill({status:500,json:{error:'Captured transport fixture rejected the browser request'}});
   }
   return;
  }
  // Optional host tools stay explicitly offline in this browser-only gate.
  await route.fulfill({status:503,json:{error:'Captured browser gate: optional host service offline'}});
 });
 context.on('page',page=>page.on('pageerror',error=>receipt.page_errors.push(String(error.stack||error))));
 return context;
}
const canvasDigest=page=>page.locator('#wc-fluid').evaluate(canvas=>canvas.toDataURL());
const localTranscript=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('wayglass.watercolor.conversation/v1')));
async function checkDockNavigation(page,{profile,destination,surfaceSelector}){
 const ship=page.locator('.wg-ship-switch'),inbox=page.locator('.wg-voyage-inbox'),map=page.locator('.wg-shell-nav');
 const nonoverlap=async state=>{
  const a=await ship.boundingBox(),b=await inbox.boundingBox();
  assert.ok(a&&b,'Dock controls must have visible geometry');
  const overlap=a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  assert.equal(overlap,false,profile+' '+state+' inbox must not overlap the ship switch');
  return {switch:a,inbox:b};
 };
 assert.equal(await ship.getAttribute('aria-expanded'),'false');
 const closed=await nonoverlap('closed');
 await inbox.locator('summary').click();
 await inbox.getByRole('button',{name:'Check messages',exact:true}).click();
 const draft=inbox.locator('textarea');await draft.waitFor();
 const draftText='Captured unsent '+profile+' draft; keep this exact text.';
 await draft.fill(draftText);
 await draft.evaluate(node=>{globalThis.__wayglassBrowserDraftNode=node;});
 const opened=await nonoverlap('open');
 await ship.click();
 assert.equal(await map.isVisible(),true,'A real ship-switch click must open the map');
 assert.equal(await inbox.isVisible(),false,'Expanded map must remove the inbox from hit testing');
 await page.screenshot({path:resolve(output,'dock-map-'+profile+'.png'),fullPage:true});
 await map.locator('[data-surface-id="'+destination+'"]').click();
 await page.locator(surfaceSelector).waitFor();
 // A completed room crossing now dismisses the atlas without losing drafts.
 assert.equal(await map.isVisible(),false,'Room crossing must dismiss the ship atlas');
 assert.equal(await inbox.isVisible(),true,'Room crossing must restore the inbox');
 await ship.click();
 assert.equal(await map.isVisible(),true,'Ship switch must still reopen the atlas');
 await ship.click();
 assert.equal(await map.isVisible(),false);
 assert.equal(await inbox.isVisible(),true,'Closing the map must restore the inbox');
 assert.equal(await draft.inputValue(),draftText,'Destination navigation must retain the unsent draft');
 assert.equal(await draft.evaluate(node=>node===globalThis.__wayglassBrowserDraftNode),true,'The inbox draft node must remain mounted');
 assert.equal(await inbox.evaluate(node=>node.open),true,'The expanded inbox state must be preserved');
 await inbox.locator('summary').click();
 receipt.scenarios.push({id:'dock-navigation-and-unsent-draft-'+profile,status:'passed',closed_geometry:closed,open_geometry:opened});
}
async function checkMotionPreferences(page,{profile,touch=false}){
 const ship=page.locator('.wg-ship-switch');await ship.click();
 const toggle=page.locator('[data-motion-toggle]');
 assert.equal(await toggle.isDisabled(),true,'System reduced-motion must lock the accessible toggle');
 assert.equal(await toggle.getAttribute('aria-pressed'),'false');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForFunction(()=>document.querySelector('[data-motion-toggle]')?.disabled===false);
 assert.equal(await toggle.getAttribute('aria-pressed'),'false','Removing system lock must not restart motion');
 await toggle.click();assert.equal(await toggle.getAttribute('aria-pressed'),'true');
 const control=page.locator('[data-surface-id]').first();
 if(touch){
   await control.dispatchEvent('pointermove',{pointerType:'touch',clientX:50,clientY:50});
   await page.evaluate(()=>new Promise(done=>requestAnimationFrame(done)));
   assert.equal(await control.evaluate(node=>node.style.getPropertyValue('--wg-magnet-x')),'','Touch must not produce magnetic offsets');
 }else{
   const bounds=await control.boundingBox();assert.ok(bounds);
   await page.mouse.move(bounds.x+bounds.width*.7,bounds.y+bounds.height*.7);
   await page.waitForFunction(()=>document.querySelector('[data-surface-id]')?.style.getPropertyValue('--wg-magnet-x'));
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.documentElement.dataset.wgMotion==='off');
 assert.equal(await control.evaluate(node=>node.style.getPropertyValue('--wg-magnet-x')),'','A live preference change must clear offsets');
 assert.equal(await toggle.isDisabled(),true);
 await ship.click();
 receipt.scenarios.push({id:'live-motion-preference-and-accessible-toggle-'+profile,status:'passed',touch});
}
try{
 browser=await chromium.launch({headless:true});receipt.browser_version=browser.version();
 const context=await prepareContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage();
 await page.goto(origin,{waitUntil:'networkidle'});
 await page.locator('[data-surface="living-watercolor"]').waitFor();
 await checkMotionPreferences(page,{profile:'desktop'});
 assert.equal(await page.locator('.wg-auth-overlay:visible').count(),0,'Offline watercolor entry must render without provider login');
 const paintingRect=await page.locator('.wc-stage').boundingBox();
 const workbenchRect=await page.locator('.wc-workbench').boundingBox();
 assert.ok(paintingRect&&workbenchRect,'Painting and workbench must both be visible on desktop');
 assert.ok(paintingRect.x+paintingRect.width<=workbenchRect.x+1 || workbenchRect.x+workbenchRect.width<=paintingRect.x+1,
   'Watercolor canvas must never be covered by the conversation workbench');
 assert.ok(paintingRect.width>=480,'Desktop painting should have substantial visible width');
 assert.ok(await page.locator('#wc-paint-help').isVisible(),'Painting instructions must be visible');
 await page.locator('[data-wc-pigment="#4c7961"]').click();
 assert.equal(await page.locator('#wc-color').inputValue(),'#4c7961','Swatch must update brush pigment');
 await page.locator('#wc-brush-size').evaluate(control=>{
   control.value='85';control.dispatchEvent(new Event('input',{bubbles:true}));
 });
 assert.match(await page.locator('#wc-brush-size-label').textContent(),/85%/);
 await page.locator('#wc-clear-paint').click();
 const samplePaper=()=>page.locator('#wc-fluid').evaluate(node=>{
   const ctx=node.getContext('2d');
   return [...ctx.getImageData(Math.floor(node.width/2),Math.floor(node.height/2),1,1).data];
 });
 const opaline=await samplePaper();
 assert.ok(opaline[0]<80&&opaline[1]<95&&opaline[2]<110,
   'FAEpank cleared painting must show dark opaline paper by default');
 assert.equal(await page.locator('#wc-paper').getAttribute('aria-pressed'),'true',
   'The dark paper mode must be accurately exposed to assistive technology');
 await page.locator('#wc-paper').click();
 const paperPixel=await samplePaper();
 assert.ok(paperPixel[0]>200&&paperPixel[1]>190&&paperPixel[2]>180,
   'Owner must be able to select a bright, readable light paper');
 assert.equal(await page.locator('#wc-paper').getAttribute('aria-pressed'),'false',
   'The paper mode must remain reversible and accessible');
 assert.ok(await page.locator('#wc-first-touch').isVisible(),
   'The real Wyrdrune First Touch orb must be reachable in Watercolour');
 await page.locator('[data-wc-touch-mode="expand"]').click();
 assert.equal(await page.locator('[data-wc-touch-mode="expand"]').getAttribute('aria-pressed'),'true',
   'Touch profile must be selectable without starting a model or making a network call');
 await page.locator('[data-wc-touch-mode="repair"]').click();
 await page.locator('#wc-focus-paint').click();
 assert.equal(await page.locator('.wc-workbench').isVisible(),false,'Focus mode must reclaim canvas space');
 assert.match(await page.locator('#wc-focus-paint').textContent(),/Show workbench/);
 await page.locator('#wc-focus-paint').click();
 assert.equal(await page.locator('.wc-workbench').isVisible(),true,'Focus mode must be reversible');
 // Actual browser gesture -> captured host executes the real native Wyrdrune
 // implementation -> Return receipt -> pigment on the existing canvas.
 const beforeWyrdruneTouch=await canvasDigest(page);
 const beforeWyrdruneEvents=Number(await page.locator('#wc-events').textContent());
 await page.locator('#wc-first-touch').click();
 await page.waitForFunction(()=>document.querySelector('#wc-touch-status')?.textContent.includes('Returned'));
 assert.notEqual(await canvasDigest(page),beforeWyrdruneTouch,
   'Touching the FAEpunk orb must change real canvas pigment from the native Wyrdrune Return');
 assert.ok(Number(await page.locator('#wc-events').textContent())>beforeWyrdruneEvents,
   'Native Wyrdrune receipt must enter the Living Watercolour activity bus');
 assert.equal(receipt.requests.at(-1).wtl_executed,true,'Browser touch must execute the native Wyrdrune backend');
 assert.equal(receipt.requests.at(-1).evidence_kind,'simulation',
   'A captured-host trial must never be relabelled as live telemetry');
 await page.locator('[data-wc-touch-mode="expand"]').click();
 await page.locator('#wc-first-touch').click();
 await page.waitForFunction(()=>document.querySelector('#wc-touch-status')?.textContent.includes('Bloom'));
 assert.equal(receipt.requests.at(-1).mode,'expand','Second gesture must execute the other Wyrdrune expansion path');
 receipt.scenarios.push({id:'real-browser-touch-native-wyrdrune-return-colour-and-bloom',status:'passed',
  capture:'owner-simulated-host',mode_count:2});
 receipt.scenarios.push({id:'unobstructed-paper-palette-brush-width-and-reversible-focus',status:'passed'});
 const before=await canvasDigest(page),canvas=page.locator('#wc-fluid');
 const box=await canvas.boundingBox();assert.ok(box&&box.width>0&&box.height>0);
 await canvas.click({position:{x:box.width*0.18,y:box.height*0.15}});
 assert.notEqual(await canvasDigest(page),before,'Actual pointer input must change rendered pigment');
 assert.ok(parseInt(await page.locator('#wc-proposals').textContent(),10)>0,'Pointer pigment must leave a local suggestion');
 receipt.scenarios.push({id:'offline-entry-and-real-pointer-pigment',status:'passed'});

 await page.waitForFunction(()=>document.querySelector('#wc-invite')?.disabled===false);
 const pigmentBeforeReply=await canvasDigest(page);
 await page.locator('#wc-first-contact').click();
 await page.waitForFunction(()=>document.querySelector('#wc-voice')?.textContent.includes('Captured transport reply:'));
 assert.equal(await page.locator('.wc-deck').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Desktop contribution controls must fit without horizontal clipping');
 assert.notEqual(await canvasDigest(page),pigmentBeforeReply,'Captured route events must produce visible pigment');
 assert.match(await page.locator('#wc-feedback').textContent(),/ollama.*captured-first-contact-fixture.*captured-observation:/);
 assert.equal(receipt.requests.find(item=>item.route_id===fixtureRoute.route_id && item.first_hello_present===true)?.first_hello_present,true,
   'First hello must reach the selected host route even when First Touch requests occur earlier');
 assert.match(await page.locator('.wg-motion-status').textContent(),/Route completed/,'Motion status must reflect observed route completion');
 await page.locator('#wc-save-return').click();
 const saved=await localTranscript(page);assert.equal(saved.turns.length,1);
 assert.equal(saved.turns[0].response.receipt.response_id,null);
 await page.screenshot({path:resolve(output,'watercolor-desktop.png'),fullPage:true});
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#wc-recover-return').click();
 await page.waitForFunction(()=>document.querySelector('#wc-feedback')?.textContent.includes('Conversation recovered'));
 assert.match(await page.locator('#wc-voice').textContent(),/Captured transport reply:/);
 receipt.scenarios.push({id:'captured-route-attribution-and-cold-conversation-return',status:'passed',custody:'local-browser'});

 holdNext=true;
 const requestPending=page.waitForRequest(request=>request.url().endsWith('/api/v1/wayglass/respond'));
 await page.locator('#wc-prompt').fill('Captured delayed request for Feather cancellation.');
 await page.locator('#wc-invite').click();await requestPending;
 assert.equal(receipt.requests.at(-1).optional_contribution_present,true,'Typed optional contribution must reach the route unchanged');
 await page.locator('#wc-feather').click();
 const pausedPigment=await canvasDigest(page);
 const responsePending=page.waitForResponse(response=>response.url().endsWith('/api/v1/wayglass/respond'));
 assert.equal(typeof heldRelease,'function');heldRelease();heldRelease=null;await responsePending;
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
 assert.doesNotMatch(await page.locator('#wc-voice').textContent(),/Captured late reply:/);
 assert.equal(await canvasDigest(page),pausedPigment,'Feather must prevent late route events from painting');
 assert.equal(await page.locator('#wc-invite').isDisabled(),true);
 await page.locator('#wc-feather').click();
 await page.locator('#wc-save-return').click();assert.equal((await localTranscript(page)).turns.length,1,'Late reply must not enter the conversation');
 receipt.scenarios.push({id:'feather-rejects-delayed-route-completion',status:'passed'});

 await page.locator('[data-wc-room="wayglass:acoustic-room"]').click();
 await page.locator('[data-surface="wayglass-acoustic-room"]').waitFor();
 assert.equal(await page.locator('[data-audio]').isChecked(),false);
 const stage=page.locator('[data-stage]'),stageBox=await stage.boundingBox();assert.ok(stageBox);
 await stage.click({position:{x:stageBox.width*0.4,y:stageBox.height*0.4}});
 const spatialBefore=JSON.parse(await page.locator('[data-inspector]').textContent()).world.markerState.listener;
 await page.locator('[data-save]').click();
 await page.locator('[data-intent="move"]').first().click();
 await page.locator('[data-return]').click();
 const spatialAfter=JSON.parse(await page.locator('[data-inspector]').textContent()).world.markerState.listener;
 assert.deepEqual(spatialAfter,spatialBefore,'Pointer placement must survive cold spatial return');
 assert.equal(await page.locator('[data-audio]').isChecked(),false);
 await page.locator('[data-fork]').click();assert.match(await page.locator('[data-comparison]').textContent(),/same primary probe/);
 await page.screenshot({path:resolve(output,'acoustic-desktop.png'),fullPage:true});
 await checkDockNavigation(page,{profile:'desktop',destination:'wayglass:living-watercolor',surfaceSelector:'#wc-fluid'});
 receipt.scenarios.push({id:'acoustic-navigation-spatial-return-and-room-remount',status:'passed'});
 // The new FAEpunk Worktable passage must open an actual native Wyrdrune editor,
 // not a decorative button linking to an unregistered surface.
 await page.locator('.wg-helm-loci [data-locus="worktable"]').click();
 await page.locator('[data-surface="wayglass-universal-codex"]').waitFor();
 assert.ok((await page.locator('#codex-source').inputValue()).includes('mobius'),
   'Universal Codex must have real editable Wyrdrune source');
 await page.locator('[data-codex-translate]').click();
 assert.match(await page.locator('[data-codex-english]').textContent(),/Perceive|perceive|source|code/i,
   'Native Wyrdrune must give an English reading without invoking a model');
 await page.screenshot({path:resolve(output,'faeberpunk-codex-desktop.png'),fullPage:true});
 // The same source-level design system must connect a real editor and a real
 // Observer, not just draw a Codex screen. The manuscript is local-only.
 await page.locator('[data-codex-room="arcsweep:writing-room"]').click();
 const manuscript=page.locator('[data-manuscript-editor]');
 await manuscript.waitFor();
 await manuscript.fill('An opaline moon over the living ship.');
 await page.locator('[data-manuscript-stage]').click();
 assert.match(await page.locator('#wg-input').inputValue(),/An opaline moon over the living ship/);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wayglass:manuscript-local/v1'))?.schema),
  'wayglass:manuscript-local/v1','Rich manuscript must retain a local-only draft');
 await page.screenshot({path:resolve(output,'faeberpunk-writing-desktop.png'),fullPage:true});
 await page.locator('[data-wayglass-room="wayglass:living-observer"]').first().click();
 await page.locator('.fae-observer-evidence').waitFor();
 assert.ok((await page.locator('[data-fae-observer-source]').textContent()).trim().length>0,
  'Observer must expose its selected instrument source');
 assert.match(await page.locator('[data-fae-observer-quad]').textContent(),/Not observed|reported channels/);
 await page.locator('[data-observer-focus]').nth(1).click();
 await page.screenshot({path:resolve(output,'faeberpunk-observer-desktop.png'),fullPage:true});
 await page.locator('[data-wayglass-room="wayglass:living-watercolor"]').first().click();
 await page.locator('#wc-fluid').waitFor();
 receipt.scenarios.push({id:'faepunk-four-room-codex-writing-observer-watercolour-passage',status:'passed',
  rich_text:'browser-local',observation:'source-labelled'});
 await context.close();

 const mobile=await prepareContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 const touchPage=await mobile.newPage();await touchPage.goto(origin,{waitUntil:'networkidle'});
 const touchCanvas=touchPage.locator('#wc-fluid');await touchCanvas.waitFor();
 await checkMotionPreferences(touchPage,{profile:'mobile',touch:true});
 assert.equal(await touchPage.locator('.wc-deck').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Mobile contribution controls must fit without horizontal clipping');
 const mobileStage=await touchPage.locator('.wc-stage').boundingBox();
 const mobileWorkbench=await touchPage.locator('.wc-workbench').boundingBox();
 assert.ok(mobileStage&&mobileWorkbench);
 assert.ok(mobileStage.height>=320,'Mobile painting must retain a useful drawing area');
 assert.ok(mobileStage.y+mobileStage.height<=mobileWorkbench.y+1,
   'Mobile workbench must sit BELOW the canvas, not cover the picture');
 assert.ok(await touchPage.locator('#wc-paint-help').isVisible());
 const touchBefore=await canvasDigest(touchPage),touchBox=await touchCanvas.boundingBox();assert.ok(touchBox);
 await touchCanvas.tap({position:{x:touchBox.width*0.2,y:touchBox.height*0.15}});
 assert.notEqual(await canvasDigest(touchPage),touchBefore,'Real touch must paint with reduced motion');
 assert.ok(parseInt(await touchPage.locator('#wc-proposals').textContent(),10)>0);
 await touchPage.screenshot({path:resolve(output,'watercolor-mobile.png'),fullPage:true});
 receipt.scenarios.push({id:'mobile-touch-with-reduced-motion',status:'passed',viewport:{width:390,height:844}});
 await checkDockNavigation(touchPage,{profile:'mobile',destination:'wayglass:acoustic-room',surfaceSelector:'[data-surface="wayglass-acoustic-room"]'});
 await mobile.close();
 assert.deepEqual(receipt.page_errors,[],'No uncaught browser JavaScript errors');
 assert.deepEqual(receipt.transport_errors,[],'Captured host requests must retain the expected route envelope');
 assert.deepEqual(receipt.blocked_external_requests,[],'Browser trial must stay on the local captured host');
 receipt.status='passed';
}catch(error){receipt.status='failed';receipt.failure=String(error.stack||error);process.exitCode=1;}
finally{
 heldRelease?.();
 if(browser){try{await browser.close();}catch(error){receipt.status='failed';receipt.close_failure=String(error.stack||error);process.exitCode=1;}}
 await new Promise(done=>server.close(done));
 await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({status:receipt.status,scenarios:receipt.scenarios.length,transport:receipt.transport,receipt:resolve(output,'receipt.json'),failure:receipt.failure||null}));
}
