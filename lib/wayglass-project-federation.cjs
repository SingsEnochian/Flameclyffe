'use strict';
// Read-only Wayglass project federation. Declares attached organs, never grants access.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const ROOT = resolve(__dirname, '..');
const MANIFEST = resolve(ROOT, 'security/wayglass-project-federation.json');
const MODES = new Set(['native','attached-surface','specialist','kernel-organ','runtime-authority','offline-research']);
function inspectProjectFederation(value) {
 const errors=[];
 if(value?.schema !== 'wayglass.project-federation/v1') errors.push('schema');
 if(!Array.isArray(value?.projects)||!value.projects.length) errors.push('projects');
 const seen=new Set();
 for(const project of value?.projects||[]){
  if(typeof project?.id!=='string'||!/^[a-z0-9-]+$/.test(project.id)) errors.push('invalid id');
  if(seen.has(project?.id)) errors.push('duplicate id');
  seen.add(project?.id);
  if(!MODES.has(project?.mode)) errors.push('invalid mode');
  if(typeof project?.root!=='string'||project.root.startsWith('/')||project.root.includes('..')||project.root.includes('\\')) errors.push('unsafe root');
  if(typeof project?.role!=='string'||!project.role.trim()) errors.push('missing role');
 }
 return errors;
}
function publicProjectFederation() {
 const manifest=JSON.parse(readFileSync(MANIFEST,'utf8'));
 const errors=inspectProjectFederation(manifest);
 if(errors.length) throw new Error('Invalid Wayglass project federation: '+errors.join(', '));
 return Object.freeze({
  schema:manifest.schema,
  status:'declared-not-runtime-mounted',
  authority_grant:false,
  projects:manifest.projects.map(({id,role,mode})=>({id,role,mode,mounted:false}))
 });
}
module.exports={inspectProjectFederation,publicProjectFederation};
