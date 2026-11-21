// Pure, reproducible artistic response to a consented encounter proposal.
// The proposal never changes participant identity, carries state, or declares canon.
export function composeNurseryBloom(proposal) {
  if (!proposal || proposal.status !== 'proposal' || !proposal.proposed_field ||
      !Array.isArray(proposal.identity_spins) || proposal.identity_spins.length !== 2 ||
      !Array.isArray(proposal.participants) || proposal.participants.length !== 2 ||
      proposal.participants.some(id=>typeof id!=='string'||!id.trim()||id.length>128) ||
      proposal.participants[0]===proposal.participants[1] ||
      typeof proposal.source!=='string' || !proposal.source.trim() || proposal.source.length>256 ||
      typeof proposal.signal?.value!=='string' || proposal.signal.value.length>512)
    throw new Error('A consented encounter proposal is required');
  const {resonance,phase,kind}=proposal.proposed_field;
  if (![resonance,phase,...proposal.identity_spins].every(Number.isFinite) ||
      resonance<0 || resonance>1 || Math.abs(phase)>2 ||
      !['touch','word','sound','wtl'].includes(kind))
    throw new Error('Invalid bounded encounter geometry');
  // Length-safe structural encoding prevents delimiter-collision between identities and signals.
  const seed=JSON.stringify([proposal.source,kind,proposal.signal.value,
    proposal.participants,proposal.identity_spins]);
  let hash=2166136261;
  for (const char of seed) hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  const rand=()=>{hash=(Math.imul(hash,1664525)+1013904223)>>>0;return hash/4294967296;};
  const count=6+Math.floor(resonance*18);
  const filaments=Array.from({length:count},(_,i)=>{
    const theta=(i/count)*Math.PI*2+phase;
    const radius=0.5+resonance*1.5+rand()*0.3;
    return Object.freeze({
      x:Number((Math.cos(theta)*radius).toFixed(4)),
      y:Number((Math.sin(theta)*radius).toFixed(4)),
      z:Number(((rand()-0.5)*(1+resonance)).toFixed(4)),
      scale:Number((0.03+rand()*0.08+resonance*0.04).toFixed(4))
    });
  });
  return Object.freeze({schema:'wayglass.nursery-bloom/v0.1',kind,
    phase,resonance,filaments:Object.freeze(filaments),
    persisted:false,canon_adopted:false});
}
