// Frame-to-Fold Observatory. Only mathematical model coordinates move.
// A coordinate-plane encounter is not evidence of a physical crossing.
import {
  sheetConvergenceMap,
  sheetConvergenceJacobian,
  determinant3,
  singularValues3,
  CERTIFIED_PREIMAGES,
} from '../../starwell/src/lib/sheetConvergence.js';

export const FRAME_TO_FOLD_SCHEMA = 'wayglass.frame-to-fold/v0.1';
export const FRAME_TO_FOLD_MODELS = Object.freeze([
  Object.freeze({
    id: 'fold',
    label: 'Genuine fold plane',
    equation: 'F(x,y,z)=(x²,y,z)',
    plane: 'critical plane x=0',
    note: 'The Jacobian loses one rank exactly at x=0.',
  }),
  Object.freeze({
    id: 'stretch',
    label: 'Conditioning without a fold',
    equation: 'F(x,y,z)=(100x,y,z)',
    plane: 'reference plane x=0 (not a fold)',
    note: 'A large fold index can coexist with constant, nonsingular determinant.',
  }),
  Object.freeze({
    id: 'sheets',
    label: 'STARWELL converging sheets',
    equation: 'STARWELL polynomial · det J = −2',
    plane: 'reference plane x=0 (not a fold)',
    note: 'Distinct preimages share a target. The polynomial has no local Jacobian fold.',
  }),
]);

const identity = Object.freeze([[1,0,0],[0,1,0],[0,0,1]]);
const near = (a,b,t) => a + (b-a)*t;
const rounded = x => Number(x.toFixed(10));
const finite = x => Number.isFinite(x);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

export function sampleFrameToFold(modelId = 'fold', progress = 0) {
  if (!finite(progress) || progress < 0 || progress > 1) throw new RangeError('Progress must be a finite number in [0,1].');
  const model = FRAME_TO_FOLD_MODELS.find(item => item.id === modelId);
  if (!model) throw new TypeError('Unknown frame-to-fold model.');
  let origin, image, jacobian, determinant, singularValues;
  let rankLossCertificate = false;
  if (modelId === 'fold') {
    const x = 1 - 2 * progress;
    origin = [x,0,0];
    image = [x*x,0,0];
    jacobian = [[2*x,0,0],[0,1,0],[0,0,1]];
    determinant = 2*x;
    singularValues = [Math.abs(2*x),1,1].sort((a,b)=>b-a);
    rankLossCertificate = x === 0;
  } else if (modelId === 'stretch') {
    const x = 1 - 2 * progress;
    origin = [x,0,0];
    image = [100*x,0,0];
    jacobian = [[100,0,0],[0,1,0],[0,0,1]];
    determinant = 100;
    singularValues = [100,1,1];
  } else {
    const first = CERTIFIED_PREIMAGES[1];
    const second = CERTIFIED_PREIMAGES[2];
    origin = first.map((value,i)=>near(value,second[i],progress));
    image = sheetConvergenceMap(origin);
    jacobian = sheetConvergenceJacobian(origin);
    determinant = determinant3(jacobian);
    singularValues = singularValues3(jacobian);
  }
  const sigmaMax=singularValues[0];
  const sigmaMin=singularValues[singularValues.length-1];
  const conditionNumber=sigmaMin>1e-12?sigmaMax/sigmaMin:null;
  const foldIndex=clamp(1-sigmaMin/(sigmaMax+1e-12),0,1);
  const localClassification=rankLossCertificate?'MODEL_FOLD':
    modelId==='fold'?'FOLD_APPROACH_OR_DEPARTURE':'NO_LOCAL_FOLD';
  const planeDistance=origin[0];
  const planePosition=Math.abs(planeDistance)<=1e-12?'ON_PLANE':planeDistance>0?'POSITIVE_SIDE':'NEGATIVE_SIDE';
  return Object.freeze({
    schema:FRAME_TO_FOLD_SCHEMA,
    model_id:modelId,
    model_equation:model.equation,
    reference_plane:model.plane,
    source: 'specified-mathematical-model',
    progress,
    frame_origin:Object.freeze(origin.map(rounded)),
    source_frame_basis:identity,
    mapped_origin:Object.freeze(image.map(rounded)),
    mapped_frame_basis:Object.freeze(jacobian.map(row=>Object.freeze(row.map(rounded)))),
    determinant:rounded(determinant),
    sigma_min:rounded(sigmaMin),
    sigma_max:rounded(sigmaMax),
    condition_number:conditionNumber===null?null:rounded(conditionNumber),
    fold_index:rounded(foldIndex),
    plane_distance:rounded(planeDistance),
    plane_position:planePosition,
    plane_is_fold:modelId==='fold',
    local_classification:localClassification,
    rank_loss_certified:rankLossCertificate,
    crossing_claim:'MODEL_COORDINATE_PLANE_ONLY',
    physical_fold_probability:null,
    physical_observation:'NOT_MEASURED',
  });
}

// Audio is a deliberately invented translation of model data, not physics telemetry.
// Pitch and marker distinguish proximity even with stereo unavailable or disabled.
export function auralFrameCue(sample) {
  if (sample?.schema !== FRAME_TO_FOLD_SCHEMA) throw new TypeError('A frame-to-fold model sample is required.');
  const proximity=1-clamp(Math.abs(sample.plane_distance),0,1);
  const isPlane=sample.plane_position==='ON_PLANE';
  return Object.freeze({
    progress:sample.progress,
    frequency_hz:Math.round(220+180*proximity),
    gain:0.018,
    duration_ms:105,
    pan:rounded(clamp(sample.plane_distance*0.65,-0.65,0.65)),
    marker:isPlane?(sample.rank_loss_certified?'MODEL_FOLD':'REFERENCE_PLANE'):null,
    proximity:rounded(proximity),
    mono_cue:'pitch indicates proximity; paired tone marks the fold in the model',
    authority:'local-sonification-only',
  });
}

export function auralFrameSweep(modelId, steps=17) {
  if (!Number.isInteger(steps)||steps<3||steps>33||steps%2===0) throw new RangeError('Use an odd number of samples from 3 to 33.');
  return Object.freeze(Array.from({length:steps},(_,i)=>auralFrameCue(sampleFrameToFold(modelId,i/(steps-1)))));
}
