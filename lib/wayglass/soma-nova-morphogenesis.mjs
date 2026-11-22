// Soma Nova pure morphogenesis planner. No persistence, devices, biology or network effects.
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const clone = value => {
  if (Array.isArray(value)) return value.map(clone);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, clone(value[key])]));
};
const stable = value => JSON.stringify(clone(value));
const hash = (value, hashSource) => {
  if (typeof hashSource === 'function') return hashSource(stable(value));
  // Deterministic fallback for preview identity only; hosts should inject SHA-256.
  let h=2166136261;
  for (const c of stable(value)) { h ^= c.charCodeAt(0); h=Math.imul(h,16777619); }
  return 'fnv1a32:'+ (h>>>0).toString(16).padStart(8,'0');
};
const protectedKeys = new Set(['identity_ref','memory','agency','values','consent','return_anchor']);
const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value); for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};
function validateForm(form,label) {
  if (!isRecord(form)) throw new TypeError(label+' must be a record');
  for (const key of ['identity_ref','form_id','domains']) if (!(key in form)) throw new TypeError(label+' missing '+key);
  if (typeof form.identity_ref!=='string'||!form.identity_ref.trim()) throw new TypeError(label+' identity_ref must be non-empty');
  if (typeof form.form_id!=='string'||!form.form_id.trim()) throw new TypeError(label+' form_id must be non-empty');
  if (!Array.isArray(form.domains)) throw new TypeError(label+' domains must be an array');
}
function diff(before,after,path='',out=[]) {
  const keys=new Set([...Object.keys(isRecord(before)?before:{}),...Object.keys(isRecord(after)?after:{})]);
  for (const key of [...keys].sort()) {
    const p=path?path+'.'+key:key, a=before?.[key], b=after?.[key];
    if (stable(a)===stable(b)) continue;
    if (isRecord(a)&&isRecord(b)) diff(a,b,p,out);
    else out.push({path:p,from:a===undefined?{state:'absent'}:clone(a),to:b===undefined?{state:'absent'}:clone(b)});
  }
  return out;
}
export function createMorphPlan(base,target,{author,source='unspecified',timestamp=null,hashSource}={}) {
  validateForm(base,'base'); validateForm(target,'target');
  if (base.identity_ref!==target.identity_ref) throw new Error('Identity anchor cannot change during morphology');
  if (base.form_id===target.form_id) throw new Error('Derived form requires a distinct form_id');
  if (target.parent_form_id!==base.form_id) throw new Error('target.parent_form_id must identify the base form');
  const protectedChanges=[];
  for (const key of protectedKeys) if (key in base && stable(base[key])!==stable(target[key])) protectedChanges.push(key);
  if (protectedChanges.length) throw new Error('Protected identity/continuity fields cannot change: '+protectedChanges.join(', '));
  const changes=diff(base,target);
  const body={schema:'soma-nova.morph-plan/v0.1',identity_ref:base.identity_ref,
    base_form_id:base.form_id,target_form_id:target.form_id,author:author??null,source,timestamp,
    before:clone(base),after:clone(target),changes};
  return deepFreeze({...body,plan_id:hash(body,hashSource)});
}
export function verifyMorphPlan(plan,{capabilities=[],environmentRequirements=[],accessibilityRequirements=[]}={}) {
  if (!isRecord(plan)||plan.schema!=='soma-nova.morph-plan/v0.1') throw new TypeError('Invalid MorphPlan');
  const supported=[],unsupported=[],unknown=[];
  const capSet=new Set(capabilities);
  for (const item of environmentRequirements) {
    if (!item||typeof item.name!=='string') throw new TypeError('Environment requirement needs a name');
    if (item.status==='supported') supported.push({name:item.name,evidence:item.evidence??null});
    else if (item.status==='unsupported') unsupported.push({name:item.name,evidence:item.evidence??null});
    else unknown.push({name:item.name,evidence:item.evidence??null});
  }
  const missingCapabilities=(plan.after.capabilities??[]).filter(cap=>!capSet.has(cap));
  for (const capability of missingCapabilities) unknown.push({name:'capability:'+capability,evidence:'No matching capability was supplied'});
  const missingAccessibility=accessibilityRequirements.filter(item=>item.status!=='supported');
  for (const item of missingAccessibility) {
    const entry={name:'accessibility:'+item.name,evidence:item.evidence??null};
    if (item.status==='unsupported') unsupported.push(entry); else unknown.push(entry);
  }
  const returnAnchor=plan.before.return_anchor??plan.before.form_id;
  return deepFreeze({schema:'soma-nova.compatibility/v0.1',plan_id:plan.plan_id,
    supported,unsupported,unknown,return_anchor:returnAnchor,
    reversible:Boolean(returnAnchor),status:unsupported.length?'unsupported':unknown.length?'unknown':'supported',
    canPreview:true,canCommit:unsupported.length===0&&unknown.length===0&&Boolean(returnAnchor)});
}
export function previewMorphPlan(plan,report) {
  if (!isRecord(plan)||plan.schema!=='soma-nova.morph-plan/v0.1') throw new TypeError('Invalid MorphPlan');
  if (!isRecord(report)||report.schema!=='soma-nova.compatibility/v0.1'||report.plan_id!==plan.plan_id) throw new Error('Matching compatibility report required');
  return deepFreeze({schema:'soma-nova.transform-preview/v0.1',plan_id:plan.plan_id,
    identity_ref:plan.identity_ref,before:clone(plan.before),after:clone(plan.after),
    changes:clone(plan.changes),compatibility:clone(report),state:'preview-only',
    persisted:false,externalEffects:'none'});
}
