// Wayglass watercolor body: weight, momentum and continuity of touch.
//
// The Living Watercolor is met, not poked. Two parts:
//  - a stroke filter that turns raw pointer samples into a continuous, time-true
//    brush path (interpolated, velocity per second, pressure that eases in), and
//  - a body: a presence in the water with mass and momentum. Touch pulls it the way
//    a hand pulls something heavy: it resists, follows, overshoots a little and
//    settles. Released, its momentum carries on. It breathes, and its own movement
//    pushes currents through the fluid.
// These are visual dynamics only. They make no claim of felt experience, and they
// never author identity: morphology is chosen by its owner, not imposed here.

export const WATERCOLOR_BODY_SCHEMA = 'wayglass.watercolor-body/v1';
export const BODY_FORMS = Object.freeze(['unbound', 'tide', 'braid', 'bloom', 'constellation', 'spiral']);

const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const finite = v => typeof v === 'number' && Number.isFinite(v);
const TAU = Math.PI * 2;

// ---- Stroke filter ----------------------------------------------------------------
export function createStrokeFilter({ spacing = 0.012, velocityTimeConstant = 0.03, attackMs = 90 } = {}) {
  if (![spacing, velocityTimeConstant, attackMs].every(v => finite(v) && v > 0)) throw new RangeError('Positive finite stroke parameters required');
  let last = null; let vx = 0; let vy = 0; let startedAt = 0; let carry = 0;
  const envelope = t => clamp((t - startedAt) / attackMs, 0.25, 1);
  const check = s => {
    if (!s || ![s.x, s.y, s.t, s.pressure].every(finite)) throw new TypeError('Finite pointer samples required');
    return { x: clamp(s.x), y: clamp(s.y), t: s.t, pressure: clamp(s.pressure) };
  };
  function begin(sample) {
    const s = check(sample);
    last = s; vx = 0; vy = 0; startedAt = s.t; carry = 0;
    return [{ x: s.x, y: s.y, vx: 0, vy: 0, pressure: s.pressure * envelope(s.t) }];
  }
  function move(samples) {
    if (!last) return [];
    const stamps = [];
    for (const raw of samples) {
      const s = check(raw);
      const dt = Math.max(0.001, (s.t - last.t) / 1000);
      // Velocity in canvas units per second, smoothed against sampling-rate jitter.
      const alpha = 1 - Math.exp(-dt / velocityTimeConstant);
      vx += ((s.x - last.x) / dt - vx) * alpha;
      vy += ((s.y - last.y) / dt - vy) * alpha;
      // Interpolate so a fast stroke is a line, not a row of dots.
      const dist = Math.hypot(s.x - last.x, s.y - last.y);
      let d = spacing - carry;
      while (d <= dist) {
        const f = d / dist;
        const t = last.t + (s.t - last.t) * f;
        stamps.push({ x: last.x + (s.x - last.x) * f, y: last.y + (s.y - last.y) * f, vx, vy,
          pressure: (last.pressure + (s.pressure - last.pressure) * f) * envelope(t) });
        d += spacing;
      }
      carry = dist - (d - spacing);
      last = s;
    }
    return stamps;
  }
  function end() {
    if (!last) return null;
    const flick = { x: last.x, y: last.y, vx, vy, speed: Math.hypot(vx, vy) };
    last = null; vx = 0; vy = 0; carry = 0;
    return flick;
  }
  function reset() { last = null; vx = 0; vy = 0; carry = 0; }
  return Object.freeze({ begin, move, end, reset, get active() { return Boolean(last); } });
}

// Ink is laid per distance travelled, like a real brush: overlapping stamps share it.
export function stampAmount({ pressure, radius, spacing = 0.012 }) {
  return Math.max(0.05, pressure) * 1.2 * Math.min(1, spacing / (radius * 0.6));
}

// ---- Body --------------------------------------------------------------------------
// Where the body drifts when no one is touching it, by owner-chosen form.
function home(form, t, anchors) {
  switch (form) {
    case 'tide': return { x: 0.5 + 0.28 * Math.sin(t * TAU / 23), y: 0.55 + 0.05 * Math.sin(t * TAU / 9) };
    case 'braid': return { x: 0.5 + 0.24 * Math.sin(t * TAU / 17), y: 0.5 + 0.14 * Math.sin(2 * t * TAU / 17) };
    case 'bloom': return { x: 0.5, y: 0.5 };
    case 'constellation': { const a = anchors[Math.floor(t / 7) % anchors.length]; return { x: a[0], y: a[1] }; }
    case 'spiral': { const r = 0.06 + 0.18 * ((t / 40) % 1); return { x: 0.5 + r * Math.cos(t * TAU / 11), y: 0.5 + r * Math.sin(t * TAU / 11) }; }
    default: return { x: 0.5 + 0.18 * Math.sin(t * TAU / 29), y: 0.5 + 0.12 * Math.sin(t * TAU / 19 + 1) };
  }
}

