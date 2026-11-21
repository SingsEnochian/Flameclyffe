// Pure, bounded encounter journal. No storage, network, canon promotion or agent inference.
export function createNurseryJournal(limit=64) {
  if(!Number.isSafeInteger(limit)||limit<1||limit>512)throw Error('Invalid journal limit');
  let entries=[];
  let generation=0;
  const snapshot=()=>Object.freeze(entries.map(e=>Object.freeze({...e,participants:Object.freeze([...e.participants])})));
  return Object.freeze({
    record(proposal) {
      if(!proposal||proposal.status!=='proposal'||proposal.persisted!==false||
        !Array.isArray(proposal.participants)||proposal.participants.length!==2||
        proposal.participants[0]===proposal.participants[1]||
        !proposal.source||!proposal.proposed_field)throw Error('Only attributed reciprocal proposals may be observed');
      const entry={sequence:generation++,status:'observed-proposal',participants:[...proposal.participants],
        source:proposal.source,kind:proposal.proposed_field.kind,
        resonance:proposal.proposed_field.resonance,canon_adopted:false,persisted:false};
      entries=[...entries.slice(-(limit-1)),entry];
      return Object.freeze({...entry,participants:Object.freeze([...entry.participants])});
    },
    feather() {
      const count=entries.length;
      entries=[];generation++;
      return Object.freeze({status:'feather',cleared:count,persisted:false});
    },
    snapshot,
  });
}
