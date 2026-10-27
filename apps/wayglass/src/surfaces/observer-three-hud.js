/* Spatial optical Three.js HUD, visualizes existing Wayglass packets; never a sensor. */
export const OBSERVER_THREE_SCHEMA='wayglass.observer-three-hud/v1';
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export async function mountObserverThreeHUD(canvas,{reducedMotion=false}={}){
  const stage=canvas.closest('.observer-stage');
  if(!stage)throw Error('Observer stage missing');
  const overlay=document.createElement('div');
  overlay.className='wg-spatial-hud';
  overlay.setAttribute('aria-label','Optical projection indicators');
  overlay.innerHTML=[
    '<div class="wg-hud-rail wg-hud-top"><span>WG / OPTICAL DECK <b data-hud-quality>INITIALISING</b></span><span>RENDER 3D <b>LOCAL</b></span></div>',
    '<div class="wg-hud-crosshair" aria-hidden="true"><i></i></div>',
    '<div class="wg-hud-identity" aria-hidden="true"><strong>WAYGLASS</strong><small data-hud-phase>OBSERVING</small></div>',
    '<div class="wg-hud-vertical wg-hud-vertical-left" aria-hidden="true"></div>',
    '<div class="wg-hud-vertical wg-hud-vertical-right" aria-hidden="true"></div>',
    '<div class="wg-hud-rail wg-hud-bottom"><span>CHANNEL <strong data-hud-focus>TIME</strong></span><span>FIELD <strong data-hud-field>0.00</strong></span><span>PROVENANCE <strong>LOCAL</strong></span></div>',
    '<p class="wg-hud-boundary">OPTICAL PROJECTION · interpretive mapping · not a physical measurement</p>'
  ].join('');
  stage.insertBefore(overlay,stage.querySelector('.observer-inputs')||null);
  const quality=overlay.querySelector('[data-hud-quality]');
  const focusNode=overlay.querySelector('[data-hud-focus]');
  const fieldNode=overlay.querySelector('[data-hud-field]');
  const phaseNode=overlay.querySelector('[data-hud-phase]');
  let renderer=null,scene=null,camera=null,group=null,inner=null,shell=null,torii=[],active=false,disposed=false,enabled=true,last=0,envTarget=null;
  const layer=document.createElement('canvas');
  layer.className='wg-spatial-three-canvas';
  layer.setAttribute('aria-hidden','true');
  stage.insertBefore(layer,canvas);
  const mode=label=>{
    quality.textContent=label;
    stage.dataset.opticalMode=label.startsWith('WEBGL')?'three':label.startsWith('CLASSIC')?'classic':'fallback';
  };
  const setEnabled=value=>{
    if(disposed)return;
    enabled=Boolean(value);
    mode(!active?'CANVAS FALLBACK':enabled?'WEBGL · THREE.JS':'CLASSIC · 2D');
    if(active&&enabled)renderer?.render(scene,camera);
  };
  try{
    const context=layer.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'})
      ||layer.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});
    if(!context)throw Error('WebGL unavailable');
    const T=await import('three');
    if(disposed){layer.remove();overlay.remove();return{ready:false,available:false,update(){},frame(){},setEnabled(){},dispose(){}};}
    renderer=new T.WebGLRenderer({canvas:layer,context,alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5;
    scene=new T.Scene();camera=new T.PerspectiveCamera(36,1,.1,60);
    // Procedural equirectangular studio light, convolved into an environment map.
    // Specular highlights now depend on surface normals instead of emissive paint.
    // Texture is entirely local, authored at runtime, no CDN or telemetry.
    try{
      const studio=document.createElement('canvas');studio.width=512;studio.height=256;
      const c=studio.getContext('2d');
      if(c){
        const background=c.createLinearGradient(0,0,0,256);
        background.addColorStop(0,'#536d7f');background.addColorStop(.4,'#081521');
        background.addColorStop(.75,'#152839');background.addColorStop(1,'#574332');
        c.fillStyle=background;c.fillRect(0,0,512,256);
        for(const [x,y,w,h,color] of [
          [52,65,36,125,'rgba(220,255,247,.94)'],
          [126,25,10,155,'rgba(142,226,255,.85)'],
          [318,68,62,92,'rgba(255,223,172,.84)'],
          [447,24,18,130,'rgba(176,232,255,.85)'],
        ]){
          const strip=c.createLinearGradient(x,0,x+w,0);
          strip.addColorStop(0,'rgba(255,255,255,0)');
          strip.addColorStop(.28,color);strip.addColorStop(.7,color);
          strip.addColorStop(1,'rgba(255,255,255,0)');
          c.fillStyle=strip;c.fillRect(x,y,w,h);
        }
        const map=new T.CanvasTexture(studio);
        map.mapping=T.EquirectangularReflectionMapping;
        map.colorSpace=T.SRGBColorSpace;
        const pmrem=new T.PMREMGenerator(renderer);
        envTarget=pmrem.fromEquirectangular(map);
        pmrem.dispose();map.dispose();
        scene.environment=envTarget.texture;
      }
    }catch{envTarget?.dispose();envTarget=null;}
    camera.position.set(0,0,12);camera.lookAt(0,0,0);
    scene.add(new T.AmbientLight(0x93bfd4,1.5));
    const cyan=new T.PointLight(0x60f5e7,26,19);cyan.position.set(-3,3,4);scene.add(cyan);
    const gold=new T.PointLight(0xe6ae69,16,17);gold.position.set(3,-2,3);scene.add(gold);
    group=new T.Group();scene.add(group);
    const glass=new T.MeshPhysicalMaterial({
      color:0x91ebe0,metalness:.35,roughness:.12,transparent:true,opacity:.54,
      depthWrite:false,side:T.DoubleSide,clearcoat:1,clearcoatRoughness:.045,
      ior:1.45,transmission:.15,thickness:.8,emissive:0x17556b,emissiveIntensity:.33
    });
    const aqua=new T.MeshBasicMaterial({color:0x8ff8ef,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending});
    const brass=new T.MeshStandardMaterial({color:0xe1b97d,metalness:.89,roughness:.21,emissive:0x46321b,emissiveIntensity:.3});
    inner=new T.Mesh(new T.IcosahedronGeometry(1.08,2),glass);group.add(inner);
    shell=new T.Mesh(new T.IcosahedronGeometry(1.24,1),
      new T.MeshBasicMaterial({color:0xb5fff5,wireframe:true,transparent:true,opacity:.24,depthWrite:false}));
    group.add(shell);
    for(const [radius,tube,rx,ry,rz,material] of [
      [2.28,.019,.25,0,.10,aqua],[2.68,.047,.68,.2,.2,brass],
      [3.15,.019,-.40,.53,-.06,aqua],[3.46,.031,1.04,-.3,.55,brass]
    ]){
      const obj=new T.Mesh(new T.TorusGeometry(radius,tube,12,192),material);
      obj.rotation.set(rx,ry,rz);group.add(obj);torii.push(obj);
    }
    const amber=new T.MeshStandardMaterial({color:0xffe0ab,metalness:.65,roughness:.3,emissive:0x46311c});
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      const node=new T.Mesh(new T.SphereGeometry(i%3===0?.085:.042,12,10),i%3===0?amber:aqua);
      node.position.set(3.17*Math.cos(a),3.17*Math.sin(a),Math.sin(3*a)*.17);
      group.add(node);
    }
    const cloud=[];
    for(let i=0;i<170;i++){
      const a=i*2.3999632297,r=3.52+(i%18)*.044;
      cloud.push(r*Math.cos(a),r*Math.sin(a),-1.1+(i%7)*.22);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(cloud,3));
    group.add(new T.Points(g,new T.PointsMaterial({color:0x98cad5,size:.025,transparent:true,opacity:.54})));
    const resize=()=>{
      if(disposed||!renderer||!layer.isConnected)return;
      const box=layer.getBoundingClientRect();
      const w=Math.max(1,Math.floor(box.width)),h=Math.max(1,Math.floor(box.height));
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    };
    const observer=new ResizeObserver(resize);observer.observe(layer);layer.__wayglassResize=observer;
    resize();renderer.render(scene,camera);active=true;mode('WEBGL · THREE.JS');
    layer.addEventListener('webglcontextlost',event=>{
      event.preventDefault();active=false;mode('CANVAS FALLBACK');
      stage.dispatchEvent(new CustomEvent('wayglass:optics-change'));
    },{once:true});
  }catch{active=false;mode('CANVAS FALLBACK');}
  function update({packet,focus='time',rotation=0,interior=null,lowStim=false,paused=false}={}){
    if(disposed)return;
    focusNode.textContent=String(focus).toUpperCase();
    const vars=packet?.projection?.variables||{};
    const strength=clamp(vars.Q??vars.P??0),energy=clamp(interior?.energy??0);
    fieldNode.textContent=strength.toFixed(2);
    phaseNode.textContent=String(interior?.phase||'observing').toUpperCase();
    stage.dataset.hudPaused=String(Boolean(paused));
    if(!active||!enabled||!inner)return;
    inner.scale.setScalar(.84+energy*.18+strength*.14);
    inner.material.emissiveIntensity=.16+energy*.40;
    group.rotation.z=rotation*.16;
    if(paused||lowStim||reducedMotion)renderer.render(scene,camera);
  }
  function frame(time,{paused=false,lowStim=false,rotation=0}={}){
    if(!active||!enabled||disposed||!renderer||paused)return;
    if(lowStim||reducedMotion){renderer.render(scene,camera);return;}
    if(time-last<28)return;last=time;
    const t=time*.00013;
    inner.rotation.set(t*.34,t*.72,.18);shell.rotation.set(-t*.27,t*.45,-t*.32);
    torii.forEach((obj,i)=>{obj.rotation.z=(i%2?-.11:.11)*t+rotation*.18;});
    group.rotation.y=Math.sin(t*.5)*.10;
    renderer.render(scene,camera);
  }
  function dispose(){
    if(disposed)return;disposed=true;active=false;
    layer.__wayglassResize?.disconnect();
    scene?.traverse(obj=>{obj.geometry?.dispose?.();
      if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose?.());
      else obj.material?.dispose?.();});
    envTarget?.dispose();renderer?.dispose();layer.remove();overlay.remove();
  }
  return{get ready(){return active&&enabled;},get available(){return active;},setEnabled,update,frame,dispose};
}
