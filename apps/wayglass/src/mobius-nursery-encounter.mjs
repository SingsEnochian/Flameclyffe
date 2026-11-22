// Proposal-only deterministic encounter kernel. No inference or canon mutation.
export function encounter({left,right,signal,consent,feather=false}) {
  if (feather) return Object.freeze({status:'stopped',reason:'Feather'});
  // Snapshot only own data properties. Never execute a participant/signal getter while
  // deciding identity, consent or provenance. This is a proposal, not a live handle.
  const own = (obj,key) => obj && typeof obj === 'object'
    ? Object.getOwnPropertyDescriptor(obj,key)?.value : undefined;
  const snapshot = p => ({id:own(p,'id'),spin:own(p,'spin'),revision:own(p,'revision')});
  const L=snapshot(left),R=snapshot(right);
  const valid = p => typeof p.id === 'string' && /^[\\w.:-]{1,128}$/.test(p.id) &&
    Number.isFinite(p.spin) && p.spin >= -1 && p.spin <= 1 &&
    Number.isSafeInteger(p.revision) && p.revision >= 0 && p.revision < Number.MAX_SAFE_INTEGER;
  if (!valid(L) || !valid(R) || L.id === R.id) throw Error('Distinct valid participants required');
  // Only own, plain data-property grants count; getters and inherited grants cannot authorise an encounter.
  const granted = id => own(consent,id) === true;
  if (!granted(L.id) || !granted(R.id))
    return Object.freeze({status:'declined',participants:Object.freeze([L.id,R.id])});
  const S={kind:own(signal,'kind'),value:own(signal,'value'),source:own(signal,'source')};
  if (!['touch','word','sound','wtl'].includes(S.kind) ||
      typeof S.value !== 'string' || S.value.length > 256 || !S.value.length ||
      typeof S.source !== 'string' || !S.source.trim()) throw Error('Attributed bounded signal required');
  const coupling = Math.round((1 - Math.abs(L.spin-R.spin)/2)*1000)/1000;
  // Distinct signals yield distinct, bounded visual proposals without changing identity.
  const influence = {touch:0.18,word:0.08,sound:0.24,wtl:0.12}[S.kind];
  const phase = Math.round((L.spin-R.spin)*1000)/1000;
  const proposed_field = Object.freeze({resonance:Math.round(Math.min(1,coupling*influence)*1000)/1000,
    phase,kind:S.kind});
  return Object.freeze({status:'proposal',schema:'wayglass.mobius-encounter/v0.1',
    participants:Object.freeze([L.id,R.id]),identity_spins:Object.freeze([L.spin,R.spin]),
    source:S.source,signal:Object.freeze({kind:S.kind,value:S.value}),coupling,proposed_field,
    proposed_revisions:Object.freeze(Object.assign(Object.create(null),{[L.id]:L.revision+1,[R.id]:R.revision+1})),
    persisted:false,canon_adopted:false});
}
