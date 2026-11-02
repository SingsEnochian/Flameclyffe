import { createWalterReceipt } from './walter-third-point.js';
import { runWalterAgentLenses, WALTER_AGENT_SEATS } from './walter-agent-lenses.js';
export const THIRD_LIGHT_MODELS=Object.freeze(['linear','branch','fold','projection','third']);
export function buildThirdLightTrainingMission(){
  const tasks=THIRD_LIGHT_MODELS.flatMap(model=>{
    const receipt=createWalterReceipt(model,'Wayglass Observer');
    return runWalterAgentLenses(receipt).map(agent=>({
      schema:'wayglass.agent-training-task/v0.1',mission_id:'third-light-001',
      task_id:model+':'+agent.agent_id,agent_id:agent.agent_id,
      model,source_ids:agent.source_ids,
      instruction:'Review '+model+' using your assigned lens. Produce a finding, constraint, open question, discriminating observation, epistemic label and provenance. Do not invent evidence or promote canon.',
      seed_control_finding:agent.finding,
      status:'queued-not-executed',requires_model_runtime:true
    }));
  });
  return {schema:'wayglass.agent-training-mission/v0.1',mission_id:'third-light-001',
    name:'Operation THIRD LIGHT',seats:WALTER_AGENT_SEATS.map(s=>s.id),
    tasks,task_count:tasks.length,status:'training-scaffold-only',
    next_evidence_action:'Review original photographed Dream-Voyage notes for exact Walter wording and provenance.',
    owner_approval_required_for_canon:true};
}
