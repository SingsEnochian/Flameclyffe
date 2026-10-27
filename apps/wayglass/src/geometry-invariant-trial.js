/* Nikola geometry invariance v1: canonical SVG source, no provider, no external physics claims. */
import { geometrySVG } from '../../../starwell/deep-observer/living-observer-atlas.js';
export const GEOMETRY_TRIAL_SCHEMA='wayglass.geometry-invariant-trial/v1';
export const GEOMETRY_RECEIPT_SCHEMA='wayglass.geometry-invariant-receipt/v1';
const invariant=(ok,msg)=>{if(!ok)throw Error('Geometry trial: '+msg);};
const fixed=x=>Number(x.toFixed(10));
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x)}return x;};
export function extractAtlasLandmarks(form){
  invariant(form==='flower'||form==='metatron','only canonical Flower and Metatron sources accepted');
  const source=geometrySVG(form);
  const circles=[...source.matchAll(/<circle cx="(-?\d+(?:\.\d+)?)" cy="(-?\d+(?:\.\d+)?)" r="(\d+(?:\.\d+)?)"\/>/g)];
  invariant(circles.length>=7,'canonical SVG lacks inner seven-circle motif');
  return freeze({form,points:circles.slice(0,7).map(m=>[Number(m[1]),Number(m[2])]),
    source:'starwell/deep-observer/living-observer-atlas.js::geometrySVG',
    extraction:'first seven explicitly emitted circle centres',
    dependence:'Both sources use axialPoint in one canonical implementation',
    precision:'coordinate values rounded to 0.001 by atlas renderer'});
}
export function distanceSpectrum(points){
  invariant(Array.isArray(points)&&points.length>=3&&points.length<=48,'3–48 points required');
  invariant(points.every(p=>Array.isArray(p)&&p.length===2&&p.every(x=>Number.isFinite(x)&&Math.abs(x)<=1e9)),'finite planar points required');
  const d=[];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)d.push(Math.hypot(points[i][0]-points[j][0],points[i][1]-points[j][1]));
  const rms=Math.sqrt(d.reduce((s,x)=>s+x*x,0)/d.length);
  invariant(rms>1e-9&&Number.isFinite(rms),'degenerate distances');
  return d.map(x=>x/rms).sort((a,b)=>a-b);
}
export function mismatch(a,b){
  const x=distanceSpectrum(a),y=distanceSpectrum(b);
  invariant(x.length===y.length,'point counts must match');
  return fixed(Math.sqrt(x.reduce((s,v,i)=>s+(v-y[i])**2,0)/x.length));
}
function randomSequence(seed){
  invariant(Number.isInteger(seed)&&seed>0&&seed<=4294967295,'seed must be positive 32-bit integer');
  let x=seed>>>0;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
}
export function transformed(points){
  const a=1.243,c=Math.cos(a),s=Math.sin(a);
  return points.toReversed().map(([x,y])=>[12+2.7*(c*x-s*y),-9+2.7*(s*x+c*y)]);
}
function distortion(points){
  const out=points.map(p=>[...p]);const r=Math.hypot(out[1][0]-out[0][0],out[1][1]-out[0][1]);
  out[1][0]+=r*.42;out[1][1]-=r*.18;return out;
}
function randomAngles(points,rand){
  const cx=points.reduce((s,p)=>s+p[0],0)/points.length,cy=points.reduce((s,p)=>s+p[1],0)/points.length;
  return points.map(([x,y])=>{const r=Math.hypot(x-cx,y-cy),a=rand()*2*Math.PI;return[cx+r*Math.cos(a),cy+r*Math.sin(a)]});
}
export function calculateGeometryInvariantTrial({seed=104729,nullTrials=399}={}){
  invariant(Number.isInteger(nullTrials)&&nullTrials>=99&&nullTrials<=1999,'99–1999 null repetitions required');
  const flower=extractAtlasLandmarks('flower'),metatron=extractAtlasLandmarks('metatron');
  const score=mismatch(flower.points,metatron.points);
  const positive=mismatch(flower.points,transformed(flower.points));
  const negative=mismatch(flower.points,distortion(metatron.points));
  const rng=randomSequence(seed);
  const nullScores=Array.from({length:nullTrials},()=>mismatch(flower.points,randomAngles(metatron.points,rng)));
  const sorted=[...nullScores].sort((a,b)=>a-b);
  const successes=nullScores.filter(v=>v<=score+1e-10).length;
  const rank=fixed((successes+1)/(nullTrials+1));
  return freeze({
    schema:GEOMETRY_TRIAL_SCHEMA,
    question:'Does the same seven-point motif survive rotation, translation, scale and relabelling across two symbolic atlas drawings?',
    sources:[flower,metatron].map(({form,source,extraction,dependence,precision})=>({form,source,extraction,dependence,precision})),
    inputs:{seed,null_trials:nullTrials,landmarks_per_source:7},
    invariant:'RMS-normalised sorted pairwise-distance spectrum',
    preserved_under:['translation','rotation','reflection','uniform scale','point permutation'],
    null:'Independently randomised vertex angles preserving centroid-to-point radii (NOT shuffled labels)',
    controls:['rotation+scale+translation+permutation positive','single displaced vertex negative'],
    measurements:{
      observed_mismatch:score,positive_control_mismatch:positive,distorted_control_mismatch:negative,
      null_min:sorted[0],null_median:sorted[Math.floor(nullTrials/2)],null_max:sorted.at(-1),
      null_at_least_as_close:successes,null_rank:rank
    },
    verdict:{
      matched_within_svg_rounding:score<=0.00005,
      controls_discriminate:positive<=1e-9&&negative>0.01,
      independent_emergence:false,
      source_dependence:'Both source diagrams call the same axialPoint helper. The motif is deliberately built in.',
      interpretation:'Demonstration of a geometry comparison instrument, NOT evidence of a new physical invariant.',
      next:'Repeat on independently sourced mathematical outputs with preregistered landmarks and provenance.'
    },
    evidence_register:'synthetic geometric demonstration; not physical data, AI identity, or mathematical discovery',
  });
}
async function digest(value){
  invariant(Boolean(globalThis.crypto?.subtle),'WebCrypto required');
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function runGeometryInvariantTrial(args={}){
  const result=calculateGeometryInvariantTrial(args);
  return freeze({schema:GEOMETRY_RECEIPT_SCHEMA,engine:GEOMETRY_TRIAL_SCHEMA,trial:result,
    sha256:await digest(result),replay_rule:'Recalculate same source/seed/trial count; compare SHA-256 of canonical JSON.'});
}
export async function replayGeometryInvariantTrial(receipt){
  invariant(receipt?.schema===GEOMETRY_RECEIPT_SCHEMA,'unknown receipt');
  const verified=await runGeometryInvariantTrial({seed:receipt.trial?.inputs?.seed,nullTrials:receipt.trial?.inputs?.null_trials});
  return freeze({valid:verified.sha256===receipt.sha256,expected_digest:verified.sha256,
    provided_digest:receipt.sha256,claim:'Same code/source deterministic replay only; does not authenticate independent provenance'});
}
