import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

// Real compiled ship in Chromium; all external routes blocked. Not a live provider test.
const dist=resolve('dist/wayglass'),output=resolve('artifacts/wayglass/triptych-lift');
if(!process.env.WAYGLASS_PLAYWRIGHT_MODULE)throw new Error('Pinned Playwright module required');
const path=resolve(process.env.WAYGLASS_PLAYWRIGHT_MODULE);
const pkg=JSON.parse(await readFile(resolve(dirname(path),'package.json'),'utf8'));
assert.equal(pkg.version,'1.62.1');
const {chromium}=await import(pathToFileURL(path).href);
await stat(resolve(dist,'index.html'));
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
  const local=relative(dist,file);
  if(local==='..'||local.startsWith('..'+sep)||local.startsWith(sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500);res.end('Unavailable');}
});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
const origin='http://127.0.0.1:'+server.address().port;
const receipt={schema:'wayglass.triptych-browser/v1',source_sha:process.env.GITHUB_SHA||null,
 model_invoked:false,production_deployment:false,scenarios:[],errors:[],status:'running'};
let browser;
async function mountLift(page,profile){
 await page.goto(origin,{waitUntil:'networkidle'});
 const ship=page.locator('.wg-ship-switch');
 await ship.waitFor({state:'visible'});
 if(profile==='desktop'){
  // Reproduce the historical First Contact failure while Watercolour is still mounted.
  await ship.click();
  const toggle=page.locator('[data-motion-toggle]');
  assert.equal(await toggle.isDisabled(),true,'OS reduce starts locked');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForTimeout(850);
  const state=await page.evaluate(()=>({
   media:matchMedia('(prefers-reduced-motion: reduce)').matches,
   disabled:document.querySelector('[data-motion-toggle]')?.disabled,
   pressed:document.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed'),
   feather:document.querySelector('.wg-helm-feather')?.dataset.held,
   wgMotion:document.documentElement.dataset.wgMotion,
  }));
  receipt.watercolour_motion_state=state;
  assert.equal(state.disabled,false,'Watercolour OS motion unlock: '+JSON.stringify(state));
  await ship.click();
 }
 await ship.click();
 const map=page.locator('#wg-shell-nav');
 await map.locator('[data-surface-id="wayglass:triptych-lift"]').click();
 const scene=page.locator('[data-wg-triptych-lift]');
 await scene.waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('[data-lift-status]')?.textContent.includes('Lift ready'),null,{timeout:20000});
 assert.equal(await scene.getAttribute('data-station'),'monolith');
 assert.equal(await scene.locator('[data-lift-audio]').isChecked(),false,'No autoplay consent');
 assert.equal(await scene.locator('.wg-triptych-panel').count(),0,'Old card rail must be absent');
 return scene;
}
async function layout(page,profile){
 const bounds=await page.evaluate(()=>{
  const stage=document.querySelector('[data-wg-triptych-lift]').getBoundingClientRect();
  const control=document.querySelector('.wg-lift-console').getBoundingClientRect();
  return {stage:{left:stage.left,right:stage.right,width:stage.width,bottom:stage.bottom},
   control:{left:control.left,right:control.right,bottom:control.bottom},
   viewport:{width:innerWidth,height:innerHeight},
   utilityOverlaps:[...document.querySelectorAll('.wg-ship-switch,.wg-voyage-inbox')].filter(node=>{
     const box=node.getBoundingClientRect();
     return box.left<control.right && box.right>control.left && box.top<control.bottom && box.bottom>control.top;
   }).map(node=>node.className),
   noHorizontalScroll:document.documentElement.scrollWidth<=innerWidth+3};
 });
 assert.ok(bounds.stage.width>=bounds.viewport.width*.83,'Spatial chamber must dominate viewport: '+profile);
 assert.ok(bounds.control.right<=bounds.viewport.width+3&&bounds.control.left>=-3,'Controls clipped: '+profile);
 assert.ok(bounds.control.bottom<=bounds.stage.bottom+3,'Controls overflow the ship: '+profile);
 assert.ok(bounds.noHorizontalScroll,'Horizontal overflow: '+profile);
 assert.deepEqual(bounds.utilityOverlaps,[],'Host utility controls must not cover lift interaction controls: '+profile);
 return bounds;
}
try{
 browser=await chromium.launch({headless:true});
 for(const profile of ['desktop','mobile']){
  const context=await browser.newContext(profile==='desktop'
   ?{viewport:{width:1440,height:900},reducedMotion:'reduce'}
   :{viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',deviceScaleFactor:1});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin){await route.abort('blockedbyclient');return;}
   if(url.pathname==='/api/v1/wayglass/routes'){
    await route.fulfill({status:200,json:{schema:'wayglass.route-catalogue/v0.1',routes:[{route_id:'wayglass:ship',provider:'ollama',model:'captured-first-contact-fixture',label:'Wayglass · Ship Voice',participant_id:'wayglass',continuity_id:'wayglass:ship',configured:true}]}});return;
   }
   if(url.pathname.startsWith('/api/')){await route.fulfill({status:503,json:{error:'Browser only; no model invoked'}});return;}
   await route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>receipt.errors.push(String(error.stack||error)));
  const scene=await mountLift(page,profile);
  if(profile==='desktop'){
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.locator('.wg-ship-switch').click();
   const motionToggle=page.locator('[data-motion-toggle]');
   assert.equal(await motionToggle.isDisabled(),true,'System motion lock should disable toggle');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.waitForTimeout(850);
   const motionState=await page.evaluate(()=>({
    osReduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
    disabled:document.querySelector('[data-motion-toggle]')?.disabled,
    pressed:document.querySelector('[data-motion-toggle]')?.getAttribute('aria-pressed'),
    wgMotion:document.documentElement.dataset.wgMotion,
    feather:document.querySelector('.wg-helm-feather')?.dataset.held,
    visible:document.visibilityState,
   }));
   receipt.motion_state=motionState;
   assert.equal(motionState.disabled,false,'Media preference unlock: '+JSON.stringify(motionState));
   await page.locator('.wg-ship-switch').click();
  }
  const bounds=await layout(page,profile);
  await page.screenshot({path:resolve(output,profile+'-monolith.png'),fullPage:true});
  if(profile==='desktop'){
   await scene.locator('[data-lift-action="forward"]').click();
   assert.equal(await scene.getAttribute('data-station'),'twist');
   await scene.locator('[data-lift-action="forward"]').click();
   assert.equal(await scene.getAttribute('data-station'),'arrival');
   await page.screenshot({path:resolve(output,'desktop-arrival.png'),fullPage:true});
   await scene.locator('[data-lift-world]').focus();
   await page.keyboard.press('Home');
   assert.equal(await scene.getAttribute('data-station'),'monolith');
   await page.keyboard.press('End');
   assert.equal(await scene.getAttribute('data-station'),'arrival');
   await page.keyboard.press('ArrowLeft');
   assert.equal(await scene.getAttribute('data-station'),'twist');
   await scene.locator('[data-lift-action="feather"]').click();
   assert.equal(await scene.getAttribute('data-feather'),'held');
   assert.equal(await scene.locator('[data-lift-action="forward"]').isDisabled(),true);
   assert.equal(await scene.locator('[data-lift-audio]').isChecked(),false);
   receipt.scenarios.push({profile,gesture:'buttons-keyboard-feather',status:'passed',bounds});
  }else{
   const transition=await scene.locator('.wg-lift-vault').evaluate(node=>getComputedStyle(node).transitionDuration);
   assert.equal(transition.split(',')[0].trim(),'0s','Reduced-motion must disable vault animation');
   await scene.locator('[data-lift-world]').dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',clientX:320,clientY:420});
   await scene.locator('[data-lift-world]').dispatchEvent('pointerup',{pointerId:2,pointerType:'touch',clientX:90,clientY:420});
   assert.equal(await scene.getAttribute('data-station'),'twist','Touch swipe advances one chamber');
   await scene.locator('[data-lift-action="back"]').click();
   assert.equal(await scene.getAttribute('data-station'),'monolith');
   await scene.locator('[data-lift-action="enter"]').click();
   await page.waitForFunction(()=>document.documentElement.dataset.wayglassSurface==='wayglass:living-watercolor');
   receipt.scenarios.push({profile,gesture:'touch-reduced-motion-live-room',status:'passed',bounds});
  }
  await context.close();
 }
 assert.deepEqual(receipt.errors,[],'No unhandled browser exceptions');
 receipt.status='passed';
}catch(error){receipt.status='failed';receipt.failure=String(error.stack||error);process.exitCode=1;}
finally{
 await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2));
 await browser?.close();
 await new Promise(done=>server.close(done));
 console.log(JSON.stringify({status:receipt.status,scenarios:receipt.scenarios.map(s=>s.profile),failure:receipt.failure||null}));
}
