import {
  AmbientLight, BoxGeometry, Color, Group, Mesh, MeshStandardMaterial, PerspectiveCamera,
  PointLight, Scene, ShaderMaterial, Shape, ShapeGeometry, Vector3, Vector4, WebGLRenderer,
  BackSide, DoubleSide,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// A bounded volume in world coordinates. Curl and buoyancy are procedural
// motion of optical density. The paper deposits are separate static geometry.
const vertexShader = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const fragmentShader = /* glsl */ `
  varying vec3 vWorld;
  uniform float time;
  uniform float current;
  uniform int count;
  uniform vec3 ink[4];
  uniform vec4 plume[4];
  uniform vec4 traits[4];

  vec2 boxRange(vec3 origin, vec3 direction) {
    vec3 inv = 1.0 / (sign(direction + vec3(0.000001)) * max(abs(direction), vec3(0.000001)));
    vec3 first = (vec3(-2.6, 0.025, -1.8) - origin) * inv;
    vec3 second = (vec3(2.6, 2.8, 1.8) - origin) * inv;
    vec3 near = min(first, second), far = max(first, second);
    return vec2(max(max(near.x, near.y), near.z), min(min(far.x, far.y), far.z));
  }

  float densityAt(vec3 p, int i) {
    vec3 q = (p - plume[i].xyz) / plume[i].w;
    float drift = time * current;
    q.y -= traits[i].y * sin(drift * 0.35) * 0.34;
    float apron = clamp(-q.y, 0.0, 2.0);
    float turn = apron * 1.7 + drift * 0.37;
    q.xz = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * q.xz;
    q.xz += vec2(sin(q.y * 3.8 + drift), cos(q.y * 4.0 - drift)) * (0.14 + apron * 0.12);
    float height = q.y + 0.64;
    float boundary = exp(-2.4 * dot(q.xz, q.xz) - 0.95 * height * height);
    float cap = exp(-4.2 * dot(q * vec3(0.66, 1.45, 0.66), q * vec3(0.66, 1.45, 0.66)));
    float folds = 0.55 + 0.38 * sin(q.x * 13.0 + q.y * 6.5 + sin(q.z * 10.0 + turn) * 2.1);
    return (boundary * folds * 0.75 + cap * 0.67) * traits[i].x;
  }

  void main() {
    vec3 direction = normalize(vWorld - cameraPosition);
    vec2 bounds = boxRange(cameraPosition, direction);
    float start = max(0.0, bounds.x);
    if (bounds.y <= start) discard;
    float stepSize = (bounds.y - start) / 40.0;
    vec3 accumulated = vec3(0.0);
    float opacity = 0.0;
    for (int sampleIndex = 0; sampleIndex < 40; sampleIndex++) {
      vec3 p = cameraPosition + direction * (start + (float(sampleIndex) + 0.5) * stepSize);
      vec3 mixed = vec3(0.0);
      float density = 0.0;
      for (int i = 0; i < 4; i++) {
        if (i >= count) break;
        float amount = densityAt(p, i);
        density += amount;
        mixed += ink[i] * amount;
      }
      float alpha = 1.0 - exp(-density * stepSize * 2.8);
      accumulated += (1.0 - opacity) * alpha * mixed / max(density, 0.00001);
      opacity += (1.0 - opacity) * alpha;
      if (opacity > 0.99) break;
    }
    if (opacity < 0.006) discard;
    gl_FragColor = vec4(accumulated / opacity, opacity);
    #include <colorspace_fragment>
  }
`;

export function createPrivateAtelierScene(host) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new Scene();
  scene.background = new Color('#080e15');
  const camera = new PerspectiveCamera(39, 1, 0.1, 40);
  camera.position.set(4.3, 3.4, 6.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.94, 0);
  controls.minDistance = 4.6;
  controls.maxDistance = 12;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.enablePan = false;
  controls.update();
  const paper = new Mesh(new BoxGeometry(4.7, 0.075, 3),
    new MeshStandardMaterial({ color: '#cbd0bb', roughness: 0.96 }));
  paper.position.y = -0.042;
  const base = new Mesh(new BoxGeometry(4.82, 0.16, 3.12),
    new MeshStandardMaterial({ color: '#456869', metalness: 0.6, roughness: 0.38 }));
  base.position.y = -0.16;
  const wash = new Group();
  const light = new PointLight('#7ee0cb', 28, 16);
  light.position.set(-2, 4, 2.2);
  scene.add(paper, base, wash, light, new AmbientLight('#b6c5e4', 1.1));

  const uniforms = {
    time: { value: 0 }, current: { value: 0 }, count: { value: 0 },
    ink: { value: Array.from({ length: 4 }, () => new Color()) },
    plume: { value: Array.from({ length: 4 }, () => new Vector4()) },
    traits: { value: Array.from({ length: 4 }, () => new Vector4()) },
  };
  const volume = new Mesh(new BoxGeometry(5.2, 2.775, 3.6), new ShaderMaterial({
    uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, side: BackSide,
  }));
  // The proxy box only schedules the volume pass. The shader integrates over
  // the visible interval, allowing paper and ink to occupy the same 3D view.
  volume.material.depthTest = false;
  volume.renderOrder = 3;
  volume.position.y = 1.4125;
  volume.visible = false;
  scene.add(volume);

  function clearStains() {
    for (const stain of [...wash.children]) {
      wash.remove(stain);
      stain.geometry.dispose();
      stain.material.dispose();
    }
  }

  function setScene(design) {
    clearStains();
    light.color.set(design?.light ?? '#7ee0cb');
    uniforms.current.value = design?.current ?? 0;
    uniforms.count.value = design?.plumes.length ?? 0;
    volume.visible = uniforms.count.value > 0;
    design?.plumes.forEach((plume, index) => {
      uniforms.ink.value[index].set(plume.colour);
      uniforms.plume.value[index].set(plume.x, plume.y, plume.z, plume.radius);
      uniforms.traits.value[index].set(plume.density, plume.buoyancy, 0, 0);
    });
    design?.stains.forEach((stain, index) => {
      const shape = new Shape();
      for (let edge = 0; edge <= 64; edge++) {
        const angle = (edge % 64) / 64 * Math.PI * 2;
        const radius = stain.radius * (0.84 + 0.09 * Math.sin(angle * 5 + index) + 0.05 * Math.cos(angle * 11));
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (edge === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      const deposit = new Mesh(new ShapeGeometry(shape), new MeshStandardMaterial({
        color: stain.colour, roughness: 1, side: DoubleSide, transparent: true, opacity: 0.67, depthWrite: false,
      }));
      deposit.rotation.x = -Math.PI / 2;
      deposit.position.set(stain.x, 0.003 + index * 0.001, stain.z);
      deposit.renderOrder = index + 1 - design.stains.length;
      wash.add(deposit);
    });
    draw();
  }

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const cameraOffset = new Vector3();
  let frame = 0;
  let previous = 0;
  let paused = motion.matches;
  function draw() { renderer.render(scene, camera); }
  function tick(now) {
    frame = 0;
    if (previous) uniforms.time.value += Math.min(0.1, (now - previous) / 1000);
    previous = now;
    draw();
    schedule();
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!paused && !motion.matches && !document.hidden && volume.visible && uniforms.current.value > 0) {
      frame = requestAnimationFrame(tick);
    } else previous = 0;
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5, 840 / width));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.zoom = Math.min(1, camera.aspect / 1.2);
    camera.updateProjectionMatrix();
    draw();
  }
  function orbit(direction) {
    cameraOffset.copy(camera.position).sub(controls.target).applyAxisAngle(camera.up, direction * Math.PI / 8);
    camera.position.copy(controls.target).add(cameraOffset);
    controls.update();
  }

  host.append(renderer.domElement);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  controls.addEventListener('change', draw);
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  return {
    setScene(design) { setScene(design); schedule(); },
    orbit,
    setPaused(value) { paused = Boolean(value); schedule(); },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      motion.removeEventListener('change', schedule);
      controls.dispose();
      clearStains();
      for (const mesh of [paper, base, volume]) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
