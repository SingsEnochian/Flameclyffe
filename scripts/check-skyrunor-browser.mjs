// Real Chromium/WebKit execution of the exact offline artifact and production
// workbench component. The shell supplies a labelled eight-lane test context;
// compilation/execution use the actual authenticated local host router.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import {randomBytes,createHash} from 'node:crypto';
import {build} from 'vite';
import {chromium,webkit} from 'playwright';
const require=createRequire(new URL('../apps/starwell-server/package.json',import.meta.url));
// Never use a real store or a real owner credential during browser acceptance.
for(const key of ['SUPABASE_URL','SUPABASE_PROJECT_URL','VITE_SUPABASE_URL','SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY'])delete process.env[key];
const token=randomBytes(32).toString('hex');process.env.ARCSWEEP_RUNTIME_TOKEN=token;
const express=require('express');
const {createWayglassRouter}=require('./wayglass/router.js');
const ids=['authority-kernel','wyrdrune-language','eightfold-mobius','sensory-body','observer-science','constellation-agency','return-universe','cloud-host-install'];
const out=resolve('artifacts/skyrunor');await mkdir(out,{recursive:true});
const built=await build({configFile:false,logLevel:'error',build:{write:false,minify:true,lib:{entry:'virtual:sky-test',name:'SkyTest',formats:['iife']}},plugins:[{
 name:'skyrunor-browser-fixture',resolveId(id){if(id.endsWith('virtual:sky-test'))return '\0sky-test';},
 load(id){if(id==='\0sky-test')return `import {mountWayglassProgramWorkbench} from ${JSON.stringify(resolve('apps/wayglass/src/surfaces/program-workbench.js').replaceAll('\\','/'))};
 globalThis.__wayglassOS={kernel:{inspect:()=>({system_count:8,assembled_systems:8,systems:${JSON.stringify(ids.map(id=>({id,state:'ASSEMBLED'})))}})}};
 mountWayglassProgramWorkbench(document.getElementById('root'));`;}
}]});
const bundleOutput=Array.isArray(built)?built[0].output:built.output;
const bundle=bundleOutput.find(x=>x.type==='chunk').code;
const css=bundleOutput.filter(x=>x.type==='asset'&&x.fileName.endsWith('.css')).map(x=>x.source).join('\n');
const html=await readFile('dist/ipad/First-Lantern-iPad.html','utf8');
const app=express();app.use(express.json());
let executions=0;app.use((req,res,next)=>{if(req.path.endsWith('/workbench')&&req.body?.mode==='execute')executions++;next();});
app.use('/api/v1/wayglass',createWayglassRouter());
app.get('/ipad',(_req,res)=>res.type('html').send(html));
app.get('/workbench',(_req,res)=>res.type('html').send('<!doctype html><html lang="en-GB"><meta charset="utf-8"><style>'+css+'</style><div id="root"></div><script>'+bundle.replace(/<\/script/gi,'<\\/script')+'</script></html>'));
const server=app.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const receipts=[];
try{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,extraHTTPHeaders:{authorization:'Bearer '+token}});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/ipad');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Ready'));
   const tabletColumns=await page.locator('.layout').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
   assert.equal(tabletColumns,1,'iPad portrait must use readable single-column authoring');
   await context.setOffline(true);
   await page.locator('summary').filter({hasText:'Semantic Skýrunor'}).click();
   await page.click('#declaration-btn');
   assert.equal(await page.inputValue('#semantic'),'ᛋᚴ:ᛗ/ᛖ/ᚲ=ᚺᚷ!ᛞ');
   assert.match(await page.textContent('#output'),/Not executed/);
   await page.click('#run-btn');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('committed'));
   const result=JSON.parse(await page.textContent('#output'));
   assert.equal(result.status,'committed');assert.deepEqual(result.output,['My eyes are hazel green','Held']);
   const receipt=JSON.parse(await page.textContent('#receipt'));
   assert.equal(receipt.declaration.basis,'owner-declared');assert.equal(receipt.physically_verified,false);
   // Legacy byte transport remains usable beside semantic glyphs.
   await page.locator('summary').filter({hasText:'English ⇄ WTL'}).click();
   const source=await page.inputValue('#wtl');await page.click('#runes-btn');assert.ok((await page.inputValue('#runes')).startsWith('ᛟᛟ'));
   await page.click('#from-runes-btn');assert.equal(await page.inputValue('#wtl'),source);
   await page.fill('#semantic','ᛋᚴ:ᛗ/ᛖ/ᚲ=᛿!ᛞ');await page.click('#from-semantic-btn');
   assert.match(await page.textContent('#status'),/Refused/);assert.equal(await page.inputValue('#wtl'),source);
   await page.locator('summary').filter({hasText:'General change proposals'}).click();await page.click('#change-btn');
   assert.equal(await page.isDisabled('#run-btn'),true);
   const proposal=JSON.parse(await page.textContent('#receipt'));assert.equal(proposal.execution_supported,false);assert.equal(proposal.executed,false);
   await page.click('#reset-btn');await page.click('#semantic-btn');assert.ok((await page.inputValue('#semantic')).startsWith('ᛋᚴᚹ:'));
   // Same-turn click places Feather before the awaited animation-frame boundary.
   await page.evaluate(()=>{document.querySelector('#run-btn').click();document.querySelector('#feather-btn').click();});
   await page.waitForFunction(()=>!document.querySelector('#run-btn').disabled);
   assert.match(await page.textContent('#status'),/Feather/);
   await page.click('#run-btn');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('committed'));
   assert.deepEqual(JSON.parse(await page.textContent('#output')).output,[9,'Held']);
   // Fiction panel is open by default on iPad so the Compose control is visible.
   await page.click('#fiction-compose-btn');
   assert.match(await page.inputValue('#wtl'),/mobius scoped/);
   const fictionPreview=JSON.parse(await page.textContent('#fiction-preview'));
   assert.equal(fictionPreview.status,'compiled-not-executed');
   await page.click('#run-btn');
   await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('committed'));
   const fictionRun=JSON.parse(await page.textContent('#output'));
   assert.equal(fictionRun.status,'committed');
   assert.equal(fictionRun.cycles,6);
   assert.equal(fictionRun.fiction.proposed_effects.length,2);
   assert.deepEqual(fictionRun.carry,{story_step:6});
   assert.deepEqual(fictionRun.fiction.external_effects,[]);
   assert.equal(await page.isDisabled('#fiction-project-btn'),false);
   await page.click('#fiction-project-btn');
   await page.waitForFunction(()=>document.querySelector('#fiction-door').textContent.includes('open'));
   const ipadProjection=JSON.parse(await page.textContent('#fiction-render'));
   assert.equal(ipadProjection.physical_world_affected,false);
   assert.equal(ipadProjection.results.filter(e=>e.kind==='fictional-state'&&e.applied).length,1);
   await page.click('#fiction-stop-btn');
   assert.equal(await page.isDisabled('#fiction-project-btn'),true);
   assert.match(await page.textContent('#fiction-door'),/closed/);
   await page.screenshot({path:resolve(out,name+'-ipad.png'),fullPage:true});
   await context.setOffline(false);
   await page.goto(base+'/workbench');await page.waitForSelector('[data-language-bridge]');
   await page.locator('[data-language-bridge] summary').first().click();
   const before=executions;
   await page.click('[data-sky-declaration]');assert.equal(executions,before);
   assert.equal(await page.inputValue('#wg-sky-glyphs'),'ᛋᚴ:ᛗ/ᛖ/ᚲ=ᚺᚷ!ᛞ');
   await page.click('[data-program-compile]');await page.waitForFunction(()=>document.querySelector('[data-program-state]').textContent==='Compiled');assert.equal(executions,before);
   await page.click('[data-program-run]');await page.waitForFunction(()=>document.querySelector('[data-program-state]').textContent==='Committed');
   const hosted=JSON.parse(await page.textContent('[data-program-output]'));
   assert.deepEqual(hosted.execution.output,['My eyes are hazel green','Held']);assert.equal(hosted.semantic.physically_verified,false);assert.equal(executions,before+1);
   await page.locator('summary').filter({hasText:'General change proposals'}).click();await page.click('[data-sky-change]');
   assert.equal(await page.isDisabled('[data-program-run]'),true);assert.equal(executions,before+1);
   assert.equal(JSON.parse(await page.textContent('[data-program-output]')).execution_supported,false);
   await page.locator('[data-fiction-authoring] summary').click();
   await page.click('[data-fiction-compose]');
   assert.equal(executions,before+1,'Fiction composition is not execution');
   assert.equal(JSON.parse(await page.textContent('[data-fiction-preview]')).crossings,6);
   await page.click('[data-program-run]');
   await page.waitForFunction(()=>document.querySelector('[data-program-state]').textContent==='Committed');
   const fictionHosted=JSON.parse(await page.textContent('[data-program-output]'));
   assert.equal(fictionHosted.fiction.crossings,6);
   assert.deepEqual(fictionHosted.fiction.carry,{story_step:6});
   assert.equal(fictionHosted.fiction.proposed_effects.length,2);
   assert.deepEqual(fictionHosted.fiction.external_effects,[]);
   assert.equal(executions,before+2);
   assert.equal(await page.isDisabled('[data-fiction-approve]'),false);
   await page.click('[data-fiction-approve]');
   await page.waitForFunction(()=>document.querySelector('[data-fiction-door]').textContent.includes('open'));
   const hostedProjection=JSON.parse(await page.textContent('[data-fiction-render]'));
   assert.equal(hostedProjection.physical_world_affected,false);
   assert.equal(hostedProjection.results.filter(e=>e.kind==='fictional-state'&&e.applied).length,1);
   assert.equal(executions,before+2,'User-approved fiction projection never invokes host WTL again');
   await page.click('[data-fiction-stop]');
   assert.equal(await page.isDisabled('[data-fiction-approve]'),true);
   await page.screenshot({path:resolve(out,name+'-workbench.png'),fullPage:true});
   assert.deepEqual(errors,[]);
   receipts.push({browser:name,status:'passed',offline_artifact_execution:result,authenticated_host_execution:hosted.execution.status,
    no_execution_on_translation:true,feather_before_commit:true,unsupported_change_execution_blocked:true,fiction_cycles_verified:6,fiction_effects_proposed_only:true,approved_fiction_projections:true,physical_world_affected:false,page_errors:errors});
   await context.close();
  }finally{await browser.close();}
 }
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
await writeFile(resolve(out,'browser-receipt.json'),JSON.stringify({schema:'wyrdrune.skyrunor-browser-acceptance/v0.1',
 artifact_sha256:createHash('sha256').update(html).digest('hex'),receipts,
 shell_context:'eight-lane fixture; real production workbench component and authenticated router',
 ipad_hardware_tested:false,production_deployment_tested:false},null,2)+'\n');
console.log('Passed Chromium and WebKit: offline artifact, shared workbench, real host, no implicit execution, Feather, unsupported changes.');


