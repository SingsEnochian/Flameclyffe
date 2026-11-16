import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

// Source-faithful real-browser verification of the ship's cypher surfaces.
// No model call, authentication bypass, private source export or production claim.
const dist=resolve('dist/wayglass'), output=resolve('artifacts/wayglass/cypher-browser');
const modulePath=process.env.WAYGLASS_PLAYWRIGHT_MODULE;
if(!modulePath)throw new Error('Pinned Playwright module required');
const play=resolve(modulePath);
const pkg=JSON.parse(await readFile(resolve(dirname(play),'package.json'),'utf8'));
assert.equal(pkg.version,'1.62.1');
const {chromium}=await import(pathToFileURL(play).href);
await stat(resolve(dist,'index.html'));
await mkdir(output,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const pathname=decodeURIComponent(url.pathname);
  const file=resolve(dist,'.'+(pathname==='/'?'/index.html':pathname));
  const rel=relative(dist,file);
  if(rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(file);
  res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('Build asset missing');}
});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
const origin='http://127.0.0.1:'+server.address().port;
const receipt={schema:'wayglass.cypher-browser/v1',source_sha:process.env.GITHUB_SHA||null,
  live_model_inference:false,production_deployment:false,status:'running',scenarios:[],page_errors:[]};
let browser;
async function shipRoom(page,id){
 const ship=page.locator('.wg-ship-switch');
 await ship.click();
 const target=page.locator('[data-surface-id="'+id+'"]');
 await target.scrollIntoViewIfNeeded();
 await target.click();
 await page.waitForFunction(id=>document.querySelector('#wg-shell-nav')?.hidden===true
   && document.documentElement.dataset.wayglassSurface===id,id,{timeout:12000});
}
async function checkWatercolour(page,profile){
 const stage=page.locator('.wc-stage');
 await stage.waitFor({state:'visible'});
 const countBefore=await page.locator('#wc-events').innerText();
 await page.waitForFunction(()=>{
  const stage=document.querySelector('.wc-stage');
  return Number(stage?.dataset.ambientCycles||0)>=1;
 },null,{timeout:7500});
 const countAfter=await page.locator('#wc-events').innerText();
 assert.equal(countAfter,countBefore,'Local ambient breathing must not fabricate agent events');
 assert.equal(await page.locator('#wc-live-title').isVisible(),true);
 assert.match(await page.locator('#wc-live-title').innerText(),/Ambient current|Listening/);
 assert.equal(await page.locator('.wc-live-field').isVisible(),true);
 const stageState=await stage.getAttribute('data-activity-state');
 assert.ok(['ambient','quiet','observed'].includes(stageState));
 await page.screenshot({path:resolve(output,profile+'-watercolour-autonomous.png'),fullPage:true});
 receipt.scenarios.push({profile,room:'Living Watercolour',status:'passed',
  unattended_ambient_cycles:Number(await stage.getAttribute('data-ambient-cycles')),
  no_fake_agent_event:true});
}
const chatSource='mobius { perceive {} compress {} release {} verify {} integrate {} choose {} return { emit {kind:"watercolor.stroke/v1",words:"Hope is here",color:"#edbc53",density:0.85,spread:0.2,points:[[0.35,0.62],[0.65,0.62]]}; } transcend {} }';
const chatReply='At the eighth station.\n\n'+['```wyrdrune',chatSource,'```'].join('\n');
async function openWatercolourChat(page){
 const toggle=page.locator('#wc-instruments-toggle');
 if(await toggle.getAttribute('aria-expanded')==='false'&&!(await page.locator('#wc-voice').isVisible())){
  await toggle.click();
 }
 await page.locator('#wc-voice').waitFor({state:'visible'});
}
async function pigmentPixel(page){
 return page.locator('#wc-fluid').evaluate(canvas=>Array.from(canvas.getContext('2d').getImageData(
  Math.round(canvas.width*.5),Math.round(canvas.height*.62),1,1).data));
}
async function checkWatercolourChat(page,profile){
 await openWatercolourChat(page);
 const originalPixel=await pigmentPixel(page);
 await page.locator('#wc-prompt').fill('Greet the eighth station.');
 await page.locator('#wc-invite').click();
 const turn=page.locator('.wc-dialogue-response').last();
 const display=turn.locator('.wg-cypher-veil');
 await display.waitFor({state:'visible'});
 assert.equal(await display.getAttribute('data-cypher-state'),'reading');
 const paintedPixel=await pigmentPixel(page);
 assert.ok(paintedPixel[0]>originalPixel[0]+40,'Ship Voice pigment changed the actual canvas pixel');
 assert.match(await page.locator('#wc-word-paint-status').textContent(),/Hope is here/);
 assert.ok(await turn.getByRole('button',{name:'Find on canvas'}).count());
 await display.locator('[data-cypher-visual-phase="full-runes"]').first().waitFor({state:'attached'});
 assert.match(await turn.innerText(),/At the eighth station/);
 await turn.getByRole('button',{name:'Reveal English'}).click();
 assert.equal(await display.getAttribute('data-cypher-state'),'english');
 assert.match(await display.innerText(),/Hope is here/);
 await turn.getByText('Original Wyrdrune',{exact:true}).click();
 assert.equal(await turn.locator('details p').textContent(),chatSource);
 await page.reload({waitUntil:'networkidle'});
 await openWatercolourChat(page);
 assert.ok((await pigmentPixel(page))[0]>originalPixel[0]+40,'Settled Ship Voice pigment survives reload');
 assert.equal(await display.getAttribute('data-cypher-state'),'english');
 await turn.getByRole('button',{name:'Replay Wyrdrune'}).click();
 assert.equal(await display.getAttribute('data-cypher-state'),'reading');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelector('.wc-dialogue-response .wg-cypher-veil')?.dataset.cypherState==='english');
 await turn.getByRole('button',{name:'Replay Wyrdrune'}).click();
 assert.equal(await display.getAttribute('data-cypher-state'),'english');
 await page.emulateMedia({reducedMotion:'no-preference'});
 const instruments=page.locator('#wc-instruments-toggle');
 if(!(await page.locator('#wc-clear-paint').isVisible())&&await instruments.isVisible()){
  if(await instruments.getAttribute('aria-expanded')==='false')await instruments.click();
 }
 await page.locator('#wc-clear-paint').click();
 await page.reload({waitUntil:'networkidle'});
 await openWatercolourChat(page);
 assert.equal(await turn.getByRole('button',{name:'Find on canvas'}).count(),0);
 assert.equal(await page.locator('#wc-word-paint-status').textContent(),'');
 receipt.scenarios.push({profile,room:'Living Watercolour chat',status:'passed',runes:true,
   skip:true,original_source_preserved:true,replay_after_reload:true,reduced_motion:true});
}
async function checkCodex(page,profile){
 await shipRoom(page,'wayglass:universal-codex');
 const scene=page.locator('[data-surface="wayglass-universal-codex"]');
 await scene.waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('[data-surface="wayglass-universal-codex"]')?.getAttribute('data-codex-ready')==='true',{},{timeout:8000});
 const source=page.locator('#codex-source');
 const original=await source.inputValue();
 assert.match(original,/mobius/);
 const reading=page.locator('[data-codex-english]');
 assert.equal(await page.locator('[data-codex-pace]').inputValue(),'slow','Deliberate slow tempo is the default');
 assert.equal(await page.locator('.wg-codex-rift').isVisible(),true,'Möbius spatial conduit must be in the actual Codex');
 assert.equal(await reading.getAttribute('aria-live'),'off');
 await page.evaluate(()=>{
   const button=document.querySelector('[data-codex-translate]');
   window.__cypherButton=button;window.__cypherClicks=0;
   button?.addEventListener('click',()=>{window.__cypherClicks++;});
 });
 const button=page.locator('[data-codex-translate]');
 await button.scrollIntoViewIfNeeded();
 const hit=await button.evaluate(el=>{
   const rect=el.getBoundingClientRect();
   const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
   const target=document.elementFromPoint(x,y);
   const css=getComputedStyle(el),parent=getComputedStyle(el.parentElement);
   return {same:target===el||el.contains(target),
     hit:target?.outerHTML.slice(0,300), x,y,navHidden:document.querySelector('#wg-shell-nav')?.hidden,
     pointerEvents:css.pointerEvents,visibility:css.visibility,display:css.display,
     opacity:css.opacity,transform:css.transform,translate:css.translate,
     parentPointerEvents:parent.pointerEvents,buttonOuter:el.outerHTML.slice(0,240)};
 });
 receipt['hit_'+profile]=hit;
 await page.screenshot({path:resolve(output,profile+'-cypher-preclick.png'),fullPage:true});
 assert.equal(hit.same,true,'Codex reading control is covered by another ship layer: '+JSON.stringify(hit));
 await button.click();
 await page.waitForTimeout(120);
 const observed=await page.evaluate(()=>({
   cypher:document.querySelector('[data-codex-english]')?.getAttribute('data-cypher-state'),
   status:document.querySelector('[data-codex-status]')?.textContent,
   sample:document.querySelector('[data-codex-english]')?.textContent?.slice(0,170),
   media:matchMedia('(prefers-reduced-motion: reduce)').matches,
   wayglassMotion:document.documentElement.dataset.wgMotion,
   runeCount:document.querySelectorAll('[data-codex-english] [data-cypher-line="runes"]').length,
   clicks:window.__cypherClicks,
   sameButton:window.__cypherButton===document.querySelector('[data-codex-translate]'),
   stillReady:document.querySelector('[data-surface="wayglass-universal-codex"]')?.getAttribute('data-codex-ready'),
   buttonDisabled:document.querySelector('[data-codex-translate]')?.disabled,
   activeSurface:document.documentElement.dataset.wayglassSurface,
 }));
 receipt['codex_'+profile]=observed;
 assert.equal(observed.cypher,'reading','Codex must enter visible glyph passage: '+JSON.stringify(observed));
 assert.ok(observed.runeCount>0,'Visible glyph intermediate missing: '+JSON.stringify(observed));
 const material=await reading.evaluate(el=>({
  background:getComputedStyle(el,'::before').backgroundImage,
  state:el.getAttribute('data-cypher-state'),
  busy:el.getAttribute('aria-busy'),
 }));
 assert.match(material.background,/labradorite|data:image|url\(/);
 assert.equal(material.busy,'true');
 await page.waitForFunction(()=>document.querySelector(
  '[data-codex-english] [data-cypher-visual-phase="full-runes"]'
 ),null,{timeout:7500});
 const runeSample=await page.locator('[data-codex-english] [data-cypher-visual-phase="full-runes"]').first().innerText();
 assert.match(runeSample,/[ᚠ-ᛟ⋈◇⊕⟁⌘]/u,'Ritual passage must visibly become glyphs, not merely ordinary text with a glow');
 await page.screenshot({path:resolve(output,profile+'-cypher-runes.png'),fullPage:true});
 await page.locator('[data-codex-skip]').click();
 assert.equal(await reading.getAttribute('data-cypher-state'),'english');
 const coded=reading.locator('.wg-cypher-line');
 assert.ok(await coded.count()>=8);
 assert.equal(await reading.locator('[data-cypher-line="runes"]').count(),0);
 assert.equal(await coded.first().getAttribute('lang'),'en-GB');
 assert.equal(await source.inputValue(),original,'Reading must not mutate WTL source');
 if(profile==='mobile'){
  const overlap=await page.evaluate(()=>{
    const a=document.querySelector('.wg-codex-toolbar').getBoundingClientRect();
    const items=[...document.querySelectorAll('.wg-ship-switch,.wg-voyage-inbox')];
    return items.filter(node=>{
      const b=node.getBoundingClientRect();
      return b.left<a.right&&b.right>a.left&&b.top<a.bottom&&b.bottom>a.top;
    }).map(node=>node.className);
  });
  assert.deepEqual(overlap,[],'Mobile Wayglass utilities may not obscure the Cypher toolbar');
 }
 await page.screenshot({path:resolve(output,profile+'-cypher-english.png'),fullPage:true});
 await source.fill(original+'\n');
 assert.equal(await reading.getAttribute('data-cypher-state'),'idle');
 assert.match(await reading.innerText(),/Source changed/);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('[data-codex-translate]').click();
 assert.equal(await reading.getAttribute('data-cypher-state'),'english','Reduced motion must reveal complete English immediately');
 assert.equal(await page.locator('[data-codex-skip]').isDisabled(),true);
 await page.locator('[data-codex-pace]').selectOption('steady');
 receipt.scenarios.push({profile,room:'Universal Codex',status:'passed',runes:true,skip:true,
  reduced_motion:true,original_source_preserved:true});
}
async function checkWriting(page,profile){
 await shipRoom(page,'arcsweep:writing-room');
 await page.locator('#wg-wtl-details').waitFor();
 await page.locator('#wg-wtl-details summary').click();
 await page.locator('#wg-wtl-example').click();
 const source=page.locator('#wg-wtl-source');
 assert.equal(await page.locator('#wg-wtl-cypher-pace').inputValue(),'steady','Shared tempo persists across ship rooms');
 const original=await source.inputValue();
 assert.match(original,/mobius/);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('#wg-wtl-cypher').click();
 const reading=page.locator('#wg-wtl-gloss');
 assert.equal(await reading.isVisible(),true);
 assert.equal(await reading.getAttribute('aria-live'),'off');
 await page.waitForFunction(()=>document.querySelector('#wg-wtl-gloss')?.getAttribute('data-cypher-state')==='reading');
 await page.locator('#wg-wtl-cypher-skip').click();
 assert.equal(await reading.getAttribute('data-cypher-state'),'english');
 assert.equal(await reading.locator('.wg-cypher-line').first().getAttribute('lang'),'en-GB');
 await source.fill(original+'\n');
 assert.equal(await reading.isVisible(),false,'Source changes invalidate stale translation');
 assert.equal(await source.inputValue(),original+'\n');
 receipt.scenarios.push({profile,room:'Writing Room',status:'passed',skip:true,source_invalidation:true});
}
try{
 browser=await chromium.launch({headless:true});
 for(const profile of ['desktop','mobile']){
  const context=await browser.newContext(profile==='desktop'
   ?{viewport:{width:1440,height:960},reducedMotion:'no-preference'}
   :{viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin){await route.abort('blockedbyclient');return;}
   if(url.pathname==='/api/v1/wayglass/routes'){
    await route.fulfill({json:{routes:[{route_id:'wayglass:ship',label:'Wayglass · Ship Voice',configured:true}]}});
    return;
   }
   if(url.pathname==='/api/v1/wayglass/respond'){
    const request=route.request().postDataJSON();
    assert.equal(request.surface_id,'wayglass:living-watercolor');
    assert.equal(request.route_id,'wayglass:ship');
    assert.match(request.input,/fenced wyrdrune block/);
    await route.fulfill({json:{schema:'wayglass.route-turn/v0.1',route_id:'wayglass:ship',
      participant_id:'wayglass',provider:'fixture',model:'fixture',output:chatReply,
      receipt:{observation_id:'watercolour-cypher-fixture',character_id:'wayglass',
        voice_seat_kind:'system-voice-over-external-route'}}});
    return;
   }
   if(url.pathname.startsWith('/api/')){await route.fulfill({status:503,json:{error:'Browser fixture; no provider invoked'}});return;}
   await route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>receipt.page_errors.push(String(error.stack||error)));
  await page.goto(origin,{waitUntil:'networkidle'});
  await checkWatercolour(page,profile);
  await checkWatercolourChat(page,profile);
  await checkCodex(page,profile);
  await checkWriting(page,profile);
  await context.close();
 }
 assert.deepEqual(receipt.page_errors,[],'No unhandled browser errors');
 receipt.status='passed';
}catch(error){receipt.status='failed';receipt.failure=String(error.stack||error);process.exitCode=1;}
finally{
 await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2));
 await browser?.close();
 await new Promise(ok=>server.close(ok));
 console.log(JSON.stringify({status:receipt.status,scenarios:receipt.scenarios.length,failure:receipt.failure||null}));
}
