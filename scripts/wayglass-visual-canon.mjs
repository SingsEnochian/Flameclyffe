// Capture candidates only; never silently approve a baseline.
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const origin=process.env.WAYGLASS_VISUAL_URL || 'http://127.0.0.1:4173';
const rooms=['writing-room','universal-codex','living-observer'];
const devices=[['desktop',1440,900],['ipad',1024,1366],['iphone',390,844]];
const output='artifacts/wayglass-visual';
const baseline='apps/wayglass/visual-canon/approved';
await mkdir(output,{recursive:true});
const browser=await chromium.launch();
const receipts=[];
let failed=false;
try {
 for(const [device,width,height] of devices){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',locale:'en-GB',isMobile:device==='iphone',hasTouch:device!=='desktop'});
  try {
   for(const room of rooms){
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const url=new URL(origin);url.searchParams.set('room','wayglass:'+room);
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await page.locator('html[data-wayglass-surface]').waitFor({timeout:20000});
    await page.evaluate(()=>document.fonts.ready);
    const surface=await page.locator('html').getAttribute('data-wayglass-surface');
    const name=device+'-'+room+'.png';
    const png=await page.screenshot({path:output+'/'+name,animations:'disabled',caret:'hide'});
    const approved=baseline+'/'+name;
    const hash=b=>createHash('sha256').update(b).digest('hex');
    const status=!existsSync(approved)?'awaiting-approved-reference':hash(await readFile(approved))===hash(png)?'exact-match':'changed';
    if(errors.length || status==='changed' || (process.env.WAYGLASS_REQUIRE_BASELINE==='1' && status!=='exact-match'))failed=true;
    receipts.push({device,room,surface,status,sha256:hash(png),errors});
    await page.close();
   }
  } finally {await context.close();}
 }
} finally {await browser.close();await writeFile(output+'/receipt.json',JSON.stringify(receipts,null,2));}
if(failed)process.exitCode=1;
