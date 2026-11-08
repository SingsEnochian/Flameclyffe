import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {arcSweepFramePolicy}=require('../apps/starwell-server/security/arcsweep-frame.js');
const root=resolve(process.env.WAYGLASS_DECK_STAGED_ROOT||'apps/starwell-server/public');
const output=resolve(process.env.WAYGLASS_DECK_BROWSER_ARTIFACTS||'artifacts/wayglass/arcsweep-deck');
const moduleFile=resolve(process.env.WAYGLASS_PLAYWRIGHT_MODULE||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const packageInfo=JSON.parse(await readFile(resolve(dirname(moduleFile),'package.json'),'utf8'));
assert.equal(packageInfo.version,'1.62.1','Pinned Playwright is required');
const {chromium}=await import(pathToFileURL(moduleFile).href);
await Promise.all([stat(resolve(root,'wayglass/index.html')),stat(resolve(root,'arcsweep/index.html'))]);
await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.wasm':'application/wasm','.webmanifest':'application/manifest+json'};
let hideArcSweep=false;
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  res.setHeader('X-Frame-Options',arcSweepFramePolicy(pathname));res.setHeader('X-Content-Type-Options','nosniff');
  if(pathname.startsWith('/api/')){res.writeHead(503,{'content-type':'application/json'});res.end('{"error":"Optional live service unavailable in deck browser gate"}');return;}
  if(hideArcSweep&&pathname.startsWith('/arcsweep/')){res.writeHead(404);res.end('ArcSweep build unavailable');return;}
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  const local=relative(root,file);if(local==='..'||local.startsWith('..'+sep)||local.startsWith(sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('Built asset unavailable');}
});
await new Promise((done,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',done);});
const origin='http://127.0.0.1:'+server.address().port;
const receipt={schema:'wayglass.arcsweep-deck-browser/v1',source_sha:process.env.GITHUB_SHA||null,
 live_provider_calls:false,production_deployment:false,host:'staged-app-loopback-static-with-production-frame-policy',
 playwright:packageInfo.version,scenarios:[],page_errors:[],console_errors:[],blocked_external_requests:[],status:'running'};
let browser,activePage;
try{
 browser=await chromium.launch({headless:true,...(process.env.WAYGLASS_CHROMIUM_EXECUTABLE?{executablePath:process.env.WAYGLASS_CHROMIUM_EXECUTABLE}: {})});
 for(const profile of [{name:'desktop',viewport:{width:1440,height:1100}},{name:'mobile-reduced-motion',viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}]){
  const {name,...options}=profile;const context=await browser.newContext(options);
  await context.route('**/*',async route=>{
   if(new URL(route.request().url()).origin!==origin){receipt.blocked_external_requests.push(route.request().url());await route.abort('blockedbyclient');return;}await route.continue();
  });
  await context.addInitScript(()=>{
   globalThis.__deckProtocolTrace=[];
   addEventListener('arcsweep:core-ready',()=>globalThis.__deckProtocolTrace.push({kind:'core-ready'}));
   addEventListener('message',event=>{if(event.data?.schema==='wayglass.arcsweep-deck/v1')globalThis.__deckProtocolTrace.push({kind:event.data.kind,origin:event.origin,from_parent:event.source===parent});});
  });
  const page=await context.newPage();activePage=page;page.on('pageerror',error=>receipt.page_errors.push(error.message));page.on('console',message=>{if(message.type()==='error')receipt.console_errors.push(message.text().slice(0,2000));});
  await page.goto(origin+'/wayglass/?room=deck');
  await page.locator('[data-surface="arcsweep-deck"]').waitFor();assert.equal(await page.locator('iframe').count(),0,'loading remains explicit');
  const parentSound=page.locator('[data-deck-composer]');
  await page.getByText('Shape this region’s soundscape',{exact:true}).click();
  await parentSound.locator('[data-story-voice-one]').fill('captured-declared-a');
  await parentSound.locator('[data-story-voice-two]').fill('captured-declared-b');
  await parentSound.locator('[data-story-affinity]').fill('0.5');
  await page.evaluate(()=>{
   globalThis.__deckClickTrace=[];
   for(const name of ['pointerdown','pointerup','click'])document.addEventListener(name,event=>{
    if(event.target.closest?.('[data-story-apply]'))globalThis.__deckClickTrace.push({phase:'capture',name,target:event.target.tagName,apply:event.target.closest?.('[data-story-apply]')!==null,path:event.composedPath().filter(n=>n.nodeType===1).map(n=>n.tagName+' '+(n.getAttribute('data-deck-composer')!==null?'composer-root':''))});
   },true);
   document.querySelector('[data-deck-composer]').addEventListener('click',event=>globalThis.__deckClickTrace.push({phase:'bubble',target:event.target.tagName,apply:event.target.closest?.('[data-story-apply]')!==null}));
  });
  await parentSound.locator('[data-story-apply]').click();
  assert.ok(await page.evaluate(()=>globalThis.__deckClickTrace.some(event=>event.phase==='capture'&&event.name==='click'&&event.apply)), 'declaration gesture must reach its visible control');
  await parentSound.locator('[data-composition-status]').filter({hasText:'source-score-ready'}).waitFor();
  assert.equal(await parentSound.locator('[data-sound-layer]').count(),4,'WTL returns two foreground and two atmospheric sound objects');
  const point=parentSound.locator('[data-sound-layer]').first(),before=await point.getAttribute('style');
  await point.focus();await point.press('ArrowRight');assert.notEqual(await point.getAttribute('style'),before,'keyboard placement changes spatial geometry');
  await parentSound.locator('[data-audio-enable]').click();
  await parentSound.locator('[data-composition-status]').filter({hasText:'Sound enabled'}).waitFor();
  await parentSound.locator('[data-audio-disable]').click();
  await page.getByText('Shape this region’s soundscape',{exact:true}).click();
  await page.getByRole('button',{name:'Open world deck',exact:true}).click();
  await page.getByText('Wayglass deck ready · its saved workspace is open.',{exact:true}).waitFor({timeout:45000});
  const child=page.frameLocator('iframe');await child.locator('#app .app-shell').waitFor();
  assert.ok(await child.locator('.sidebar nav [data-room]').count()>=11,'real core rooms must be present');
  await child.getByText('Spatial composition · this listening landscape',{exact:true}).click();
  await child.locator('[data-composition-status]').filter({hasText:'source-score-ready'}).waitFor({timeout:30000});
  assert.equal(await child.locator('[data-sound-layer]').count(),4,'declared score context crosses bridge without merging voices');
  assert.match(await child.locator('[data-composition-status]').textContent(),/Sound off/,'remote declarations do not start playback');
  await child.getByText('Spatial composition · this listening landscape',{exact:true}).click();
  if(profile.isMobile){await child.locator('[data-mobile-more]').click();await child.locator('.mobile-room-sheet [data-mobile-room="waking-thread"]').click();}
  else await child.locator('.sidebar [data-room="waking-thread"]').click();
  await child.locator('#continuity-form [name="title"]').fill('Deck cold return '+name);
  await child.locator('#continuity-form [name="details"]').fill('Real ArcSweep saved state survives returning to the Wayglass body.');
  await child.getByRole('button',{name:'Add to Waking Thread',exact:true}).click();
  await child.getByText('Deck cold return '+name,{exact:true}).waitFor();
  await page.getByRole('button',{name:'Feather Stop',exact:true}).click();
  assert.equal(await page.locator('iframe').evaluate(frame=>frame.inert),true);
  await page.getByRole('button',{name:'Release Feather',exact:true}).click();
  assert.equal(await page.locator('iframe').evaluate(frame=>frame.inert),false);
  await page.screenshot({path:resolve(output,name+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Return to Watercolor',exact:true}).click();await page.locator('#wc-fluid').waitFor();
  assert.equal(await page.locator('iframe').count(),0);
  const returned=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('wayglass.arcsweep-deck.return/v1')));
  assert.equal(returned.child_state_saved,true);
  await page.goto(origin+'/wayglass/?room=deck');await page.getByRole('button',{name:'Open world deck',exact:true}).click();
  await page.getByText('Wayglass deck ready · its saved workspace is open.',{exact:true}).waitFor({timeout:45000});
  const cold=page.frameLocator('iframe');
  if(profile.isMobile){await cold.locator('[data-mobile-more]').click();await cold.locator('.mobile-room-sheet [data-mobile-room="waking-thread"]').click();}
  else await cold.locator('.sidebar [data-room="waking-thread"]').click();
  await cold.getByText('Deck cold return '+name,{exact:true}).waitFor();
  receipt.scenarios.push({profile:name,child_core_ready:true,real_rooms:true,saved_state_cold_return:true,feather_inert:true,no_autoplay_requested:true,wtl_program_composed_both_regions:true,declared_voices_preserved:true,spatial_keyboard_control:true,parent_audio_graph_enabled_by_gesture:true,physical_output_verified:false});await context.close();
 }
 hideArcSweep=true;
 const context=await browser.newContext();const page=await context.newPage();
 await page.goto(origin+'/wayglass/?room=deck');await page.getByRole('button',{name:'Open world deck',exact:true}).click();
 await page.getByText(/The world deck is unavailable or did not finish opening/).waitFor({timeout:35000});
 await page.getByRole('button',{name:'Return to Watercolor',exact:true}).click();await page.locator('#wc-fluid').waitFor();
 receipt.scenarios.push({profile:'missing-staged-child',unavailable_visible:true,return_available:true});await context.close();
 assert.deepEqual(receipt.page_errors,[]);receipt.status='passed';
}catch(error){
 receipt.status='failed';receipt.failure=String(error.stack||error);
 if(activePage&&!activePage.isClosed()){
  try{const state=await activePage.evaluate(()=>({url:location.href,click_trace:globalThis.__deckClickTrace,status:[...document.querySelectorAll('[data-composition-status],[data-composition-error],[data-story-declaration-status],[data-deck-status]')].map(n=>({tag:n.outerHTML,text:n.textContent})),sound_state:globalThis.__wayglassOS?.soundCompositionState?.()||null,declarations:[...document.querySelectorAll('[data-story-voice-one],[data-story-voice-two],[data-story-affinity]')].map(n=>({field:n.outerHTML,value:n.value})),readyState:document.readyState}));
   state.frames=await Promise.all(activePage.frames().map(async frame=>{try{return await frame.evaluate(()=>({url:location.href,title:document.title,protocol_trace:globalThis.__deckProtocolTrace,brand:document.querySelector('.brand')?.textContent,body:document.body.innerText.slice(0,1200),host:globalThis.__wayglassHost||null}));}catch(error){return {url:frame.url(),error:String(error)};}}));
   await writeFile(resolve(output,'failure-state.json'),JSON.stringify(state,null,2)+'\n');
   await activePage.screenshot({path:resolve(output,'failure.png'),fullPage:true});
  }catch{receipt.diagnostic_capture_failed=true;}
 }
 throw error;
}
finally{await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');await browser?.close();await new Promise(done=>server.close(done));}
