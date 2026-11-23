// Pure, fail-closed prerequisite for the existing One Ship CI gate.
export const LAW_ID='WAYGLASS-LAW-FOCUS-001';
export const LAW_PATH='docs/wayglass/FOCUS_ROUTER_LAW_V0_1.md';

export function validateFocusLaw(impact, register, directive){
  if(!directive?.includes('## 4a. Mandatory Focus Router Law · '+LAW_ID))
    throw new Error('One Ship Directive has not adopted Focus Router Law.');
  if(register?.governance?.focus_router_law!==LAW_PATH||register?.governance?.focus_router_prerequisite!==true)
    throw new Error('Canonical register lacks mandatory Focus Router Law prerequisite.');
  if(impact?.schema!=='wayglass.change-impact/v1'||!Array.isArray(impact.entries))
    throw new Error('Invalid One Ship change-impact register.');
  if(impact.single_mission_issue!==583||impact.reconciliation_train_pr!==661)
    throw new Error('Focus Router must point to #583 mission and #661 integration train.');
  const fields=['duplicate_review','owner_outcome','finish_line','return_marker'];
  for(const entry of impact.entries){
    const id=String(entry?.change_id||'unnamed change'),f=entry?.focus_router;
    if(!f||typeof f!=='object'||Array.isArray(f))throw new Error(id+': Focus Router prerequisite missing.');
    if(f.law!==LAW_ID)throw new Error(id+': wrong Focus Router law identifier.');
    if(f.state!=='NOW')throw new Error(id+': NEXT/PARKED/BLOCKED work is not authorised for implementation.');
    if(f.mission_issue!==583||f.integration_pr!==661||f.routing!=='existing-train')
      throw new Error(id+': change must reconcile through existing #583/#661 train.');
    for(const key of fields)if(typeof f[key]!=='string'||!f[key].trim())
      throw new Error(id+': missing Focus Router '+key+'.');
  }
  return {law:LAW_ID,checked_entries:impact.entries.length,mission_issue:583,integration_pr:661};
}
