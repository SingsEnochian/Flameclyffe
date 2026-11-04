// Ninth Point: a deterministic observer crossing for four Wayglass engines.
// Symbolic intention is preserved without being mistaken for physical measurement.
import {runQuadEngine} from './quad-engine.js';
const clone=x=>JSON.parse(JSON.stringify(x));
export function observePossibilities({packet,observer,weights,selection='maximum',threshold=0}={}){
 if(!packet||packet.schema!=='wayglass.possibility/v1'||!Array.isArray(packet.branches)||!packet.branches.length)throw Error('Invalid possibility packet');
 if(typeof observer!=='string'||!observer.trim())throw Error('Observer required');
 if(!['maximum','all-above-threshold'].includes(selection)||!Number.isFinite(threshold)||threshold<0||threshold>1)throw Error('Invalid observation policy');
 const branches=packet.branches;
 const ids=branches.map(b=>b.id);
 if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('Branch IDs must be unique');
 if(branches.some(b=>typeof b.probability!=='number'||!Number.isFinite(b.probability)||b.probability<0))throw Error('Invalid branch probability');
 const total=branches.reduce((sum,b)=>sum+b.probability,0);
 if(total<=0)throw Error('Zero probability mass');
 if(weights!==undefined&&(!Array.isArray(weights)||weights.length!==branches.length||weights.some(w=>!Number.isFinite(w)||w<0)))throw Error('Invalid observer weights');
 const adjusted=branches.map((b,i)=>b.probability/total*(weights?.[i]??1));
 const adjustedTotal=adjusted.reduce((a,b)=>a+b,0);
 if(adjustedTotal<=0)throw Error('Observer weights eliminate all branches');
 const candidates=branches.map((b,i)=>({id:b.id,probability:adjusted[i]/adjustedTotal}));
 const chosen=selection==='maximum'?[candidates.reduce((best,c)=>c.probability>best.probability?c:best,candidates[0]).id]:candidates.filter(c=>c.probability>=threshold).map(c=>c.id);
 return {schema:'wayglass.observation/v1',observer,sourcePacket:packet.id??null,selection,threshold,probabilities:candidates,selected:chosen,register:'COMPUTATIONAL_OBSERVATION',physicalMeasurement:false};
}
export function executeNinePoint({id,intention,observer,branches,weights,selection='maximum',threshold=0,quad={}}={}){
 if(typeof intention!=='string'||!intention.trim())throw Error('Intention required');
 const packet={schema:'wayglass.possibility/v1',id:id??null,intention,branches:clone(branches)};
 const engines=runQuadEngine({...quad,question:intention});
 const observation=observePossibilities({packet,observer,weights,selection,threshold});
 return {schema:'wayglass.nine-point/v1',intention,engines,packet,observation,continuity:{sourcePacket:packet.id,selectedBranchIds:observation.selected,observer},authorityGrant:false};
}
