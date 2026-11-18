'use strict';
// Machine-checked Wayglass preflight for proposed architecture changes.
// Usage: node scripts/wayglass-build-preflight.cjs path/to/plan.json
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const QUESTIONS = Object.freeze([
  'existing_systems','root_problem','reuse_decision','integration_impact',
  'complete_operation','verification_plan','return_continuity','remaining_boundaries',
  'withness_wholeness'
]);
function validate(plan, root=process.cwd()) {
  const errors=[];
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return ['Preflight must be an object'];
  if (plan.schema !== 'wayglass.build-preflight/v0.1') errors.push('Invalid schema');
  for(const field of QUESTIONS) {
    if(typeof plan[field]!=='string' || plan[field].trim().length<20) errors.push(field+': substantive answer required (20+ characters)');
  }
  const evidence=plan.existing_evidence;
  if(!Array.isArray(evidence)||evidence.length===0) errors.push('existing_evidence: cite at least one existing path');
  else for(const file of evidence){
    if(typeof file!=='string'||path.isAbsolute(file)||file.split(/[\\/]/).includes('..')||!fs.existsSync(path.join(root,file)))errors.push('existing_evidence: invalid or missing repo path '+file);
  }
  if(!['extend','reuse','new'].includes(plan.decision)) errors.push('decision: must be extend, reuse or new');
  if(plan.decision==='new' && (!plan.duplication_justification||plan.duplication_justification.trim().length<40))errors.push('new component requires explicit duplication justification');
  if(!Array.isArray(plan.verification_commands)||plan.verification_commands.length===0)errors.push('verification_commands: at least one concrete command required');
  if(plan.live_verified===true && (!Array.isArray(plan.live_receipts)||plan.live_receipts.length===0))errors.push('live_verified needs a real receipt');
  return errors;
}
function main(){
  const filename=process.argv[2];
  if(!filename){console.error('Usage: node scripts/wayglass-build-preflight.cjs plan.json');process.exitCode=2;return;}
  try{
    const root=execFileSync('git',['rev-parse','--show-toplevel'],{encoding:'utf8'}).trim();
    const errors=validate(JSON.parse(fs.readFileSync(filename,'utf8')),root);
    if(errors.length){console.error('Wayglass preflight blocked:\n'+errors.map(e=>' - '+e).join('\n'));process.exitCode=1;return;}
    console.log('Wayglass preflight: PASS (declarations checked; implementation and live tests still require execution).');
  }catch(error){console.error('Wayglass preflight error: '+error.message);process.exitCode=1;}
}
if(require.main===module)main();
module.exports={validate,QUESTIONS};
