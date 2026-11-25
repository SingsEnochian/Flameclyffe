// Capture candidates only; never silently approve a baseline.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const origin=process.env.WAYGLASS_VISUAL_URL || 'http://127.0.0.1:4173';
const rooms=[['living-watercolor','watercolor'],['writing-room','writing'],['universal-codex','codex'],['living-observer','observer'],['systems','organs'],['world-continuity','worlds']];
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
   for(const [room,route] of rooms){
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const url=new URL(origin);url.searchParams.set('room',route);
    await page.goto(url.href,{waitUntil:'domcontentloaded'});
    await page.locator('html[data-wayglass-surface="wayglass:'+room+'"]').waitFor({timeout:20000});
    await page.evaluate(()=>document.fonts.ready);
    const ux=await page.evaluate(()=>{
      const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
      const controls=[...document.querySelectorAll('button,a[href],input,select,textarea,[role="button"]')].filter(visible);
      const name=e=>e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')||e.labels?.[0]?.textContent||e.textContent?.trim()||e.getAttribute('title')||e.getAttribute('alt')||'';
      return {
        horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
        controlCount:controls.length,
        unnamed:controls.filter(e=>!name(e)).map(e=>({tag:e.tagName,id:e.id})),
        smallTargets:controls.filter(e=>{const r=e.getBoundingClientRect();return r.width<24||r.height<24;}).map(e=>({name:name(e),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),
        fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),
        rendering:document.body.dataset.wayglassField||'unspecified'
      };
    });
    if(ux.horizontalOverflow>1)errors.push('Horizontal viewport overflow: '+ux.horizontalOverflow);
    const surface=await page.locator('html').getAttribute('data-wayglass-surface');
    const name=device+'-'+room+'.png';
    const png=await page.screenshot({path:output+'/'+name,animations:'disabled',caret:'hide'});
    const approved=baseline+'/'+name;
    const hash=b=>createHash('sha256').update(b).digest('hex');
    let status='awaiting-approved-reference', pixelDifference=null;
    if(existsSync(approved)){
      const a=PNG.sync.read(await readFile(approved)), b=PNG.sync.read(png);
      if(a.width!==b.width||a.height!==b.height){status='changed';pixelDifference={dimensionMismatch:true};}
      else {
        const diff=new PNG({width:a.width,height:a.height});
        let changed=0;
        for(let i=0;i<a.data.length;i+=4){
          const delta=Math.max(...[0,1,2,3].map(k=>Math.abs(a.data[i+k]-b.data[i+k])));
          if(delta)changed++;
          diff.data[i]=delta?255:Math.round(b.data[i]*.25);
          diff.data[i+1]=delta?0:Math.round(b.data[i+1]*.25);
          diff.data[i+2]=delta?180:Math.round(b.data[i+2]*.25);
          diff.data[i+3]=255;
        }
        pixelDifference={changed,total:a.width*a.height,fraction:changed/(a.width*a.height)};
        status=changed?'changed':'exact-match';
        await writeFile(output+'/'+name.replace('.png','-diff.png'),PNG.sync.write(diff));
      }
    }
    if(surface!=='wayglass:'+room)errors.push('Unexpected mounted surface: '+surface);
    if(errors.length || status==='changed' || (process.env.WAYGLASS_REQUIRE_BASELINE==='1' && status!=='exact-match'))failed=true;
    receipts.push({device,room,surface,status,pixelDifference,ux,sha256:hash(png),errors});
    await page.close();
   }
  } finally {await context.close();}
 }
} finally {await browser.close();await writeFile(output+'/receipt.json',JSON.stringify(receipts,null,2));}
if(failed)process.exitCode=1;
