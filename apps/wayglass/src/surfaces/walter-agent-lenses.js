// Deterministic, read-only agent-lens scaffold. No model calls or autonomous execution.
export const WALTER_AGENT_SEATS = Object.freeze([
  {id:'chronologist',label:'Chronologist',lens:'calendar',question:'What does the 17-year gap establish, and what remains unknown?'},
  {id:'continuity',label:'Continuity Keeper',lens:'provenance',question:'Are 1933 Britain and 1950 America kept as distinct attributed sources?'},
  {id:'geometer',label:'Fold Geometer',lens:'geometry',question:'What graph topology does this hypothesis produce, without claiming a physical fold?'},
  {id:'symbolist',label:'Symbolic Interpreter',lens:'meaning',question:'What symbolic correspondences are suggested, without presenting them as measurements?'},
  {id:'skeptic',label:'Contradiction Witness',lens:'critique',question:'Which tempting conclusions exceed the evidence?'}
]);
export function runWalterAgentLenses(receipt) {
  if (receipt?.schema !== 'wayglass.walter-hypothesis/v0.1') throw new Error('Invalid Walter receipt');
  if (!Array.isArray(receipt.sources) || receipt.sources.length!==2 || new Set(receipt.sources.map(s=>s.id)).size!==2) throw new Error('Two distinct sources required');
  return WALTER_AGENT_SEATS.map(seat=>({
    schema:'wayglass.agent-lens-receipt/v0.1',
    agent_id:seat.id,agent_label:seat.label,mode:'deterministic-read-only',question:seat.question,
    source_ids:receipt.sources.map(s=>s.id),
    hypothesis_model:receipt.model,
    finding:({
      chronologist:'1933 to 1950 is a 17-year calendar difference; no precise crossing time or physical location is established.',
      continuity:'The two source IDs remain distinct; shared naming is not an identity merge.',
      geometer:'The selected model is a representational graph, not a measured Jacobian or physical spacetime fold.',
      symbolist:'Symbolic connections are open for interpretation, with no empirical status assigned.',
      skeptic:'The third point is unresolved; no identity merge, physical transit, or third event is evidenced.'
    })[seat.id],
    evidence_status:'interpretive-control',authority:'none',external_actions:[]
  }));
}
