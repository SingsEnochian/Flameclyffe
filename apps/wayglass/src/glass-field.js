import * as THREE from 'three';

const VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  precision highp float;

  uniform float uTime;
  uniform float uEnergy;
  uniform float uIntent;
  uniform float uChannel;
  uniform float uOwnership;
  uniform float uHandoff;
  uniform float uCanonState;
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  varying vec2 vUv;

  #define PI 3.141592653589793

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 turn = mat2(0.82, -0.57, 0.57, 0.82);
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = turn * p * 2.03 + 11.7;
      amplitude *= 0.48;
    }
    return value;
  }

  float filament(vec2 p, float seed, float width) {
    float y = sin(p.x * (2.4 + seed) + seed * 5.0);
    y += 0.42 * sin(p.x * (5.7 - seed) - seed * 8.0);
    y *= 0.11;
    return smoothstep(width, 0.0, abs(p.y - y));
  }

  vec3 labradorite(float phase, float fire) {
    vec3 cyan = vec3(0.02, 0.72, 0.76);
    vec3 blue = vec3(0.055, 0.19, 0.72);
    vec3 violet = vec3(0.43, 0.08, 0.61);
    vec3 green = vec3(0.05, 0.50, 0.31);

    float a = sin(phase) * 0.5 + 0.5;
    float b = sin(phase + 2.094) * 0.5 + 0.5;
    float c = sin(phase + 4.188) * 0.5 + 0.5;

    vec3 colour = cyan * a + blue * b + violet * c;
    colour = mix(colour, green, smoothstep(0.72, 1.0, sin(phase * 0.61) * 0.5 + 0.5) * 0.32);
    return colour * fire;
  }

  void main() {
    vec2 uv = vUv;
    float ratio = uResolution.x / max(uResolution.y, 1.0);
    vec2 aspect = vec2(ratio, 1.0);
    vec2 p = (uv - 0.5) * aspect;
    vec2 pointer = (uPointer - 0.5) * aspect;

    float pointerDistance = length(p - pointer);
    float lens = exp(-pointerDistance * (4.6 - uEnergy * 0.9));

    // Black glass body. Almost still at rest, slightly deeper when awake.
    float mineral = fbm(p * 2.2 + vec2(uTime * 0.009, -uTime * 0.006));
    float mineralFine = fbm(p * 7.0 - vec2(uTime * 0.014, uTime * 0.011));
    float opticalBreath = 0.5 + 0.5 * sin(uTime * 0.105 + mineral * 1.7);
    vec3 blackGlass = mix(
      vec3(0.003, 0.007, 0.010),
      vec3(0.012, 0.025, 0.030),
      0.32 + mineral * 0.34 + opticalBreath * 0.04
    );

    // Labradorite colour play is driven primarily by viewing/pointer angle.
    vec2 viewVector = normalize((pointer - p) + vec2(0.0001));
    float angle = atan(viewVector.y, viewVector.x);
    float strata = mineral * 5.4 + mineralFine * 2.1 + dot(p, vec2(2.7, -1.9));
    float fireMask = smoothstep(0.54, 0.82, mineralFine + lens * (0.20 + uEnergy * 0.24));
    fireMask *= 0.20 + uEnergy * 0.80;
    // IC gathers colour inward; OOC opens it into a thinner violet/cyan branch.
    float channelPhase = mix(-0.42, 0.78, uChannel);
    float semanticFire = fireMask * (0.82 + uIntent * 0.18);
    vec3 fire = labradorite(angle * 2.2 + strata + channelPhase + uTime * 0.025, semanticFire);

    // Living ink migrates through channels. It gathers near interaction,
    // then recedes instead of constantly animating every surface.
    vec2 inkP = p;
    inkP.x += uTime * (0.018 + uEnergy * 0.055);
    inkP.y += (fbm(p * 2.9 + uTime * 0.012) - 0.5) * 0.16;
    float inkA = filament(inkP + vec2(0.0, 0.19), 0.34, 0.022);
    float inkB = filament(inkP * vec2(0.83, 1.28) - vec2(0.4, 0.26), 0.71, 0.014);
    float inkC = filament(inkP * vec2(1.17, 0.92) + vec2(0.2, 0.34), 0.12, 0.010);
    float livingInk = max(inkA, max(inkB, inkC));
    float ownershipGather = 0.84 + uOwnership * 0.30;
    livingInk *= (0.08 + uEnergy * 0.58) * (0.36 + lens * 0.64) * ownershipGather;
    vec3 inkLight = labradorite(strata * 1.3 + uTime * 0.05, livingInk * 0.78);

    // Sparse suspended motes echo the relic/orbit references without becoming HUD noise.
    vec2 cell = floor((p + vec2(uTime * 0.006, 0.0)) * 19.0);
    vec2 local = fract((p + vec2(uTime * 0.006, 0.0)) * 19.0) - 0.5;
    float moteSeed = hash(cell);
    float mote = smoothstep(0.075, 0.0, length(local - vec2(moteSeed - 0.5, hash(cell + 4.1) - 0.5) * 0.44));
    mote *= step(0.91, moteSeed) * (0.03 + uEnergy * 0.18);

    // Active information can loosen into a particulate ink-current.
    // The current is deliberately dormant at rest.
    float ribbonY = sin(p.x * 2.15 + uTime * 0.055) * 0.075;
    ribbonY += sin(p.x * 5.4 - uTime * 0.032) * 0.026;
    float ribbonBand = smoothstep(0.16, 0.0, abs(p.y - ribbonY));
    float ribbonSeed = hash(cell + vec2(37.0, 19.0));
    float ribbonParticle = mote * ribbonBand * step(0.72, ribbonSeed) * uEnergy * 0.82;
    // Handoff becomes a travelling filament rather than a generic glow.
    float handoffHead = fract(p.x * 0.34 + 0.5 + uTime * 0.075);
    float handoffFilament = smoothstep(0.085, 0.0, abs(handoffHead - uHandoff));
    handoffFilament *= ribbonBand * uHandoff;

    // A broad refractive well follows the hand/pointer. It reads as optical mass,
    // not a cursor halo.
    float well = smoothstep(0.58, 0.0, pointerDistance);
    float caustic = pow(max(0.0, sin(pointerDistance * 23.0 - uTime * 0.22 + mineral * 4.0)), 8.0);
    caustic *= well * (0.018 + uEnergy * 0.10);

    vec3 colour = blackGlass;
    colour += fire * 0.42;
    colour += inkLight;
    colour += vec3(0.22, 0.78, 0.80) * mote;
    colour += labradorite(strata * 1.7 + angle, ribbonParticle * 1.35);
    colour += labradorite(strata + uTime * 0.08, handoffFilament * 0.88);
    colour += labradorite(angle + strata, caustic);

    // Canon state is deliberately subtle: verified settles; unresolved/conflicted
    // produces optical doubling instead of a louder colour wash.
    float semanticEdge = smoothstep(0.42, 0.0, abs(mineralFine - 0.56));
    float doubleFire = semanticEdge * max(0.0, -uCanonState) * (0.04 + uEnergy * 0.12);
    colour += labradorite(strata + 1.6, doubleFire);

    // Stone-black falloff gives the field architectural weight.
    float vignette = smoothstep(1.12, 0.12, length(p * vec2(0.78, 1.0)));
    colour *= 0.58 + vignette * 0.42;

    // Fine mineral grain, deliberately restrained.
    float grain = (hash(floor(uv * uResolution.xy * 0.12)) - 0.5) * 0.012;
    colour += grain;

    gl_FragColor = vec4(colour, 1.0);
  }
