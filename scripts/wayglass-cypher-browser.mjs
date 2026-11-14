import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

// Source-faithful real-browser verification of two existing ship rooms.
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
}
async function checkCodex(page,profile){
 await shipRoom(page,'wayglass:universal-codex');
 const scene=page.locator('[data-surface="wayglass-universal-codex"]');
 await scene.waitFor({state:'visible'});
 const source=page.locator('#codex-source');
 const original=await source.inputValue();
 assert.match(original,/mobius/);
 const reading=page.locator('[data-codex-english]');
 assert.equal(await reading.getAttribute('aria-live'),'off');
 await page.locator('[data-codex-translate]').click();
 await page.waitForFunction(()=>document.querySelector('[data-codex-english]')?.getAttribute('data-cypher-state')==='reading');
 await page.waitForFunction(()=>document.querySelector('[data-codex-english] [data-cypher-line="runes"]'));
 const material=await reading.evaluate(el=>({
  background:getComputedStyle(el,'::before').backgroundImage,
  state:el.getAttribute('data-cypher-state'),
  busy:el.getAttribute('aria-busy'),
 }));
 assert.match(material.background,/labradorite|data:image|url\(/);
 assert.equal(material.busy,'true');
 await page.screenshot({path:resolve(output,profile+'-cypher-runes.png'),fullPage:true});
 await page.locator('[data-codex-skip]').click();
 assert.equal(await reading.getAttribute('data-cypher-state'),'english');
 const coded=reading.locator('.wg-cypher-line');
 assert.ok(await coded.count()>=8);
 assert.equal(await coded.filter({has:page.locator('[data-cypher-line="runes"]')}).count(),0);
 assert.equal(await coded.first().getAttribute('lang'),'en-GB');
 assert.equal(await source.inputValue(),original,'Reading must not mutate WTL source');
 await page.screenshot({path:resolve(output,profile+'-cypher-english.png'),fullPage:true});
 await source.fill(original+'\n');
 assert.equal(await reading.getAttribute('data-cypher-state'),'idle');
 assert.match(await reading.innerText(),/Source changed/);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('[data-codex-translate]').click();
 assert.equal(await reading.getAttribute('data-cypher-state'),'english','Reduced motion must reveal complete English immediately');
 assert.equal(await page.locator('[data-codex-skip]').isDisabled(),true);
 receipt.scenarios.push({profile,room:'Universal Codex',status:'passed',runes:true,skip:true,
  reduced_motion:true,original_source_preserved:true});
}
async function checkWriting(page,profile){
 await shipRoom(page,'arcsweep:writing-room');
 await page.locator('#wg-wtl-details').waitFor();
 await page.locator('#wg-wtl-details summary').click();
 await page.locator('#wg-wtl-example').click();
 const source=page.locator('#wg-wtl-source');
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
   const url=new URL(route.request().url);
   if(url.origin!==origin){await route.abort('blockedbyclient');return;}
   if(url.pathname.startsWith('/api/')){await route.fulfill({status:503,json:{error:'Browser fixture; no provider invoked'}});return;}
   await route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',error=>receipt.page_errors.push(String(error.stack||error)));
  await page.goto(origin,{waitUntil:'networkidle'});
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
