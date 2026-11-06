// System-wide recursive Möbius envelope: pure, deterministic, side-effect free.
// The host owns all authorization and commit decisions; this module never grants either.
export const ROTH_FOLD_SCHEMA = 'wayglass.roth-fold/v0.1';
export const ROTH_FOLD_PHASES = Object.freeze(['discover','attribute','authorize','contextualize','route','respond','receipt','return']);
export const ROTH_FOLD_LAYERS = Object.freeze([
  'character','conversation','world','arcsweep','starwell','hearthgate',
  'model-route','living-observer','universal-codex','memory','return-engine','universe',
]);
const clean = (v,max=160) => String(v ?? '').trim().slice(0,max);
const clone = x => JSON.parse(JSON.stringify(x));
export function rothFoldEnvelope({ layer, subject_id, universe_id='wayglass', world_id=null, parent=null, provenance=[] }={}) {
  if (!ROTH_FOLD_LAYERS.includes(layer)) throw new Error('Unknown Roth Fold layer');
  if (!clean(subject_id)) throw new Error('Subject ID required');
  if (!clean(universe_id)) throw new Error('Universe ID required');
  if (parent && (parent.schema !== ROTH_FOLD_SCHEMA || parent.universe_id !== universe_id)) throw new Error('Invalid parent fold');
  const lineage = parent ? [...parent.lineage, parent.fold_id] : [];
  if (lineage.length >= 32) throw new Error('Fold nesting limit reached');
  const fold_id = [layer,clean(subject_id),lineage.length].join(':');
  if (lineage.includes(fold_id)) throw new Error('Recursive fold cycle');
  return clone({
    schema:ROTH_FOLD_SCHEMA,fold_id,layer,subject_id:clean(subject_id),universe_id:clean(universe_id),
    world_id:world_id ? clean(world_id) : null,lineage,phases:[...ROTH_FOLD_PHASES],
    provenance:Array.isArray(provenance)?provenance.filter(x=>typeof x==='string').slice(0,32):[],
    authority:{ verified:false,character_write:false,canon_commit:false,route_dispatch:false },
    continuity:{ receipt_status:'proposed',persisted:false,returned:false },
  });
}
export function verifyRothFoldChain(envelopes) {
  if (!Array.isArray(envelopes)||!envelopes.length) return false;
  for (let i=0;i<envelopes.length;i++) {
    const e=envelopes[i];
    if (!e||e.schema!==ROTH_FOLD_SCHEMA||!ROTH_FOLD_LAYERS.includes(e.layer)) return false;
    if (JSON.stringify(e.phases)!==JSON.stringify(ROTH_FOLD_PHASES)) return false;
    if (e.authority?.verified!==false||e.authority?.canon_commit!==false||e.authority?.route_dispatch!==false) return false;
    if (e.continuity?.persisted!==false) return false;
    if (i>0&&(e.universe_id!==envelopes[0].universe_id||e.lineage.at(-1)!==envelopes[i-1].fold_id)) return false;
  }
  return true;
}