`;

export function installWayglassField({ host = document.body } = {}) {
  if (!host || typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'wayglass-field';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.6));

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: 0 },
    uEnergy: { value: 0 },
    uIntent: { value: 0 },
    uChannel: { value: 0 },
    uOwnership: { value: 0 },
    uHandoff: { value: 0 },
    uCanonState: { value: 0 },
    uPointer: { value: new THREE.Vector2(0.68, 0.3) },
    uResolution: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    depthWrite: false,
    depthTest: false,
  });
  scene.add(new THREE.Mesh(geometry, material));

  const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const pointerTarget = new THREE.Vector2(0.68, 0.3);
  let frame = 0;
  let alive = true;
  let energyTarget = 0;
  let lastPointerAt = 0;

  function resize() {
    const width = Math.max(1, globalThis.innerWidth || 1);
    const height = Math.max(1, globalThis.innerHeight || 1);
    renderer.setSize(width, height, false);
    uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    render();
  }

  function render(time = 0) {
    const seconds = time * 0.001;
    uniforms.uTime.value = reduceMotion ? 0 : seconds;

    if (!reduceMotion) {
      uniforms.uPointer.value.lerp(pointerTarget, 0.065);
      const idleFor = performance.now() - lastPointerAt;
      if (idleFor > 950) energyTarget *= 0.965;
      uniforms.uEnergy.value += (energyTarget - uniforms.uEnergy.value) * 0.055;
      energyTarget *= 0.992;
    } else {
      uniforms.uEnergy.value = 0.08;
    }

    renderer.render(scene, camera);
  }

  function animate(time) {
    if (!alive) return;
    render(time);
    frame = requestAnimationFrame(animate);
  }

  function pointer(event) {
    const width = Math.max(1, globalThis.innerWidth || 1);
    const height = Math.max(1, globalThis.innerHeight || 1);
    pointerTarget.set(event.clientX / width, 1 - (event.clientY / height));
    lastPointerAt = performance.now();
    energyTarget = Math.min(1, energyTarget + 0.12);
    if (reduceMotion) render();
  }

  function wake(event) {
    const detail = event?.detail || {};
    const strength = Number(detail.strength);
    const intent = Number(detail.intent);
    const ownership = Number(detail.ownership);
    const handoff = Number(detail.handoff_progress);
    uniforms.uIntent.value = Number.isFinite(intent) ? Math.min(1, Math.max(0, intent)) : uniforms.uIntent.value;
    uniforms.uChannel.value = detail.channel === 'OOC' ? 1 : 0;
    uniforms.uOwnership.value = Number.isFinite(ownership) ? Math.min(1, Math.max(0, ownership)) : uniforms.uOwnership.value;
    uniforms.uHandoff.value = Number.isFinite(handoff) ? Math.min(1, Math.max(0, handoff)) : 0;
    uniforms.uCanonState.value = detail.canon_state === 'conflicted' ? -1 : detail.canon_state === 'unresolved' ? -0.55 : detail.canon_state === 'verified' ? 1 : 0;
    if (reduceMotion) {
      render();
      return;
    }
    energyTarget = Math.max(energyTarget, Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : 0.72);
  }

  globalThis.addEventListener?.('resize', resize, { passive: true });
  globalThis.addEventListener?.('pointermove', pointer, { passive: true });
  globalThis.addEventListener?.('wayglass:material-wake', wake);
  resize();
  if (!reduceMotion) frame = requestAnimationFrame(animate);

  return Object.freeze({
    wake(strength = 0.72) {
      wake({ detail: { strength } });
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(frame);
      globalThis.removeEventListener?.('resize', resize);
      globalThis.removeEventListener?.('pointermove', pointer);
      globalThis.removeEventListener?.('wayglass:material-wake', wake);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    },
  });
}