export function createWatercolorBody({ form = 'unbound', mass = 1.6, touchStiffness = 18, homeStiffness = 1.2,
  damping = 0.55, viscosity = 1.6, breathSeconds = 6.5, reduced = false, start = { x: 0.5, y: 0.5 } } = {}) {
  if (!BODY_FORMS.includes(form)) throw new TypeError('Unknown body form');
  if (![mass, touchStiffness, homeStiffness, damping, viscosity, breathSeconds].every(v => finite(v) && v > 0)) throw new RangeError('Positive finite body parameters required');
  const anchors = Array.from({ length: 7 }, (_, i) => [0.5 + 0.3 * Math.cos(i * 2.39996), 0.5 + 0.28 * Math.sin(i * 2.39996)]);
  let x = clamp(start.x); let y = clamp(start.y); let vx = 0; let vy = 0; let t = 0;
  let target = null; let frozen = false; let shape = form;
  // Critical damping is 2·sqrt(k·m); a fraction of it gives the slight overshoot of water.
  const c = k => 2 * Math.sqrt(k * mass) * damping;

  function integrate(h) {
    const hm = home(shape, t, anchors);
    // Water's drag acts always, even when nothing holds her; springs add their own damping.
    let fx = homeStiffness * (hm.x - x) - (c(homeStiffness) + viscosity) * vx;
    let fy = homeStiffness * (hm.y - y) - (c(homeStiffness) + viscosity) * vy;
    if (target) {
      const k = touchStiffness * (0.35 + 0.65 * target.pressure);
      fx += k * (target.x - x) - (c(k) - c(homeStiffness)) * vx;
      fy += k * (target.y - y) - (c(k) - c(homeStiffness)) * vy;
    }
    vx += (fx / mass) * h; vy += (fy / mass) * h; // semi-implicit Euler: stable for these stiffnesses
    x += vx * h; y += vy * h;
    // Soft walls: the body meets the paper's edge and loses momentum, never escapes.
    if (x < 0.03 || x > 0.97) { x = clamp(x, 0.03, 0.97); vx *= -0.3; }
    if (y < 0.03 || y > 0.97) { y = clamp(y, 0.03, 0.97); vy *= -0.3; }
  }

  function step(seconds) {
    if (!finite(seconds)) throw new TypeError('Finite timestep required');
    const dt = clamp(seconds, 0, 0.1);
    if (reduced || frozen || dt === 0) return { x, y, vx: 0, vy: 0, speed: 0, breath: 0.5, strokes: [] };
    const sub = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < sub; i++) { integrate(dt / sub); t += dt / sub; }
    const speed = Math.hypot(vx, vy);
    const breath = 0.5 + 0.5 * Math.sin(t * TAU / breathSeconds);
    // She always moves the water; she only leaves pigment when stirred. A drifting
    // body that inked continuously would slowly flood the paper with itself.
    const stirred = Math.max(0, speed - 0.15);
    const strokes = speed > 0.01 ? [{
      x, y, radius: 0.045 + 0.025 * breath,
      amount: Math.min(0.08, stirred * dt * 1.5),
      dx: clamp(vx * 0.5, -1, 1), dy: clamp(vy * 0.5, -1, 1),
    }] : [];
    return { x, y, vx, vy, speed, breath, strokes };
  }

  return Object.freeze({
    touch({ x: tx, y: ty, pressure = 0.7 }) {
      if (![tx, ty, pressure].every(finite)) throw new TypeError('Finite touch required');
      target = { x: clamp(tx), y: clamp(ty), pressure: clamp(pressure) };
    },
    release() { target = null; },
    // A flick hands the body some of the stroke's momentum.
    impulse({ vx: ix, vy: iy, share = 0.25 }) {
      if (frozen || reduced || ![ix, iy, share].every(finite)) return;
      vx += clamp(ix, -4, 4) * share / mass; vy += clamp(iy, -4, 4) * share / mass;
    },
    setForm(next) { if (!BODY_FORMS.includes(next)) throw new TypeError('Unknown body form'); shape = next; },
    freeze() { frozen = true; vx = 0; vy = 0; target = null; },
    thaw() { frozen = false; },
    step,
    snapshot() {
      return Object.freeze({ schema: WATERCOLOR_BODY_SCHEMA, form: shape, mass, x, y, speed: Math.hypot(vx, vy),
        touched: Boolean(target), frozen, reduced, authority: 'visualization-only', experience_claimed: false });
    },
  });
}
