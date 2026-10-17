/**
 * A real mathematical, dimensionless, one-qubit quantum simulation.
 * It is not quantum hardware, evidence of consciousness or sound entrainment.
 * Hamiltonian H = lambda σ_z + g σ_x, with hbar = 1 in natural units.
 */
const VALID_TOL = 1e-10;
function finiteNumber(value, key) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new RangeError(`${key} must be finite`);
}
function validateBloch(v) {
  if (!v || typeof v !== 'object' || !['x','y','z'].every(k=>Object.hasOwn(v,k))) throw new TypeError('Bloch vector x,y,z required');
  const {x,y,z}=v;
  for (const k of ['x','y','z']) finiteNumber(v[k], k);
  const length=Math.hypot(x,y,z);
  if (length>1+VALID_TOL) throw new RangeError('invalid quantum state: Bloch vector outside unit ball');
  return {x,y,z,length};
}

/** Return Hamiltonian energies ±sqrt(lambda² + g²), gap and basis context. */
export function avoidedCrossing(lambda, g) {
  finiteNumber(lambda,'lambda');finiteNumber(g,'g');
  if (g<0) throw new RangeError('g must be nonnegative for this reference fixture');
  const radius=Math.hypot(lambda,g);
  return Object.freeze({
    model:'qubit-avoided-crossing/v1', domain:'SYMBOLIC', units:'dimensionless energy; hbar=1',
    lambda,g,energies:[-radius,radius],gap:2*radius,
    minimum_gap_at_lambda_zero:2*g,
    note:'A Hamiltonian spectral gap is not a classical equilibrium fold.'
  });
}

/**
 * Bloch vector corresponds to rho = 1/2(I + x sigma_x + y sigma_y + z sigma_z).
 * rho00=(1+z)/2, rho11=(1-z)/2, rho01=(x-iy)/2.
 */
export function densityFromBloch(vector) {
  const {x,y,z,length}=validateBloch(vector);
  return Object.freeze({
    model:'qubit-bloch-density/v1', domain:'SYMBOLIC', trace:1,
    purity:(1+length*length)/2,
    rho:{r00:(1+z)/2,r11:(1-z)/2,r01:{real:x/2,imag:-y/2},r10:{real:x/2,imag:y/2}}
  });
}

/** Computational-basis projective measurement; returns probabilities, not sampled outcomes. */
export function measureZ(vector) {
  const {z}=validateBloch(vector);
  const p0=(1+z)/2, p1=(1-z)/2;
  return Object.freeze({
    model:'qubit-Z-projective/v1',domain:'SYMBOLIC',
    outcomes:[{label:'0',probability:p0,conditional_bloch:p0>0 ? {x:0,y:0,z:1} : null},
              {label:'1',probability:p1,conditional_bloch:p1>0 ? {x:0,y:0,z:-1} : null}],
    note:'Conditional state applies only when probability > 0; this function does not sample an outcome.'
  });
}

/** Closed-system unitary evolution by Rodrigues rotation of Bloch sphere. */
export function evolveBloch(vector,{lambda,g,time}) {
  const {x,y,z}=validateBloch(vector);
  finiteNumber(lambda,'lambda'); finiteNumber(g,'g'); finiteNumber(time,'time');
  if (time<0) throw new RangeError('time must be nonnegative');
  const magnitude=Math.hypot(g,lambda);
  if (magnitude===0 || time===0) return Object.freeze({x,y,z});
  const nx=g/magnitude,ny=0,nz=lambda/magnitude;
  const theta=2*magnitude*time;
  const c=Math.cos(theta),s=Math.sin(theta);
  const dot=nx*x+nz*z;
  const out={
    x:x*c+(-nz*y)*s+nx*dot*(1-c),
    y:y*c+(nz*x-nx*z)*s+ny*dot*(1-c),
    z:z*c+(nx*y)*s+nz*dot*(1-c)
  };
  validateBloch(out);
  return Object.freeze(out);
}
