// Proposal-only deterministic encounter kernel. No inference or canon mutation.
export function encounter({left,right,signal,consent,feather=false}) {
  if (feather) return Object.freeze({status:'stopped',reason:'Feather'});
  const valid = p => p && typeof p.id === 'string' && /^[\w.:-]{1,128}$/.test(p.id) &&
    Number.isFinite(p.spin) && p.spin >= -1 && p.spin <= 1 &&
    Number.isSafeInteger(p.revision) && p.revision >= 0 && p.revision < Number.MAX_SAFE_INTEGER;
  if (!valid(left) || !valid(right) || left.id === right.id) throw Error('Distinct valid participants required');
  // Only own, plain data-property grants count; getters and inherited grants cannot authorise an encounter.
  const granted = id => {
    if (!consent || typeof consent !== 'object') return false;
    const descriptor = Object.getOwnPropertyDescriptor(consent,id);
    return descriptor?.value === true;
  };
  if (!granted(left.id) || !granted(right.id))
    return Object.freeze({status:'declined',participants:Object.freeze([left.id,right.id])});
  if (!signal || !['touch','word','sound','wtl'].includes(signal.kind) ||
      typeof signal.value !== 'string' || signal.value.length > 256 || !signal.value.length ||
      typeof signal.source !== 'string' || !signal.source.trim()) throw Error('Attributed bounded signal required');
  const coupling = Math.round((1 - Math.abs(left.spin-right.spin)/2)*1000)/1000;
  // Distinct signals yield distinct, bounded visual proposals without changing identity.
  const influence = {touch:0.18,word:0.08,sound:0.24,wtl:0.12}[signal.kind];
  const phase = Math.round((left.spin-right.spin)*1000)/1000;
  const proposed_field = Object.freeze({resonance:Math.round(Math.min(1,coupling*influence)*1000)/1000,
    phase,kind:signal.kind});
  return Object.freeze({status:'proposal',schema:'wayglass.mobius-encounter/v0.1',
    participants:Object.freeze([left.id,right.id]),identity_spins:Object.freeze([left.spin,right.spin]),
    source:signal.source,signal:Object.freeze({kind:signal.kind,value:signal.value}),coupling,proposed_field,
    proposed_revisions:Object.freeze(Object.assign(Object.create(null),{[left.id]:left.revision+1,[right.id]:right.revision+1})),
    persisted:false,canon_adopted:false});
}
