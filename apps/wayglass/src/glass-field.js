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
  uniform float uWeaveMode;
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
  uniform sampler2D uLoom;
  uniform sampler2D uLoomDepth;
  uniform float uLoomFocus;
  uniform vec2 uLoomTexel;
  uniform float uLoomActive;
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
    // A moving shuttle carries light along curved, interlaced subsurface fibres.
    // Local mineral density and refractive displacement, shared with the stone.
    float density=fbm(p*5.8+vec2(7.1,2.3));
    vec2 grad=vec2(fbm(p*5.8+vec2(7.12,2.3))-density,
                   fbm(p*5.8+vec2(7.1,2.32))-density);
    vec2 parallax=(uPointer-.5)*depth*.035;
    vec2 q=(p+grad*.18*depth+parallax)*vec2(8.0,12.0);
    float row=floor(q.y+.5);
    float shuttle=.5+.5*sin(time*(.85+.18*uWeaveMode));
    float tension=.075+.045*charge+.025*uWeaveMode;
    float warp=q.y-row-tension*sin(q.x*2.1+row*.73);
    float column=floor(q.x+.5);
    float weft=q.x-column-.13*sin(q.y*2.3+column*.51);
    float parity=.5+.5*cos(PI*(row+column));
    float aa=max(.009,12.0/max(uResolution.y,1.0));
    float radius=.019;
    // Apparent macro focal plane, with depth-dependent circle of confusion.
    float focus=mix(.18,.48,uEnergy);
    float depthW=.15+.36*(1.0-parity);
    float depthV=.15+.36*parity;
    float blurW=.055*abs(depthW-focus);
    float blurV=.055*abs(depthV-focus);
    float w=(1.0-smoothstep(radius,radius+aa+blurW,abs(warp)))*radius/(radius+blurW);
    float v=(1.0-smoothstep(radius,radius+aa+blurV,abs(weft)))*radius/(radius+blurV);
    // Cylindrical fibre normals and a narrow polished highlight.
    float nw=sqrt(max(0.0,1.0-pow(abs(clamp(warp/radius,-1.0,1.0)),2.0)));
    float nv=sqrt(max(0.0,1.0-pow(abs(clamp(weft/radius,-1.0,1.0)),2.0)));
    float zW=.15+.36*(1.0-parity)*v;
    float zV=.15+.36*parity*w;
    vec3 extinction=vec3(1.45,.72,.43)*mix(.75,1.65,density);
    float viewCos=1.0/sqrt(1.0+dot(p,p)*.65);
    zW/=max(.35,viewCos);
    zV/=max(.35,viewCos);
    vec3 tw=exp(-extinction*(depth+zW));
    vec3 tv=exp(-extinction*(depth+zV));
    float head=mix(-7.0,7.0,shuttle);
    float stitch=exp(-pow(abs(q.x-head)*.8,2.0));
    float direction=cos(time*(.85+.18*uWeaveMode));
    float behind=(head-q.x)*sign(direction);
    float tail=exp(-max(0.0,behind)*.36)*smoothstep(-.35,.2,behind);
    float halo=exp(-abs(warp)*19.0)*stitch;
    float veil=1.0-.62*smoothstep(.48,.78,density);
    float beat=.5+.5*cos(q.x*1.7+row*.65-time*2.1);
    vec3 opal=mix(vec3(.19,.78,.66),vec3(.57,.68,1.0),beat);
    vec3 gold=mix(vec3(.68,.36,.12),vec3(1.0,.85,.48),nw);
    vec3 a=opal*w*tw*(.22+.78*nw)*mix(1.0,.2,v*(1.0-parity));
    vec3 b=gold*v*tv*(.22+.78*nv)*mix(1.0,.2,w*parity);
    float knot=w*v*exp(-abs(q.x-head)*.65);
    vec3 needle=vec3(.78,1.0,.92)*w*stitch*.45;
    vec3 scatter=vec3(.22,.48,.39)*halo*tw*.045;
    return ((a+b+needle+vec3(.65,.8,1.0)*knot*.28)*(.035+.22*tail)+scatter)*charge*veil;
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

  // Stonewood: stationary mineralised growth rings, directional pores and buried veins.
  float stonewoodGrain(vec2 p){
    vec2 q=vec2(p.x*.82+p.y*.28,p.y*1.35-p.x*.12);
    float warp=fbm(q*3.4);
    float rings=sin(q.y*47.0+warp*12.0+sin(q.x*2.1)*2.4);
    float pores=noise(q*vec2(12.0,155.0));
    return .65*rings+.35*pores;
  }
  vec3 stonewood(vec2 p,vec3 view,vec3 light){
    float h=stonewoodGrain(p);
    float dx=stonewoodGrain(p+vec2(.002,0.))-h;
    float dy=stonewoodGrain(p+vec2(0.,.002))-h;
    vec3 n=normalize(vec3(-dx*1.7,-dy*1.7,1.));
    float mineral=fbm(p*vec2(4.,13.));
    vec3 base=mix(vec3(.018,.012,.009),vec3(.095,.061,.035),smoothstep(-.6,.8,h));
    base=mix(base,vec3(.047,.065,.067),smoothstep(.48,.78,mineral)*.65);
    vec3 halfVector=normalize(view+light);
    float along=dot(halfVector,normalize(vec3(1.,.18,0.)));
    float satin=exp(-along*along*22.)*pow(max(0.,dot(n,halfVector)),9.);
    float vein=1.-smoothstep(.015,.075,abs(h-.18));
    float buried=vein*smoothstep(.53,.79,mineral)*exp(-uThickness*2.4);
    return base*(.35+.65*max(0.,dot(n,light)))+vec3(.12,.09,.055)*satin*.22+
      vec3(.38,.62,.53)*buried*(.012+.065*uEnergy);
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

    // Architectural stonewood surrounds the central optical glass aperture.
    float timberMask=smoothstep(.30,.86,length(p*vec2(.78,1.0)))*.72;
    colour=mix(colour,stonewood(p,viewDir,lightDir),timberMask);
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

    // Light is filtered by the mineral before the surface is presented.
    if(uLoomActive>.5){
      vec2 uv=vUv;
      float grain=fbm(uv*vec2(83.0,97.0));
      float density=fbm(uv*7.0+vec2(2.3,8.1));
      vec2 microStep=1.0/max(uResolution,vec2(1.0));
      vec2 microScale=vec2(83.0,97.0);
      float gx=fbm((uv+vec2(microStep.x,0.0))*microScale)-grain;
      float gy=fbm((uv+vec2(0.0,microStep.y))*microScale)-grain;
      vec3 mineralNormal=normalize(vec3(-gx*2.4,-gy*2.4,1.0));
      vec3 opticalView=normalize(vec3((.5-uv)*.85,1.0));
      float incidence=max(.15,dot(mineralNormal,opticalView));
      float fresnelStone=.045+.955*pow(1.0-incidence,5.0);
      vec2 shift=(vec2(grain-.5,density-.5)*2.0+mineralNormal.xy*3.0)*uLoomTexel;
      float rawDepth=texture2D(uLoomDepth,uv).r;
      float viewDepth=.1*30.0/(30.0-rawDepth*(30.0-.1));
      float coc=rawDepth<.99999?clamp(abs(viewDepth-uLoomFocus)/max(viewDepth,.1)*24.0,0.0,5.0):1.0;
      vec2 d=uLoomTexel*(.65+2.0*uRoughness+1.5*density+coc);
      vec3 core=texture2D(uLoom,uv+shift).rgb;
      vec3 scatter=(texture2D(uLoom,uv+shift+vec2(d.x,0.0)).rgb+
        texture2D(uLoom,uv+shift-vec2(d.x,0.0)).rgb+
        texture2D(uLoom,uv+shift+vec2(0.0,d.y)).rgb+
        texture2D(uLoom,uv+shift-vec2(0.0,d.y)).rgb)*.25;
      float embeddedDepth=rawDepth<.99999?clamp((viewDepth-7.0)*.12,0.0,.65):.2;
      float opticalPath=(uThickness+.45*density+embeddedDepth)/incidence;
      vec3 transmission=exp(-vec3(2.1,1.25,.85)*opticalPath)*(1.0-fresnelStone);
      // Multi-scale optical point spread: preserve fine cores beneath satin stone.
      vec2 wide=d*2.8;
      vec3 veil=(texture2D(uLoom,uv+vec2(wide.x,wide.y)).rgb+
        texture2D(uLoom,uv+vec2(-wide.x,wide.y)).rgb+
        texture2D(uLoom,uv+vec2(wide.x,-wide.y)).rgb+
        texture2D(uLoom,uv-wide).rgb)*.25;
      float focalClarity=clamp(1.0-uRoughness*.65-density*.25,.15,.9);
      float microPits=smoothstep(.64,.87,grain);
      vec3 internalLight=(core*focalClarity+scatter*(1.0-focalClarity)+veil*.12)*transmission;
      colour+=internalLight*(.88-.18*microPits);
      vec3 softbox=normalize(vec3(-.4,.65,1.0));
      float satin=pow(max(0.0,dot(mineralNormal,normalize(softbox+opticalView))),mix(24.0,5.0,uRoughness));
      colour+=vec3(.075,.082,.09)*satin*fresnelStone*(.5+.5*grain);
      colour+=veil*transmission*vec3(.07,.09,.10);
      // Local radiance concentration produces a mineral-scattered knot halo.
      float coreEnergy=dot(core,vec3(.2126,.7152,.0722));
      float nearbyEnergy=dot(scatter,vec3(.2126,.7152,.0722));
      float knot=smoothstep(.06,.42,coreEnergy)*smoothstep(.025,.22,nearbyEnergy);
      vec3 knotTint=(core+scatter)/max(.08,coreEnergy+nearbyEnergy);
      colour+=knotTint*transmission*knot*(.035+.065*density);
      vec3 dispersion=vec3(
        texture2D(uLoom,uv+shift+d*.35).r,
        scatter.g,
        texture2D(uLoom,uv+shift-d*.35).b);
      colour+=dispersion*transmission*knot*.045;
      // Gentle highlight compression, avoiding clipped neon cores.
      colour=colour/(vec3(1.0)+max(colour-vec3(.72),vec3(0.0))*.45);
    }
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
  host.dataset.wayglassField = 'webgl-initialising';
  renderer.debug.checkShaderErrors = true;
  let opticalFailure = false;
  renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
    opticalFailure = true;
    host.dataset.wayglassField = 'shader-error';
    const detail = [gl.getProgramInfoLog(program),gl.getShaderInfoLog(vertex),gl.getShaderInfoLog(fragment)].filter(Boolean).join('\n');
    console.error('Wayglass optical shader failed', detail);
    host.dispatchEvent(new CustomEvent('wayglass:optical-error',{bubbles:true,detail:{message:detail}}));
  };
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.6));

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const loomTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
  loomTarget.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const uniforms = {
    uLoom:{value:loomTarget.texture},
    uLoomDepth:{value:loomTarget.depthTexture},
    uLoomFocus:{value:8.65},
    uLoomTexel:{value:new THREE.Vector2(1,1)},
    uLoomActive:{value:0},
    uTime: { value: 0 },
    uWeave: { value: 0 },
    uWeaveMode: { value: 0 },
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

  // Spatial loom: one shared renderer, genuine depth-tested tubular fibres.
  const loomScene=new THREE.Scene();
  const loomCamera=new THREE.PerspectiveCamera(38,1,.1,30);
  loomCamera.position.set(0,0,8);
  const loom=new THREE.Group();
  loomScene.add(loom);
  const fibres=[];
  for(let i=0;i<9;i++){
    const points=[];
    for(let j=0;j<=64;j++){
      const t=j/64, x=(t-.5)*9;
      const phase=i*Math.PI*2/9;
      points.push(new THREE.Vector3(x,.46*Math.sin(t*Math.PI*4+phase),-.65+.32*Math.cos(t*Math.PI*4+phase)));
    }
    const curve=new THREE.CatmullRomCurve3(points);
    const tube=new THREE.TubeGeometry(curve,96,.009,5,false);
    const mat=new THREE.ShaderMaterial({
      transparent:true,depthWrite:true,
      uniforms:{charge:{value:0},clock:{value:0},form:{value:0},touch:{value:new THREE.Vector2(.5,.5)},touchStrength:{value:0},rippleAge:{value:10},phase:{value:i/9},tint:{value:new THREE.Color(i%3===0?0xd9b76d:i%3===1?0x8ae9cf:0x879cdd)}},
      vertexShader:`
        uniform float clock; uniform float charge; uniform float phase; uniform float form; uniform vec2 touch; uniform float touchStrength; uniform float rippleAge;
        varying vec2 fibreUV; varying vec3 fibreN; varying float fibreDepth;
        void main(){
          fibreUV=uv;
          vec3 q=position;
          float t=uv.x;
          float envelope=sin(t*3.14159265);
          float breath=.5+.5*sin(clock*.65+phase*6.2831853);
          float gather=charge*envelope;
          q.y+=gather*(.34*sin(t*12.566+clock*.9+phase*6.283)+.12*sin(t*25.13-clock*.7));
          q.z+=gather*.32*cos(t*12.566-clock*.65+phase*6.283);
          q.y*=1.0+.45*breath*gather;
          // Continuous deformation into a ring or toroidal knot. These are
          // geometric motifs, not semantic glyphs or simulated matter.
          float theta=t*6.2831853;
          float strand=phase*6.2831853;
          float knotMix=smoothstep(1.0,2.0,form);
          float major=1.45+.18*cos(theta*3.0+strand)*knotMix;
          float phi=theta*(1.0+knotMix);
          vec3 ring=vec3(major*cos(phi),major*sin(phi),-.65+.35*sin(theta*3.0+strand)*knotMix);
          ring+=vec3(cos(phi)*cos(strand),sin(phi)*cos(strand),sin(strand))*.13;
          // Preserve the cross-section instead of collapsing each tube to a line.
          vec3 centre=vec3((t-.5)*9.0,.46*sin(t*12.5663706+strand),-.65+.32*cos(t*12.5663706+strand));
          vec3 offset=position-centre;
          ring+=offset;
          q=mix(q,ring,smoothstep(0.0,1.0,form));
          // Taper the actual tube cross-section at both ends.
          float taper=smoothstep(0.0,.075,t)*smoothstep(0.0,.10,1.0-t);
          q-=offset*(1.0-taper);
          // Fine free tips curl gently; the motion vanishes as the loop gathers.
          float tip=1.0-smoothstep(0.0,.13,min(t,1.0-t));
          float freeTip=tip*(1.0-smoothstep(0.0,1.0,form))*charge;
          q.y+=freeTip*.065*sin(clock*1.2+strand+t*9.0);
          q.z+=freeTip*.045*cos(clock*.85+strand+t*7.0);
          // Local elastic displacement in the projected plane of the loom.
          vec4 projected=projectionMatrix*modelViewMatrix*vec4(q,1.0);
          vec2 screen=projected.xy/max(.001,projected.w)*.5+.5;
          vec2 delta=screen-touch;
          float distance2=dot(delta,delta);
          float influence=exp(-distance2*65.0)*touchStrength;
          vec2 direction=delta/sqrt(distance2+.002);
          float radius=sqrt(distance2+.00001);
          float waveDistance=radius-rippleAge*.42;
          float wave=exp(-waveDistance*waveDistance*180.0)*sin(waveDistance*38.0)*exp(-rippleAge*2.1);
          float anchored=sin(t*3.14159265);
          float response=(influence*.38+wave*.11*touchStrength)*anchored;
          q.xy+=direction*response;
          q.z-=(influence*.22+wave*.07*touchStrength)*anchored;
          fibreN=normalize(normalMatrix*normal);
          vec4 p=modelViewMatrix*vec4(q,1.0);
          fibreDepth=-p.z; gl_Position=projectionMatrix*p;
        }`,
      fragmentShader:`
        varying vec2 fibreUV; varying vec3 fibreN; varying float fibreDepth;
        uniform float charge; uniform float clock; uniform float phase; uniform vec3 tint;
        void main(){
          float head=fract(clock*.19+phase*.18);
          float d=abs(fibreUV.x-head); d=min(d,1.0-d);
          float pulse=exp(-d*d*240.0);
          float age=fract(head-fibreUV.x+1.0);
          float trail=exp(-age*12.0)*smoothstep(0.0,.035,age)*(1.0-smoothstep(.85,1.0,age));
          float facing=abs(normalize(fibreN).z);
          float rim=pow(facing,.6);
          float core=pow(facing,5.0);
          float sheath=pow(facing,.35);
          float fineStructure=.94+.06*sin(fibreUV.x*160.0+phase*6.283);
          float curvature=.82+.18*cos(fibreUV.x*12.566+phase*6.283+clock*.4);
          float path=max(0.0,fibreDepth-6.8);
          vec3 transmission=exp(-vec3(.92,.52,.31)*path);
          float focus=7.8+.3*sin(clock*.4);
          float defocus=abs(fibreDepth-focus);
          float fade=smoothstep(0.0,.09,fibreUV.x)*smoothstep(0.0,.12,1.0-fibreUV.x);
          float alpha=charge*(.08+.48*pulse+.22*trail)*fade*(.35+.65*sheath)/(1.0+defocus*.65);
          float tipLight=exp(-abs(fibreUV.x-.045)*75.0)+exp(-abs(fibreUV.x-.955)*75.0);
          if(alpha<.004)discard;
          gl_FragColor=vec4((tint*(.24+.46*rim)+mix(tint,vec3(1.0,.96,.87),.65)*core*(.30+.28*pulse)+vec3(.12)*tipLight)*transmission*fineStructure*curvature,alpha);
        }`
    });
    const mesh=new THREE.Mesh(tube,mat);
    loom.add(mesh);fibres.push(mesh);
  }

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


  // Shared GPU morphogenesis: seeded grains converge onto a spatial shell.
  const grainCount=4096, grainPositions=new Float32Array(grainCount*3), grainSeeds=new Float32Array(grainCount);
  for(let i=0;i<grainCount;i++){
    const z=1-2*(i+.5)/grainCount, a=i*2.399963229728653, radius=Math.sqrt(1-z*z);
    grainPositions.set([radius*Math.cos(a)*2.2,z*1.5,radius*Math.sin(a)*.8],i*3);
    grainSeeds[i]=((i*1664525+1013904223)>>>0)/4294967296;
  }
  const grainGeometry=new THREE.BufferGeometry();
  grainGeometry.setAttribute('position',new THREE.BufferAttribute(grainPositions,3));
  grainGeometry.setAttribute('seed',new THREE.BufferAttribute(grainSeeds,1));
  const grainMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{progress:{value:1},form:{value:0},clock:{value:0},focus:{value:8.65}},
    vertexShader:`attribute float seed; uniform float progress; uniform float form; uniform float clock; uniform float focus; varying float glow; varying float nacre; varying float depthFade; varying float defocus;
      void main(){float t=smoothstep(0.,1.,progress);float a=seed*37.7+(1.-t)*5.;
      vec3 target=position;
      float theta=seed*6.2831853, phi=fract(seed*137.51)*6.2831853;
      if(form>.5 && form<1.5){float r=.15+2.2*sqrt(seed);float spiral=theta+6.*r;target=vec3(r*cos(spiral),r*sin(spiral)*.65,.2*sin(phi));}
      else if(form>1.5 && form<2.5){float r=1.4+.45*cos(phi);target=vec3(r*cos(theta),r*sin(theta),.45*sin(phi));}
      else if(form>2.5){target=position/max(.01,max(abs(position.x)/2.2,max(abs(position.y)/1.5,abs(position.z)/.8)));}
      vec3 p=target+vec3(cos(a),sin(a),sin(a*2.))*((1.-t)*(1.+seed)*2.);
      vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
      defocus=clamp(abs(-mv.z-focus)*.48,0.,1.);gl_PointSize=clamp(19./max(1.,-mv.z)+defocus*1.5,1.5,5.);vec3 normal=normalize(mat3(modelViewMatrix)*normalize(target+vec3(.0001)));float incidence=abs(dot(normal,normalize(-mv.xyz)));nacre=.5+.5*cos(incidence*5.+seed*2.+clock*.18);depthFade=exp(-.065*max(0.,-mv.z));glow=sin(3.14159265*t)*(.35+.65*seed)*(.78+.22*pow(1.-incidence,2.));}`,
    fragmentShader:`varying float glow; varying float nacre; varying float depthFade; varying float defocus;void main(){
      float r=length(gl_PointCoord-.5)*2.;
      float edge=1.-smoothstep(.62,1.,r);
      float core=exp(-mix(24.,12.,defocus)*r*r),halo=exp(-mix(7.,4.8,defocus)*r*r);
      vec3 pearl=mix(vec3(.68,.76,.77),vec3(1.,.88,.67),clamp(glow,0.,1.));
      pearl=mix(pearl,vec3(.72,.88,.84),nacre*.22);gl_FragColor=vec4(pearl,glow*depthFade*(.23*core+.065*halo)*edge/(1.+2.8*defocus));
    }`
  });
  const grains=new THREE.Points(grainGeometry,grainMaterial);grains.visible=false;loomScene.add(grains);
  let morphStart=-Infinity,morphDuration=1.8;
  function morphogenesis(event){
    if(still())return;
    const duration=Number(event.detail?.durationMs??1800);
    morphStart=elapsed;morphDuration=Number.isFinite(duration)?Math.max(.2,Math.min(8,duration/1000)):1.8;
    grainMaterial.uniforms.form.value=({shell:0,spiral:1,torus:2,crystal:3})[event.detail?.form]??0;
  }
  const motionPreference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionPreference?.matches === true;
  let motionEnabled = true;
  let featherHeld = false;
  const still = () => reduceMotion || !motionEnabled || featherHeld || document.hidden;
  const pointerTarget = new THREE.Vector2(0.68, 0.3);
  let frame = 0;
  let alive = true;
  let energyTarget = 0;
  let weaveTarget = .24;
  let weaveForm = 0;
  let weaveFormVelocity = 0;
  let weaveFormTarget = 0;
  let lastPointerAt = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let lastPointerMoveAt = performance.now();
  let velocityTarget = 0;

  function resize() {
    const width = Math.max(1, globalThis.innerWidth || 1);
    const height = Math.max(1, globalThis.innerHeight || 1);
    renderer.setSize(width, height, false);
    loomCamera.aspect=width/height;loomCamera.updateProjectionMatrix();
    const lw=Math.max(1,Math.round(width*.75)),lh=Math.max(1,Math.round(height*.75));
    loomTarget.setSize(lw,lh);uniforms.uLoomTexel.value.set(1/lw,1/lh);
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
      // Exact critically damped spring integration, independent of frame rate.
      const omega=3.2, displacement=weaveForm-weaveFormTarget;
      const impulse=weaveFormVelocity+omega*displacement;
      const decay=Math.exp(-omega*dt);
      weaveForm=weaveFormTarget+(displacement+impulse*dt)*decay;
      weaveFormVelocity=(weaveFormVelocity-omega*impulse*dt)*decay;
      weaveTarget = .24+(weaveTarget-.24)*Math.exp(-1.15*dt);
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
      weaveForm=0;weaveFormTarget=0;weaveFormVelocity=0;
      uniforms.uVelocity.value = 0;
      uniforms.uThickness.value = authoredThickness;
    }

    const morphProgress=Math.min(1,Math.max(0,(elapsed-morphStart)/morphDuration));
    grainMaterial.uniforms.focus.value=uniforms.uLoomFocus.value;grainMaterial.uniforms.clock.value=elapsed;grainMaterial.uniforms.progress.value=morphProgress;grains.visible=!still()&&morphProgress<1;
    uniforms.uLoomActive.value=0;
    uniforms.uLoomFocus.value+=(8.65+(uniforms.uPointer.value.y-.5)*.7-uniforms.uLoomFocus.value)*blend(2.0);
    if(!still() && (uniforms.uWeave.value>.008||grains.visible)){
      loom.rotation.y+=((uniforms.uPointer.value.x-.5)*.18-loom.rotation.y)*blend(3.0);
      loom.rotation.x+=((uniforms.uPointer.value.y-.5)*.12-loom.rotation.x)*blend(3.0);
      for(const fibre of fibres){
        fibre.material.uniforms.charge.value=uniforms.uWeave.value;
        fibre.material.uniforms.clock.value=elapsed;
        fibre.material.uniforms.form.value=weaveForm;
        fibre.material.uniforms.touch.value.copy(uniforms.uPointer.value);
        fibre.material.uniforms.touchStrength.value=Math.min(1,uniforms.uEnergy.value);
        fibre.material.uniforms.rippleAge.value=Math.min(10,Math.max(0,(performance.now()-lastPointerAt)*.001));
      }
      const auto=renderer.autoClear,prior=renderer.getRenderTarget();
      const clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha();
      try{renderer.autoClear=true;renderer.setRenderTarget(loomTarget);renderer.setClearColor(0x000000,0);renderer.clear();renderer.render(loomScene,loomCamera);uniforms.uLoomActive.value=1;}
      finally{renderer.setRenderTarget(prior);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;}
    }
    renderer.render(scene, camera);
    if (!opticalFailure) host.dataset.wayglassField = 'webgl';
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
    // Every organ already emitting a material signal shares the optical loom.
    // Modes describe visual behaviour, not proof of execution.
    const mode=detail.source==='wyrdrune-reading'?1:detail.mode==='return'?2:detail.source==='observed-route'?3:0;
    uniforms.uWeaveMode.value=mode;
    weaveFormTarget=mode===1?1:mode===2?2:mode===3?1.5:0;
    weaveTarget=Math.max(weaveTarget,Number.isFinite(strength)?Math.max(0,Math.min(1,strength))*.8:0);
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
  function onFeather(event){
    featherHeld=event.detail?.stopped===true;
    if(featherHeld){energyTarget=0;weaveTarget=0;velocityTarget=0;clearJewel();}
    syncMotion();
  }
  globalThis.addEventListener?.('wayglass:morphogenesis',morphogenesis);
  globalThis.addEventListener?.('wayglass:feather',onFeather);
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
      globalThis.removeEventListener?.('wayglass:morphogenesis',morphogenesis);
      grainGeometry.dispose();grainMaterial.dispose();
      globalThis.removeEventListener?.('wayglass:feather',onFeather);
      document.removeEventListener?.('visibilitychange', syncMotion);
      globalThis.removeEventListener?.('resize', resize);
      globalThis.removeEventListener?.('pointermove', pointer);
      globalThis.removeEventListener?.('wayglass:material-wake', wake);
      document.removeEventListener('pointerdown',instrumentWake);
      document.removeEventListener('focusin',instrumentWake);
      clearJewel();
      for(const fibre of fibres){fibre.geometry.dispose();fibre.material.dispose();}
      loomTarget.dispose();
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
