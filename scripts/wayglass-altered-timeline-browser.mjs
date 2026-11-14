import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import {resolve,relative,extname,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';

// Real Chromium room acceptance: only local host, no network providers or
// production claims. The source and altered history must remain distinct.
const dist=resolve('dist/wayglass'),out=resolve('artifacts/wayglass/altered-timeline-browser');
const modulePath=process.env.WAYGLASS_PLAYWRIGHT_MODULE;
if(!modulePath)throw new Error('Pinned Playwright module required');
const playwright=resolve(modulePath);
const pkg=JSON.parse(await readFile(resolve(dirname(playwright),'package.json'),'utf8'));
assert.equal(pkg.version,'1.62.1');
const {chromium}=await import(pathToFileURL(playwright).href);
await stat(resolve(dist,'index.html'));
await mkdir(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const path=decodeURIComponent(url.pathname);
  const filename=resolve(dist,'.'+(path==='/'?'/index.html':path));
  const rel=relative(dist,filename);
  if(rel==='..'||rel.startsWith('..'+sep)||rel.startsWith(sep)){
    res.writeHead(403);res.end();return;
  }
  const body=await readFile(filename);
  res.writeHead(200,{'content-type':mime[extname(filename)]||'application/octet-stream'});res.end(body);
 }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end('Asset unavailable');}
});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
const origin='http://127.0.0.1:'+server.address().port;
const receipt={schema:'wayglass.altered-timeline-browser/v1',
  source_sha:process.env.GITHUB_SHA||null,status:'running',
  external_routes_invoked:false,canon_committed:false,physical_timeline_changed:false,
  scenarios:[],errors:[]};
let browser;
async function enter(page){
 await page.locator('.wg-ship-switch').click();
 const button=page.locator('[data-surface-id="wayglass:altered-timeline"]');
 await button.scrollIntoViewIfNeeded();
 await button.click();
 await page.locator('[data-surface="altered-timeline"]').waitFor({state:'visible'});
}
async function verify(page,profile){
 const room=page.locator('[data-surface="altered-timeline"]');
 const original=page.locator('[data-alt-original-track]'),altered=page.locator('[data-alt-child-track]');
 assert.match(await original.innerText(),/fictional council debates/);
 assert.match(await altered.innerText(),/unwritten/);
 await page.screenshot({path:resolve(out,profile+'-original.png'),fullPage:true});
 await page.locator('[data-alt-strength]').evaluate(el=>{el.value='80';el.dispatchEvent(new Event('input',{bubbles:true}));});
 assert.equal(await page.locator('[data-alt-strength-output]').innerText(),'80%');
 await page.locator('[data-alt-introduce]').click();
 await page.waitForFunction(()=>document.querySelector('[data-surface="altered-timeline"]')?.dataset.alteredState==='branched');
 assert.match(await original.innerText(),/fictional council debates/,'Source must remain unchanged');
 assert.match(await altered.innerText(),/limited pilot with independent audits/);
 assert.equal(await room.locator('[data-alt-ripples] meter').count(),4);
 assert.equal(await page.locator('[data-alt-original]').isDisabled(),true);
 assert.equal(await room.locator('[data-alt-withness]').innerText().then(v=>v.includes('WTL:')),true);
 await page.screenshot({path:resolve(out,profile+'-branched.png'),fullPage:true});
 await page.locator('[data-alt-mode]').selectOption('insert');
 await page.locator('[data-alt-title]').fill('A public oversight group meets for the first time.');
 await page.locator('[data-alt-introduce]').click();
 await page.waitForFunction(()=>document.querySelectorAll('[data-alt-child-track] .wg-altered-event').length===2);
 assert.match(await altered.innerText(),/oversight group/);
 assert.equal(await original.locator('.wg-altered-event').count(),1);
 await page.locator('[data-alt-undo]').click();
 assert.equal(await altered.locator('.wg-altered-event').count(),1);
 assert.doesNotMatch(await altered.innerText(),/oversight group/);
 await page.locator('[data-alt-save]').click();
 assert.match(await page.locator('[data-alt-status]').innerText(),/Saved on this device/);
 await page.reload({waitUntil:'networkidle'});
 await enter(page);
 assert.match(await page.locator('[data-alt-child-track]').innerText(),/unwritten/);
 await page.locator('[data-alt-restore]').click();
 assert.match(await page.locator('[data-alt-child-track]').innerText(),/limited pilot/);
 assert.match(await page.locator('[data-alt-original-track]').innerText(),/fictional council debates/);
 await page.locator('[data-alt-feather]').click();
 assert.equal(await room.locator('[data-alt-introduce]').isDisabled(),true);
 assert.equal(await room.getAttribute('data-altered-state'),'paused');
 await page.locator('[data-alt-resume]').click();
 assert.equal(await room.getAttribute('data-altered-state'),'branched');
 assert.equal(await room.locator('[data-alt-introduce]').isDisabled(),false);
 await page.emulateMedia({reducedMotion:'reduce'});
 assert.equal(await room.locator('[data-alt-introduce]').isDisabled(),false);
 if(profile==='mobile'){
  const layout=await page.evaluate(()=>{
    const r=document.querySelector('.wg-altered').getBoundingClientRect();
    const f=document.querySelector('.wg-altered-form').getBoundingClientRect();
    const c=document.querySelector('.wg-altered-chamber').getBoundingClientRect();
    return {viewport:innerWidth,room_right:r.right,form_right:f.right,chamber_right:c.right,
      form_bottom:f.bottom,chamber_top:c.top};
  });
  assert.ok(layout.room_right<=layout.viewport+2,'Mobile room clips horizontally: '+JSON.stringify(layout));
  assert.ok(layout.form_right<=layout.viewport+2,'Mobile form clips horizontally: '+JSON.stringify(layout));
  assert.ok(layout.chamber_right<=layout.viewport+2,'Mobile chamber clips horizontally: '+JSON.stringify(layout));
  assert.ok(layout.chamber_top>=layout.form_bottom-8,'Mobile layout overlaps: '+JSON.stringify(layout));
 }
 await page.screenshot({path:resolve(out,profile+'-restored.png'),fullPage:true});
 receipt.scenarios.push({profile,status:'passed',worldseed_branch:true,original_immutable:true,
  two_changes:true,undo:true,save_restore:true,feather:true,reduced_motion:true});
}
try{
 browser=await chromium.launch({headless:true});
 for(const profile of ['desktop','mobile']){
  const context=await browser.newContext(profile==='desktop'?
    {viewport:{width:1440,height:950},reducedMotion:'no-preference'}:
    {viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin){await route.abort('blockedbyclient');return;}
    if(url.pathname.startsWith('/api/')){
      await route.fulfill({status:503,json:{error:'No model, runtime or remote host allowed in browser test'}});
      return;
    }
    await route.continue();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>receipt.errors.push(String(e.stack||e)));
  await page.goto(origin,{waitUntil:'networkidle'});
  await enter(page);
  await verify(page,profile);
  await context.close();
 }
 assert.deepEqual(receipt.errors,[],'No unhandled browser errors');
 receipt.status='passed';
}catch(error){receipt.status='failed';receipt.failure=String(error.stack||error);process.exitCode=1;}
finally{
 await writeFile(resolve(out,'receipt.json'),JSON.stringify(receipt,null,2));
 await browser?.close();
 await new Promise(ok=>server.close(ok));
 console.log(JSON.stringify({status:receipt.status,scenarios:receipt.scenarios.length,failure:receipt.failure||null}));
}
