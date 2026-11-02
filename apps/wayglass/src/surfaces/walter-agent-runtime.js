import { invokeWayglassRoute, listWayglassRoutes } from '../route-client.js';
import { buildThirdLightTrainingMission } from './walter-agent-training.js';
import { WALTER_AGENT_SEATS } from './walter-agent-lenses.js';

const SEAT_RULES = 'You are a scoped Wayglass research agent. Treat the source records as separate. Never invent observations or third coordinates. Distinguish sourced facts, mathematical calculation, narrative hypothesis, and symbolic interpretation. No canon promotion, tool calls, or external actions. Return JSON with keys finding, constraint, open_question, discriminating_observation, epistemic_label, source_ids. Keep all source IDs unchanged.';
const DEFAULT_ROUTE = 'openai:gpt';
function normalizeOutput(result) {
  if (typeof result?.output === 'string') return result.output;
  if (typeof result?.response === 'string') return result.response;
  if (typeof result?.text === 'string') return result.text;
  if (typeof result?.content === 'string') return result.content;
  return JSON.stringify(result);
}
export async function runThirdLightAgents({routeId=DEFAULT_ROUTE, model='third', fetchImpl=fetch, onProgress=()=>{}, maxTasks=25}={}) {
  const mission=buildThirdLightTrainingMission();
  if (!Number.isInteger(maxTasks)||maxTasks<1||maxTasks>25) throw new Error('maxTasks must be 1..25');
  if (!mission.tasks.some(t=>t.model===model)) throw new Error('Unknown Walter model');
  const tasks=mission.tasks.filter(t=>t.model===model).slice(0,maxTasks);
  const results=[];
  for (const task of tasks) {
    const seat=WALTER_AGENT_SEATS.find(s=>s.id===task.agent_id);
    const prompt=[SEAT_RULES,'Seat: '+seat.label+'. Lens: '+seat.lens+'. '+seat.question,
      'Mission: Operation THIRD LIGHT. Hypothesis: '+task.model,
      'Sourced records: Young Walter, 1933 Britain, ID walter:1933; Old Man Walter, 1950 America, ID walter:1950.',
      'These are named descriptions, not independently ingested photographed notes.',
      'Seed control (not evidence): '+task.seed_control_finding,
      task.instruction].join('\n');
    try {
      const response=await invokeWayglassRoute({
        routeId,harnessId:'wayglass:writing-room/direct-v0.1',
        surfaceId:'dream-voyage:walter-third-point',
        input:prompt,maxOutputTokens:800,fetchImpl
      });
      const output=normalizeOutput(response);
      const item={task_id:task.task_id,agent_id:task.agent_id,route_id:routeId,
        status:'model-response-unverified',source_ids:task.source_ids,output,
        evidence_status:'model-generated-not-source-verified',authority:'none'};
      results.push(item);onProgress(item);
    } catch(error) {
      const item={task_id:task.task_id,agent_id:task.agent_id,status:'route-error',error:String(error.message||error),authority:'none'};
      results.push(item);onProgress(item);
    }
  }
  return {schema:'wayglass.third-light-runtime-receipt/v0.1',mission_id:mission.mission_id,
    model,route_id:routeId,results,status:'completed-attempts-not-validated',
    canon_promoted:false,source_ids:['walter:1933','walter:1950']};
}
export async function getThirdLightRoutes(fetchImpl=fetch) {
  return listWayglassRoutes(fetchImpl);
}
