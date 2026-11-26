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
  uniform float uWeave;
  uniform float uEnergy;
  uniform float uIntent;
  uniform float uChannel;
  uniform float uOwnership;
  uniform float uHandoff;
  uniform float uCanonState;
  uniform float uVelocity;
  uniform float uThickness;
  uniform float uRoughness;
  uniform float uIridescence;
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
    return 1.0 - smoothstep(0.0, width, abs(p.y - y));
  }

  // Two families of optical filaments, separated in apparent depth.
  // Interference is an artistic phase model, not measured coherent optics.
  vec3 lightWeave(vec2 p,float depth,float charge,float time){
    float x=p.x*9.0, y=p.y*9.0;
    float warp=y-.19*sin(x*1.7+time*.45);
    float weft=x-.19*sin(y*1.7-time*.39);
    float dw=abs(fract(warp+.5)-.5);
    float dv=abs(fract(weft+.5)-.5);
    float aa=max(.012,9.0/max(uResolution.y,1.0));
    float w=1.0-smoothstep(.008,.008+aa,dw);
    float v=1.0-smoothstep(.008,.008+aa,dv);
    float over=.5+.5*cos(PI*(floor(warp+.5)+floor(weft+.5)));
    float pulse=.35+.65*pow(.5+.5*cos(x*1.4-y*.7-time*2.0),4.0);
    vec3 shallow=vec3(.52,.95,.82)*w*mix(.35,1.0,over);
    vec3 deep=vec3(.78,.65,.36)*v*mix(1.0,.35,over);
    deep*=exp(-vec3(.85,.46,.25)*(depth+.45));
    float knot=w*v*(.5+.5*cos(x-y-time));
    return (shallow+deep+vec3(.6,.85,1.0)*knot*.3)*pulse*charge*.13;
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

    // Optical mass. Movement thickens the apparent glass rather than merely
    // making it brighter. The bend is local to the viewing/hand vector.
    float motionMass = clamp(uVelocity * 0.78 + uEnergy * 0.34, 0.0, 1.0);
    float opticalThickness = clamp(uThickness + motionMass * 0.42, 0.0, 1.0);
    vec2 bendDirection = normalize((p - pointer) + vec2(0.0001));
    float bendEnvelope = exp(-pointerDistance * mix(7.4, 3.8, opticalThickness));
    float bendAmount = bendEnvelope * opticalThickness * 0.045;
    vec2 refractedP = p + bendDirection * bendAmount;
    float refractedMineral = fbm(refractedP * 3.2 + vec2(uTime * 0.008, -uTime * 0.005));
    float thicknessBand = (1.0-smoothstep(0.18, 0.76, pointerDistance)) * opticalThickness;
    float internalRim = pow(clamp(pointerDistance / 0.62, 0.0, 1.0), 3.0) * bendEnvelope * opticalThickness;

    // Black glass body. Almost still at rest, slightly deeper when awake.
    float mineral = mix(fbm(p * 2.2 + vec2(uTime * 0.009, -uTime * 0.006)), refractedMineral, bendEnvelope * opticalThickness * 0.42);
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
    float mote = (1.0-smoothstep(0.0, 0.075, length(local - vec2(moteSeed - 0.5, hash(cell + 4.1) - 0.5) * 0.44)));
    mote *= step(0.91, moteSeed) * (0.03 + uEnergy * 0.18);

    // Active information can loosen into a particulate ink-current.
    // The current is deliberately dormant at rest.
    float ribbonY = sin(p.x * 2.15 + uTime * 0.055) * 0.075;
    ribbonY += sin(p.x * 5.4 - uTime * 0.032) * 0.026;
    float ribbonBand = (1.0-smoothstep(0.0, 0.16, abs(p.y - ribbonY)));
    float ribbonSeed = hash(cell + vec2(37.0, 19.0));
    float ribbonParticle = mote * ribbonBand * step(0.72, ribbonSeed) * uEnergy * 0.82;
    // Handoff becomes a travelling filament rather than a generic glow.
    float handoffHead = fract(p.x * 0.34 + 0.5 + uTime * 0.075);
    float handoffFilament = (1.0-smoothstep(0.0, 0.085, abs(handoffHead - uHandoff)));
    handoffFilament *= ribbonBand * uHandoff;

    // A broad refractive well follows the hand/pointer. It reads as optical mass,
    // not a cursor halo.
    float well = (1.0-smoothstep(0.0, 0.58, pointerDistance));
    float caustic = pow(max(0.0, sin(pointerDistance * 23.0 - uTime * 0.22 + mineral * 4.0)), 8.0);
    caustic *= well * (0.018 + uEnergy * 0.10);

    // Nacreous cloud strata: thin-film inspired colour, not physical telemetry.
    float cloud = fbm(refractedP * vec2(2.1, 5.4) + vec2(uTime * .006, 3.1));
    float nacre = smoothstep(.43, .78, cloud);
    vec3 pearl = mix(vec3(.08,.16,.24), vec3(.26,.22,.12), .5 + .5 * sin(cloud * 14.0 + angle));
    vec3 colour = blackGlass + pearl * nacre * (.24 + .16 * uEnergy);
    // Schlick approximation for dielectric reflection; procedural surface normal.
    vec3 normal = normalize(vec3((mineralFine-.5)*.7,(mineral-.5)*.7,1.0));
    vec3 viewDir = normalize(vec3(pointer-p, .65));
    float cosTheta = clamp(dot(normal,viewDir),0.0,1.0);
    float f0 = pow((1.52-1.0)/(1.52+1.0),2.0);
    float fresnel = f0 + (1.0-f0)*pow(1.0-cosTheta,5.0);
    vec3 absorption = exp(-vec3(.75,.32,.18)*opticalThickness/max(.25,cosTheta));
    colour *= absorption;
    colour += fire * (.12 + .65*uIridescence) * mix(.35,1.0,fresnel) * (1.0-.65*uRoughness);
    // Energy-bounded GGX microfacet highlight, using a procedural studio light.
    vec3 lightDir = normalize(vec3(-.45,.65,1.0));
    vec3 halfDir = normalize(lightDir + viewDir);
    float NoL = max(dot(normal,lightDir),0.0);
    float NoV = max(cosTheta,.001);
    float NoH = max(dot(normal,halfDir),0.0);
    float VoH = max(dot(viewDir,halfDir),0.0);
    float a = max(.08,uRoughness);
    float a2 = a*a;
    float denom = NoH*NoH*(a2-1.0)+1.0;
    float D = a2/(PI*denom*denom);
    float k = (a+1.0)*(a+1.0)/8.0;
    float G = (NoV/(NoV*(1.0-k)+k))*(NoL/(NoL*(1.0-k)+k));
    float F = f0+(1.0-f0)*pow(1.0-VoH,5.0);
    float specular = D*G*F/max(.004,4.0*NoV*NoL);
    colour += vec3(.86,.94,1.0)*min(specular*NoL,.35)*(.08+.32*uEnergy);

    colour += inkLight;
    colour += lightWeave(refractedP,opticalThickness,uWeave,uTime) * (.25+.75*lens);
    colour += vec3(0.22, 0.78, 0.80) * mote;
    colour += labradorite(strata * 1.7 + angle, ribbonParticle * 1.35);
    colour += labradorite(strata + uTime * 0.08, handoffFilament * 0.88);
    colour += labradorite(angle + strata, caustic);
    // A restrained internal edge and displaced mineral sample create the read
    // of laminated thickness. This is deliberately not a generic bloom.
    vec3 refractedFire = labradorite(angle * 1.6 + refractedMineral * 7.0 + strata, thicknessBand * 0.085);
    colour += refractedFire;
    colour += vec3(0.68, 0.93, 0.94) * internalRim * 0.045;

    // Canon state is deliberately subtle: verified settles; unresolved/conflicted
    // produces optical doubling instead of a louder colour wash.
    float semanticEdge = (1.0-smoothstep(0.0, 0.42, abs(mineralFine - 0.56)));
    float doubleFire = semanticEdge * max(0.0, -uCanonState) * (0.04 + uEnergy * 0.12);
    colour += labradorite(strata + 1.6, doubleFire);

    // Stone-black falloff gives the field architectural weight.
    float vignette = (1.0-smoothstep(0.12, 1.12, length(p * vec2(0.78, 1.0))));
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

  let renderer;
  try { renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'default',
  }); } catch {
    canvas.remove();
    host.dataset.wayglassField = 'css-fallback';
    return null;
  }
  host.dataset.wayglassField = 'webgl';
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.6));

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: 0 },
    uWeave: { value: 0 },
    uEnergy: { value: 0 },
    uIntent: { value: 0 },
    uChannel: { value: 0 },
    uOwnership: { value: 0 },
    uHandoff: { value: 0 },
    uCanonState: { value: 0 },
    uVelocity: { value: 0 },
    uThickness: { value: 0.34 },
    uRoughness: { value: .25 },
    uIridescence: { value: .65 },
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

  // One renderer, a separate scene for an actual faceted optical instrument.
  const jewelScene = new THREE.Scene();
  const jewelCamera = new THREE.PerspectiveCamera(35,2,.1,20);
  jewelCamera.position.set(0,0,4);
  const jewelGeometry = new THREE.IcosahedronGeometry(.85,0);
  const jewelMaterial = new THREE.MeshPhysicalMaterial({
    color:0x090e15, roughness:.16, metalness:0, ior:1.52,
    clearcoat:.85, clearcoatRoughness:.12, iridescence:.75,
    iridescenceIOR:1.35, iridescenceThicknessRange:[180,420],
    flatShading:true
  });
  const crystal = new THREE.Mesh(jewelGeometry,jewelMaterial);
  // Recessed luminous channels follow the actual faceted stone edges.
  const engravingGeometry = new THREE.EdgesGeometry(jewelGeometry);
  const engravingMaterial = new THREE.LineBasicMaterial({
    color:0x9cebdc,transparent:true,opacity:.18,depthTest:true
  });
  const engraving = new THREE.LineSegments(engravingGeometry,engravingMaterial);
  engraving.scale.setScalar(1.002);
  crystal.add(engraving);
  // A second, inset luminous lattice suggests light beneath the polished skin.
  const innerGeometry = new THREE.IcosahedronGeometry(.79,0);
  const innerMaterial = new THREE.MeshBasicMaterial({color:0x77e6d1,wireframe:true,transparent:true,opacity:0,depthWrite:false});
  const innerLight = new THREE.Mesh(innerGeometry,innerMaterial);
  crystal.add(innerLight);
  const inscriptionLight = new THREE.PointLight(0x86ffe0,0,3,2);
  inscriptionLight.position.set(.65,.35,1.1);
  jewelScene.add(inscriptionLight);


  jewelScene.add(crystal,new THREE.HemisphereLight(0xd8f5ff,0x243040,1.7));
  const key = new THREE.DirectionalLight(0xffe5bb,3);
  key.position.set(-3,4,5);jewelScene.add(key);
  const rim = new THREE.DirectionalLight(0x80bfff,2);
  rim.position.set(3,-1,-2);jewelScene.add(rim);
  const jewelTarget = new THREE.WebGLRenderTarget(128,64);
  const jewelPixels = new Uint8Array(128*64*4);
  const jewelImage = new Uint8ClampedArray(128*64*4);


  const motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionPreference?.matches === true;
  let motionEnabled = true;
  const still = () => reduceMotion || !motionEnabled || document.hidden;
  const pointerTarget = new THREE.Vector2(0.68, 0.3);
  let frame = 0;
  let alive = true;
  let energyTarget = 0;
  let weaveTarget = 0;
  let lastPointerAt = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerMoveAt = performance.now();
  let velocityTarget = 0;

  function resize() {
    const width = Math.max(1, globalThis.innerWidth || 1);
    const height = Math.max(1, globalThis.innerHeight || 1);
    renderer.setSize(width, height, false);
    uniforms.uResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    render();
  }

  // Reuse the GPU field as a bounded material sample for the active jewel.
  // A small 2D canvas is decorative only and never receives pointer events.
  let jewel = null;
  let jewelCanvas = null;
  function clearJewel() {
    jewelCanvas?.remove();
    jewelCanvas = null;
    jewel = null;
  }
  function sampleJewel() {
    if (!jewel?.isConnected || !jewelCanvas) { clearJewel(); return; }
    const rect = jewel.getBoundingClientRect();
    Object.assign(jewelCanvas.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
    if(uniforms.uEnergy.value<.035 && energyTarget<.035){clearJewel();return;}
    jewelCanvas.style.opacity=String(Math.min(.22,uniforms.uEnergy.value*.35));
    const ratio = renderer.getPixelRatio();
    const x = Math.max(0,rect.left*ratio), y = Math.max(0,rect.top*ratio);
    const w = Math.min(rect.right*ratio,canvas.width)-x, h = Math.min(rect.bottom*ratio,canvas.height)-y;
    if(w<=0 || h<=0)return;
    const ctx = jewelCanvas.getContext('2d');
    if(!ctx)return;
    ctx.clearRect(0,0,jewelCanvas.width,jewelCanvas.height);
    const sx=jewelCanvas.width/Math.max(1,rect.width*ratio), sy=jewelCanvas.height/Math.max(1,rect.height*ratio);
    // Render the real mesh only while an instrument is active.
    crystal.rotation.set(.28 + uniforms.uPointer.value.y*.55,uniforms.uPointer.value.x*1.5, .16);
    jewelMaterial.roughness=Math.max(.08,uniforms.uRoughness.value);
    jewelMaterial.iridescence=uniforms.uIridescence.value*.35;
    engravingMaterial.opacity=.12+.78*uniforms.uEnergy.value;
    innerMaterial.opacity=.15*uniforms.uEnergy.value;
    inscriptionLight.intensity=1.8*uniforms.uEnergy.value;
    jewelMaterial.emissive.setHex(0x16443d);
    jewelMaterial.emissiveIntensity=.22*uniforms.uEnergy.value;
    const prior=renderer.getRenderTarget();
    try {
      renderer.setRenderTarget(jewelTarget);
      renderer.render(jewelScene,jewelCamera);
      renderer.readRenderTargetPixels(jewelTarget,0,0,128,64,jewelPixels);
    } finally { renderer.setRenderTarget(prior); }
    for(let row=0;row<64;row++) jewelImage.set(jewelPixels.subarray(row*512,(row+1)*512),(63-row)*512);
    ctx.putImageData(new ImageData(jewelImage,128,64),0,0);
  }
  let previousTime = null;
  let elapsed = 0;
  let authoredThickness = 0.34;
  function render(time = performance.now()) {
    const dt = previousTime === null ? 1/60 : Math.min(.05, Math.max(0,(time-previousTime)*.001));
    previousTime = time;
    const blend = rate => 1-Math.exp(-rate*dt);
    if (!still()) elapsed += dt;
    uniforms.uTime.value = elapsed;

    if (!still()) {
      uniforms.uPointer.value.lerp(pointerTarget, blend(4.03));
      uniforms.uWeave.value += (weaveTarget-uniforms.uWeave.value)*blend(4.2);
      weaveTarget *= Math.exp(-1.15*dt);
      const idleFor = performance.now() - lastPointerAt;
      if (idleFor > 950) energyTarget *= Math.exp(-2.14*dt);
      uniforms.uEnergy.value += (energyTarget - uniforms.uEnergy.value) * blend(3.39);
      uniforms.uVelocity.value += (velocityTarget - uniforms.uVelocity.value) * blend(7.67);
      uniforms.uThickness.value += (Math.min(1,authoredThickness + uniforms.uVelocity.value * 0.46) - uniforms.uThickness.value) * blend(4.68);
      energyTarget *= Math.exp(-.482*dt);
      velocityTarget *= Math.exp(-6.32*dt);
    } else {
      clearJewel();
      uniforms.uEnergy.value = 0.08;
      uniforms.uWeave.value = 0;
      weaveTarget = 0;
      uniforms.uVelocity.value = 0;
      uniforms.uThickness.value = authoredThickness;
    }

    renderer.render(scene, camera);
    sampleJewel();
  }

  function animate(time) {
    if (!alive || still()) { frame = 0; return; }
    render(time);
    frame = requestAnimationFrame(animate);
  }

  function pointer(event) {
    if (still()) return;
    const width = Math.max(1, globalThis.innerWidth || 1);
    const height = Math.max(1, globalThis.innerHeight || 1);
    pointerTarget.set(event.clientX / width, 1 - (event.clientY / height));
    const now = performance.now();
    const dt = Math.max(8, now - lastPointerMoveAt);
    const speed = Math.hypot(event.clientX - lastPointerX, event.clientY - lastPointerY) / dt;
    velocityTarget = Math.min(1, speed / 1.6);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    lastPointerMoveAt = now;
    lastPointerAt = now;
    energyTarget = Math.min(1, energyTarget + 0.12);
    if (still()) render();
  }

  // Instrument interaction feeds the existing shared optical field.
  // No additional WebGL contexts or decorative telemetry.
  function instrumentWake(event) {
    const control=event.target?.closest?.('.wg-locus,.wg-helm-nav,.wg-helm-feather,.glass-chip,.send-jewel');
    if(!control || control.matches(':disabled,[aria-disabled="true"]'))return;
    const rect=control.getBoundingClientRect();
    pointerTarget.set((rect.left+rect.width/2)/Math.max(1,innerWidth),1-(rect.top+rect.height/2)/Math.max(1,innerHeight));
    if(still())return;
    if(jewel!==control){
      clearJewel();
      jewel=control;
      jewelCanvas=document.createElement('canvas');
      jewelCanvas.width=128;jewelCanvas.height=64;
      jewelCanvas.setAttribute('aria-hidden','true');
      Object.assign(jewelCanvas.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',borderRadius:getComputedStyle(control).borderRadius,pointerEvents:'none',opacity:'.22',mixBlendMode:'screen',zIndex:'100'});
      document.body.append(jewelCanvas);
    }
    energyTarget=Math.max(energyTarget,event.type==='pointerdown'?.62:.22);
    velocityTarget=Math.max(velocityTarget,event.type==='pointerdown'?.35:0);
    lastPointerAt=performance.now();
  }

  function wake(event) {
    const detail = event?.detail || {};
    const descriptor=detail.material;
    if(descriptor?.kind==='wayglass.material/v1' &&
       [descriptor.thickness,descriptor.roughness,descriptor.iridescence].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)){
      authoredThickness=descriptor.thickness;
      uniforms.uRoughness.value=descriptor.roughness;
      uniforms.uIridescence.value=descriptor.iridescence;
    }
    const strength = Number(detail.strength);
    const intent = Number(detail.intent);
    const ownership = Number(detail.ownership);
    const handoff = Number(detail.handoff_progress);
    uniforms.uIntent.value = Number.isFinite(intent) ? Math.min(1, Math.max(0, intent)) : uniforms.uIntent.value;
    if (detail.channel === 'OOC' || detail.channel === 'IC') uniforms.uChannel.value = detail.channel === 'OOC' ? 1 : 0;
    uniforms.uOwnership.value = Number.isFinite(ownership) ? Math.min(1, Math.max(0, ownership)) : uniforms.uOwnership.value;
    uniforms.uHandoff.value = Number.isFinite(handoff) ? Math.min(1, Math.max(0, handoff)) : uniforms.uHandoff.value;
    if (detail.canon_state !== undefined) uniforms.uCanonState.value = detail.canon_state === 'conflicted' ? -1 : detail.canon_state === 'unresolved' ? -0.55 : detail.canon_state === 'verified' ? 1 : 0;
    if (still()) {
      render();
      return;
    }
    if(detail.source==='wyrdrune-reading'||detail.source==='room-arrival'||detail.source==='observed-route'){
      weaveTarget=Math.max(weaveTarget,Number.isFinite(strength)?Math.max(0,Math.min(1,strength)):0);
    }
    energyTarget = Math.max(energyTarget, Number.isFinite(strength) ? Math.min(1, Math.max(0, strength)) : 0.72);
  }

  function syncMotion() {
    previousTime = null;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    render();
    if (alive && !still()) frame = requestAnimationFrame(animate);
  }
  function onMotionPreference(event) { reduceMotion = event.matches === true; syncMotion(); }
  function onMotion(event) {
    motionEnabled = event.detail?.enabled === true;
    if (!motionEnabled) { energyTarget = 0; velocityTarget = 0; clearJewel(); }
    syncMotion();
  }
  motionPreference?.addEventListener?.('change', onMotionPreference);
  globalThis.addEventListener?.('wayglass:motion', onMotion);
  document.addEventListener?.('visibilitychange', syncMotion);
  globalThis.addEventListener?.('resize', resize, { passive: true });
  globalThis.addEventListener?.('pointermove', pointer, { passive: true });
  globalThis.addEventListener?.('wayglass:material-wake', wake);
  document.addEventListener('pointerdown',instrumentWake,{passive:true});
  document.addEventListener('focusin',instrumentWake);
  resize();
  if (!still()) frame = requestAnimationFrame(animate);

  return Object.freeze({
    wake(strength = 0.72) {
      wake({ detail: { strength } });
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(frame);
      motionPreference?.removeEventListener?.('change', onMotionPreference);
      globalThis.removeEventListener?.('wayglass:motion', onMotion);
      document.removeEventListener?.('visibilitychange', syncMotion);
      globalThis.removeEventListener?.('resize', resize);
      globalThis.removeEventListener?.('pointermove', pointer);
      globalThis.removeEventListener?.('wayglass:material-wake', wake);
      document.removeEventListener('pointerdown',instrumentWake);
      document.removeEventListener('focusin',instrumentWake);
      clearJewel();
      jewelTarget.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      engravingGeometry.dispose();
      engravingMaterial.dispose();
      jewelGeometry.dispose();
      jewelMaterial.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      canvas.remove();
      delete host.dataset.wayglassField;
    },
  });
}
