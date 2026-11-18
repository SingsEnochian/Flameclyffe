'use strict';
// PR-scoped gate: prevents one evergreen example from satisfying every future change.
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {validate}=require('./wayglass-build-preflight.cjs');
const relevant=/^(apps\/wayglass\/|apps\/starwell-server\/wayglass\/|lib\/wayglass-|scripts\/wayglass-|\.github\/workflows\/wayglass-)/;
function verify({changed,headRef,root=process.cwd()}){
  const relevantChanges=changed.filter(x=>relevant.test(x)&&!x.startsWith('.wayglass/preflights/'));
  if(!relevantChanges.length)return [];
  const slug=headRef.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,140);
  const expected='.wayglass/preflights/'+slug+'.json';
  const errors=[];
  if(!changed.includes(expected))return ['Missing PR-specific changed preflight: '+expected];
  const filename=path.join(root,expected);
  try{
    const plan=JSON.parse(fs.readFileSync(filename,'utf8'));
    errors.push(...validate(plan,root));
    if(plan.head_ref!==headRef)errors.push('head_ref must match PR head branch');
    // FAEberpunk is a shipwide patrol obligation, including backend-only changes.
    // Claims are evidence-labelled; CI cannot impersonate browser or model runs.
    const fae=plan.faeberpunk;
    if(!fae || typeof fae!=='object')errors.push('faeberpunk: shipwide acceptance matrix required');
    else {
      for(const field of ['materials_interactions','watercolour_entry','eightfold_mobius','harmony_chaos','codex_rich_text','real_route_presence','sensory_accessibility','feather_return','before_after','browser_ipad','accessibility','ci','blocked']){
        const item=fae[field];
        if(!item || !['changed','unchanged','blocked','not_applicable'].includes(item.status) || typeof item.evidence!=='string' || item.evidence.trim().length<20)
          errors.push('faeberpunk.'+field+': status and substantive evidence required');
      }
      if(fae.browser_ipad?.status==='changed' && !fae.browser_ipad?.receipt)
        errors.push('faeberpunk.browser_ipad: verified change requires browser receipt');
      if(fae.before_after?.status==='changed' && !fae.before_after?.receipt)
        errors.push('faeberpunk.before_after: visible change requires before/after receipt');
    }
    if(!Array.isArray(plan.changed_systems)||!relevantChanges.every(file=>plan.changed_systems.some(prefix=>typeof prefix==='string'&&file.startsWith(prefix))))errors.push('changed_systems must cover every changed Wayglass file');
  }catch(e){errors.push('Cannot parse PR preflight: '+e.message);}
  return errors;
}
function main(){
  const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
  if(!event.pull_request)throw new Error('PR event required');
  const base=event.pull_request.base.sha;
  const head=event.pull_request.head.sha;
  const changed=execFileSync('git',['diff','--name-only',base+'...'+head],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
  const errors=verify({changed,headRef:event.pull_request.head.ref});
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
  else console.log('Wayglass PR-specific preflight passed; runtime and browser evidence still checked separately.');
}
if(require.main===module){try{main()}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={verify};
