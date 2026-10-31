/** Read-only translation from vessel application process to cosmetic hull/3D parameters.
 * Output is NOT evidence of mind, agency, biological state or a geometric mesh.
 */
import { VESSEL_ECOLOGY_SCHEMA } from './vessel-ecology.js';
export const VESSEL_EMBODIMENT_SCHEMA='wayglass.vessel-embodiment-projection/v0.1';
const clamp=n=>Math.min(1,Math.max(0,n));
const quant=n=>Math.round(n*1000)/1000;
export function projectVesselEmbodiment(state,{reducedMotion=false}={}){
 if(!state||state.schema!==VESSEL_ECOLOGY_SCHEMA)throw Error('Unknown vessel state source');
 const m=state.metrics;
 if(!m||!['activity','integrity','adaptation','signal'].every(k=>Number.isFinite(m[k])&&m[k]>=0&&m[k]<=1))throw Error('Invalid source metrics');
 const still=state.feather_held===true||reducedMotion===true;
 return Object.freeze({
  schema:VESSEL_EMBODIMENT_SCHEMA,source_schema:VESSEL_ECOLOGY_SCHEMA,
  source_sequence:state.sequence,
  epistemic_status:'deterministic visual mapping only',
  hull_rim_alpha:quant(clamp(.12+.3*m.signal)),
  core_luminance:quant(clamp(.15+.52*m.activity)),
  copper_route_clarity:quant(clamp(.25+.56*m.integrity)),
  ring_offset_radians:quant(clamp(m.adaptation)*Math.PI*.12),
  motion_amplitude:still?0:quant(.05+.15*m.activity),
  audio_started:false,
  movement_stopped:still,
 });
}
