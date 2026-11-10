import {createHash} from 'node:crypto';
import {classifyShipVerification} from '../lib/wayglass-verification-status.mjs';
import {spawn,execFileSync} from 'node:child_process';
import {readdir,mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const developmentGate=process.argv.includes('--development-gate');
if(process.argv.slice(2).some(a=>a!=='--development-gate'))throw Error('Unknown verification option');
const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8'}).trim();
const generated=['apps/starwell-server/public/arcsweep','apps/starwell-server/wayglass-runtime','apps/starwell-server/public/starwell-foundry'];
const paths=['.',...generated.map(p=>':(exclude)'+p)];
const dirty=()=>[git('diff','--name-only','HEAD','--',...paths),git('ls-files','--others','--exclude-standard','--',...paths)].filter(Boolean).join('\n');
if(dirty())throw Error('Commit authored source before shipwide verification');
if(process.env.WAYGLASS_FEATHER==='stopped')throw Error('Feather stopped: verification not started');
const head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
const canonical=git('rev-parse','origin/wayglass/current');
execFileSync('git',['merge-base','--is-ancestor',canonical,head],{cwd:root});
const output=resolve(process.env.WAYGLASS_SHIPWIDE_OUTPUT||resolve(root,'artifacts/wayglass/shipwide'));
await mkdir(output,{recursive:true});
const select=async(dir,pattern)=>(await readdir(resolve(root,dir))).filter(n=>pattern.test(n)).sort().map(n=>dir+'/'+n);
const lanes=[
 ['authority', [['apps/starwell-server/test',/^(eightfold-route-custody|security-boundary|wayglass-ship-watercolor-compat)\.test\.js$/],['apps/wayglass/test',/^wayglass-kernel.*\.test\.js$/]]],
 ['wyrdrune', [['lib/wyrdrune',/\.test\.cjs$/],['lib',/^wayglass-wyrdrune.*\.test\.cjs$/],['apps/wayglass/test',/^(wyrdrune-cypher|wayglass-native-voice-media|wayglass-spelling-wyrdrune)\.test\.js$/]]],
 ['mobius', [['test',/^(wayglass-mobius(?!-training).*|gestalt-01.*)\.test\.mjs$/],['test/wayglass',/^quad-eightfold.*\.test\.cjs$/],['apps/wayglass/test',/^wayglass-double-mobius\.test\.js$/]]],
 ['body', [['apps/wayglass/test',/^(first-contact-ui|foundry-brushes|watercolor-body|living-watercolor-entry|watercolor-model-integrity|ship-soundscape|acoustic.*|somatic-sound|motion-choreography)\.test\.js$/],['apps/starwell/test',/^glyphStudio\.test\.js$/],['test',/^wayglass-(sound-palette|composition-projection|sound-composition)\.test\.mjs$/]]],
 ['observer', [['apps/wayglass/test',/^wayglass-(living-observer.*|noaa-live|learning-memory-client)\.test\.js$/],['test/wayglass',/^noaa.*\.test\.cjs$/],['apps/arcsweep/test',/^noaa-mobius-chaos-benchmark\.test\.js$/]]],
 ['agency', [['test',/^wayglass-(bloodstream|mobius-training)\.test\.mjs$/],['apps/wayglass/test',/^(agent-self-naming|wayglass-participation|wayglass-universe-visitors)\.test\.js$/]]],
 ['return', [['test/wayglass',/^(?!noaa|quad).*\.test\.cjs$/],['apps/wayglass/test',/^(watercolor-continuity|wayglass-stop-receipt|wayglass-return-engine-trial|wayglass-universe)\.test\.js$/],['apps/starwell-server/test',/^wayglass-learning-memory\.test\.js$/]]],
 ['host', [['test',/^wayglass-(mcp-.*|cloud-host|presentation-recovery)\.test\.cjs$/],['test/wayglass',/^mcp-oauth-preflight\.test\.mjs$/],['apps/starwell-server/test',/^wayglass-(ship-inheritance|primary-entry|mcp-bridge)\.test\.js$/],['apps/wayglass/test',/^(installation|wayglass-gateway|hearthgate-server-bundle)\.test\.js$/]]],
];
async function run([id,specs]){
 const files=[...new Set((await Promise.all(specs.map(([d,p])=>select(d,p)))).flat())];
 if(!files.length)return {id,status:'blocked',reason:'No matching tests'};
 return new Promise(done=>{
  const child=spawn(process.execPath,['--test',...files],{cwd:root,env:{...process.env,NODE_PATH:resolve(root,'apps/starwell-server/node_modules')},stdio:['ignore','pipe','pipe']});
  const chunks=[];let timedOut=false;
  child.stdout.on('data',x=>chunks.push(x));child.stderr.on('data',x=>chunks.push(x));
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),2000).unref();},120000);
  child.on('error',e=>chunks.push(Buffer.from(String(e))));
  child.on('close',async(code,signal)=>{
   clearTimeout(timer);const log=Buffer.concat(chunks).toString();await writeFile(resolve(output,id+'.log'),log);
   const counts=Object.fromEntries(['tests','pass','fail','skipped','todo'].map(k=>[k,Number(log.match(new RegExp('(?:#|ℹ) '+k+' (\\d+)'))?.[1]||0)]));
   const status=code!==0||timedOut||counts.fail||!counts.tests?'failed':counts.todo||counts.skipped?'incomplete':'passed';
   console.log(id+': '+status+' ('+counts.pass+' passed; '+counts.todo+' TODO)');
   done({id,status,...counts,exit_code:code,signal,timed_out:timedOut,files,log:id+'.log'});
  });
 });
}
const receipt={schema:'wayglass.shipwide-verification/v1',source_sha:head,source_tree:tree,canonical_sha:canonical,
 started_at:new Date().toISOString(),live_inference:false,production_deployment:false,generated_output_exclusions:generated};
receipt.lanes=await Promise.all(lanes.map(run));
receipt.source_unchanged=head===git('rev-parse','HEAD')&&!dirty();
receipt.status=!receipt.source_unchanged||receipt.lanes.some(l=>l.status==='failed'||l.status==='blocked')?'failed':receipt.lanes.some(l=>l.status==='incomplete')?'incomplete':'passed';
const baseline=JSON.parse(await readFile(resolve(root,'lib/wyrdrune/conformance/development-baseline.v0.2.json'),'utf8'));
const baselineMatched=baseline.schema==='wayglass.wtl-development-baseline/v1'&&baseline.todo_count===baseline.unclaimed_fixtures.length&&
 (await Promise.all(Object.entries(baseline.source_sha256).map(async([file,sha])=>createHash('sha256').update(await readFile(resolve(root,file))).digest('hex')===sha))).every(Boolean);
receipt.language_baseline={matched:baselineMatched,expected_todos:baseline.todo_count,source:'lib/wyrdrune/conformance/development-baseline.v0.2.json'};
Object.assign(receipt,classifyShipVerification(receipt,{baselineMatched,expectedLanguageTodos:baseline.todo_count}));
receipt.gate_kind=developmentGate?'development-regression':'strict-release';
receipt.finished_at=new Date().toISOString();await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log('Whole ship: '+receipt.status);process.exitCode=(developmentGate?receipt.development_status!=='failed':receipt.release_ready)?0:1;
