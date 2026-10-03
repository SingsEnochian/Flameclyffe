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
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    vec2 p = (uv - 0.5) * aspect;
    vec2 pointer = (uPointer - 0.5) * aspect;
    float pd = length(p - pointer);

    float lens = exp(-pd * 5.5);
    float waveA = sin((p.x * 6.0 + p.y * 4.0) + uTime * 0.18) * 0.5 + 0.5;
    float waveB = sin((p.x * -3.0 + p.y * 8.0) - uTime * 0.12) * 0.5 + 0.5;
    float grain = hash(floor(uv * uResolution.xy * 0.11)) * 0.018;

    vec3 ink = vec3(0.015, 0.026, 0.030);
    vec3 teal = vec3(0.035, 0.145, 0.160);
    vec3 pearl = vec3(0.39, 0.49, 0.52);
    vec3 violet = vec3(0.16, 0.09, 0.22);

    vec3 colour = ink;
    colour += teal * (0.15 + waveA * 0.09);
    colour += violet * waveB * 0.05;
    colour += pearl * lens * 0.11;

    float rim = smoothstep(0.85, 0.12, length(p));
    colour += vec3(0.03, 0.045, 0.05) * rim;
    colour += grain;

    float alpha = 1.0;
    gl_FragColor = vec4(colour, alpha);
  }
`;

export function installWayglassField({ host = document.body } = {}) {
  if (!host || typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'wayglass-field';
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.6));

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: 0 },
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
  let frame = 0;
  let alive = true;

  function resize() {
    const width = Math.max(1, globalThis.innerWidth || 1);
    const height = Math.max(1, globalThis.innerHeight || 1);
    renderer.setSize(width, height, false);
    uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    render();
  }

  function render(time = 0) {
    uniforms.uTime.value = time * 0.001;
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
    uniforms.uPointer.value.set(event.clientX / width, 1 - (event.clientY / height));
    if (reduceMotion) render();
  }

  globalThis.addEventListener?.('resize', resize, { passive: true });
  globalThis.addEventListener?.('pointermove', pointer, { passive: true });
  resize();
  if (!reduceMotion) frame = requestAnimationFrame(animate);

  return Object.freeze({
    destroy() {
      alive = false;
      cancelAnimationFrame(frame);
      globalThis.removeEventListener?.('resize', resize);
      globalThis.removeEventListener?.('pointermove', pointer);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
    },
  });
}
