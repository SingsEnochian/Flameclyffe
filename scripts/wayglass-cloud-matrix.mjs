import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Eight concurrent verification jobs, not eight live model/participant agents.
const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const output = resolve(process.env.WAYGLASS_MATRIX_OUTPUT || resolve(root,'artifacts/wayglass/cloud-matrix'));
const head = git('rev-parse','HEAD'), tree = git('rev-parse','HEAD^{tree}');
const canonical = git('rev-parse','origin/wayglass/current');
try { execFileSync('git',['merge-base','--is-ancestor',canonical,head],{cwd:root,stdio:'ignore'}); } catch { throw new Error('Canonical development is not an ancestor of this source; reconcile exact head first'); }
// Server staging intentionally rewrites generated tracked legacy assets.
// Exclude only those build destinations; all authored source remains exact-head.
const generated = ['apps/starwell-server/public/arcsweep','apps/starwell-server/wayglass-runtime'];
const sourcePaths = ['.',...generated.map(p=>':(exclude)'+p)];
const dirty = () => [git('diff','--name-only','HEAD','--',...sourcePaths),git('ls-files','--others','--exclude-standard','--',...sourcePaths)].filter(Boolean).join('\n');
if (process.env.WAYGLASS_FEATHER === 'stopped') throw new Error('Feather stopped: no matrix jobs started');
if (dirty()) throw new Error('Commit tracked changes before exact-head matrix');
const files = async (directory, pattern) => (await readdir(resolve(root,directory))).filter(name=>pattern.test(name)).sort().map(name=>directory+'/'+name);
const specs = [
 ['protocol', 'test', /^wayglass-mcp-(core|http|server|port|async-routes|oauth-metadata)\.test\.cjs$/],
 ['authorization','test',/^wayglass-mcp-introspection.*\.test\.cjs$/],
 ['native-routing','test',/^wayglass-mcp-(native-bridge|respond|integrated)\.test\.cjs$/],
 ['durable-return','test',/^wayglass-presentation-recovery\.test\.cjs$/],
 ['motion','apps/wayglass/test',/^(motion-choreography|glass-field|sound-composition-ui).*\.test\.js$/],
 ['cloud-health','test',/^wayglass-cloud-host\.test\.cjs$/],
 ['canonical-return','test/wayglass',/.*\.test\.cjs$/],
 ['arcsweep-deck','apps/wayglass/test',/^arcsweep-deck.*\.test\.js$/],
];
await mkdir(output,{recursive:true});
const receipt = {schema:'wayglass.cloud-matrix/v1',source_sha:head,source_tree:tree,canonical_source_sha:canonical,
 actor_id:'codex:withness-integrator',worker_kind:'local-test-coordinator',model_inference:false,
 deployed_service_verified:false,participant_turn_verified:false,generated_output_exclusions:generated,started_at:new Date().toISOString(),jobs:[],status:'running'};
async function run([id,directory,pattern]) {
 const selected=await files(directory,pattern);
 if(id==='arcsweep-deck'){selected.push(...await files('test',/^wayglass-(sound-composition|composition-projection|composition-deck-channel|story-score)\.test\.mjs$/),...await files('apps/arcsweep/test',/^(composition-inheritance|story-wyrdrune-score)\.test\.js$/),'apps/starwell-server/test/arcsweep-frame.test.js');}
 if(!selected.length)return {id,status:'blocked',reason:'No matching tests in exact source'};
 const log=resolve(output,id+'.log');
 return new Promise(resolveJob=>{
  const command=[process.execPath,'--test',...selected];
  const child=spawn(command[0],command.slice(1),{cwd:root,env:{...process.env,NODE_PATH:resolve(root,'apps/starwell-server/node_modules')},stdio:['ignore','pipe','pipe']});
  const chunks=[];let timedOut=false;
  child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>chunks.push(b));
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),2000).unref();},180000);
  child.on('error',error=>chunks.push(Buffer.from(String(error))));
  child.on('close',async(code,signal)=>{
   clearTimeout(timer);const text=Buffer.concat(chunks).toString('utf8');await writeFile(log,text);
   const counts=Object.fromEntries(['tests','pass','fail','skipped','todo'].map(key=>[key,Number(text.match(new RegExp('(?:#|ℹ) '+key+' (\\d+)'))?.[1] || 0)]));
   const status=code===0&&!timedOut&&counts.tests>0&&counts.fail===0&&counts.skipped===0&&counts.todo===0?'passed':'failed';
   resolveJob({id,status,command:command.map(p=>p.replace(root,'')),exit_code:code,signal,timed_out:timedOut,...counts,log:id+'.log'});
  });
 });
}
receipt.jobs=await Promise.all(specs.map(run));
receipt.finished_at=new Date().toISOString();
receipt.source_unchanged=git('rev-parse','HEAD')===head&&git('rev-parse','origin/wayglass/current')===canonical&&!dirty();
receipt.status=receipt.source_unchanged&&receipt.jobs.every(job=>job.status==='passed')?'passed':'failed';
await writeFile(resolve(output,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
process.exitCode=receipt.status==='passed'?0:1;
