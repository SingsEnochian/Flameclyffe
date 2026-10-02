const GLASS_SELECTOR = ['.glass','.agent-card','.work-item','.stat-card','.capability','.house-chat-drawer','.return-engine-drawer','.crew-link-panel'].join(',');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
const coarsePointer = matchMedia('(pointer: coarse)');

function opticalTargets(){ return [...document.querySelectorAll(GLASS_SELECTOR)]; }
function bindPanel(panel){
  if(panel.dataset.glassOpticBound === 'true') return;
  panel.dataset.glassOpticBound='true'; panel.dataset.glassOptic='true';
  let settleTimer=null;
  let lastSample={x:0,y:0,t:performance.now()};
  const settle=()=>{
    clearTimeout(settleTimer);
    panel.dataset.glassMoving='false';
    panel.style.setProperty('--glass-x','50%'); panel.style.setProperty('--glass-y','42%');
    panel.style.setProperty('--glass-rx','0deg'); panel.style.setProperty('--glass-ry','0deg');
    panel.style.setProperty('--glass-shift-x','0px'); panel.style.setProperty('--glass-shift-y','0px');
    panel.style.setProperty('--glass-depth-shift','0px');
    panel.style.setProperty('--glass-caustic-alpha','.34');
    panel.style.setProperty('--glass-velocity','0');
    panel.style.setProperty('--glass-specular','.24');
    panel.style.setProperty('--glass-velocity-blur','0px');
    panel.style.setProperty('--glass-shadow-y','18px');
    panel.style.setProperty('--glass-shadow-size','52px');
    panel.style.setProperty('--glass-inner-depth-size','24px');
  };
  const move=(clientX,clientY,intensity=1)=>{
    if(reducedMotion.matches) return;
    const rect=panel.getBoundingClientRect(); if(!rect.width||!rect.height) return;
    const nx=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
    const ny=Math.max(0,Math.min(1,(clientY-rect.top)/rect.height));
    const dx=nx-0.5, dy=ny-0.5;
    const distance=Math.min(1,Math.hypot(dx,dy)*1.75);
    const now=performance.now();
    const dt=Math.max(8,now-lastSample.t);
    const travel=Math.hypot(clientX-lastSample.x,clientY-lastSample.y);
    const velocity=Math.max(0,Math.min(1,travel/dt/1.35));
    lastSample={x:clientX,y:clientY,t:now};
    const dynamic=intensity*(1+velocity*0.34);
    panel.dataset.glassMoving='true';
    panel.style.setProperty('--glass-x',(nx*100).toFixed(1)+'%');
    panel.style.setProperty('--glass-y',(ny*100).toFixed(1)+'%');
    panel.style.setProperty('--glass-rx',((0.5-ny)*1.85*dynamic).toFixed(2)+'deg');
    panel.style.setProperty('--glass-ry',((nx-0.5)*2.15*dynamic).toFixed(2)+'deg');
    panel.style.setProperty('--glass-shift-x',(dx*10*dynamic).toFixed(2)+'px');
    panel.style.setProperty('--glass-shift-y',(dy*10*dynamic).toFixed(2)+'px');
    panel.style.setProperty('--glass-depth-shift',((distance*3.2+velocity*1.8)*intensity).toFixed(2)+'px');
    panel.style.setProperty('--glass-caustic-alpha',(0.34+distance*0.26+velocity*0.18).toFixed(2));
    panel.style.setProperty('--glass-velocity',velocity.toFixed(3));
    panel.style.setProperty('--glass-specular',(0.24+distance*0.12+velocity*0.26).toFixed(3));
    panel.style.setProperty('--glass-velocity-blur',(velocity*1.2).toFixed(2)+'px');
    panel.style.setProperty('--glass-shadow-y',(18+velocity*6).toFixed(2)+'px');
    panel.style.setProperty('--glass-shadow-size',(52+velocity*10).toFixed(2)+'px');
    panel.style.setProperty('--glass-inner-depth-size',(24+velocity*8).toFixed(2)+'px');
  };
  settle();

  panel.addEventListener('pointermove',(event)=>{
    // Fine pointers steer on hover. Coarse pointers steer while the finger/stylus is in contact.
    if(coarsePointer.matches && event.buttons===0 && event.pressure===0) return;
    clearTimeout(settleTimer);
    move(event.clientX,event.clientY,coarsePointer.matches?0.72:1);
  },{passive:true});
  panel.addEventListener('pointerdown',(event)=>{
    clearTimeout(settleTimer);
    move(event.clientX,event.clientY,coarsePointer.matches?0.72:1);
  },{passive:true});
  const relax=()=>{ settleTimer=setTimeout(settle,coarsePointer.matches?260:90); };
  panel.addEventListener('pointerup',relax,{passive:true});
  panel.addEventListener('pointercancel',relax,{passive:true});
  if(!coarsePointer.matches) panel.addEventListener('pointerleave',relax,{passive:true});
}
function bindPanels(){ opticalTargets().forEach(bindPanel); }
let bindQueued=false;
const observer=new MutationObserver(()=>{ if(bindQueued)return; bindQueued=true; queueMicrotask(()=>{bindQueued=false;bindPanels();}); });
observer.observe(document.documentElement,{childList:true,subtree:true}); bindPanels();

async function startThreeLightfield(){
  if(reducedTransparency.matches){ document.body.dataset.glassOptics='solid'; return null; }
  let THREE;
  try { THREE = await import('three'); } catch { document.body.dataset.glassOptics='css'; return null; }
  const canvas=document.createElement('canvas'); canvas.id='house-glass-three'; canvas.setAttribute('aria-hidden','true'); document.body.prepend(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5)); renderer.setClearColor(0x000000,0); renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.88;
  const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(42,1,0.1,30); camera.position.set(0,0,8.2);
  const environmentCanvas=document.createElement('canvas'); environmentCanvas.width=128; environmentCanvas.height=64;
  const env=environmentCanvas.getContext('2d');
  if(env){
    const sky=env.createLinearGradient(0,0,128,64); sky.addColorStop(0,'#d7fff2'); sky.addColorStop(.24,'#466f67'); sky.addColorStop(.58,'#130f24'); sky.addColorStop(1,'#d8b56a'); env.fillStyle=sky; env.fillRect(0,0,128,64);
    const glow=env.createRadialGradient(92,18,0,92,18,34); glow.addColorStop(0,'rgba(255,245,213,.72)'); glow.addColorStop(1,'rgba(255,245,213,0)'); env.fillStyle=glow; env.fillRect(0,0,128,64);
  }
  const environmentTexture=new THREE.CanvasTexture(environmentCanvas); environmentTexture.mapping=THREE.EquirectangularReflectionMapping; environmentTexture.colorSpace=THREE.SRGBColorSpace; scene.environment=environmentTexture;
  const group=new THREE.Group(); scene.add(group);
  scene.add(new THREE.HemisphereLight(0xc8fff0,0x16082f,1.65));
  const key=new THREE.DirectionalLight(0xf6ddad,3.2); key.position.set(3.2,4.2,5); scene.add(key);
  const rim=new THREE.PointLight(0xa998ff,13,15,2); rim.position.set(-4,-2.2,3.5); scene.add(rim);
  const geometry=new THREE.IcosahedronGeometry(1.45,4);
  const specs=[
    {x:-3.8,y:2.25,z:-1.2,s:1.32,color:0x84a29a,thickness:2.0,ior:1.44},
    {x:3.5,y:-1.9,z:-1.8,s:1.55,color:0x988fbd,thickness:2.5,ior:1.48},
    {x:0.4,y:3.8,z:-2.4,s:0.96,color:0xd8b56a,thickness:1.6,ior:1.42}
  ];
  const meshes=specs.map((spec,index)=>{
    const material=new THREE.MeshPhysicalMaterial({color:spec.color,roughness:0.13+index*0.03,metalness:0,transmission:0.95,thickness:spec.thickness+0.7,ior:spec.ior,clearcoat:1,clearcoatRoughness:0.10,transparent:true,opacity:1,attenuationColor:spec.color,attenuationDistance:3.2,envMapIntensity:0.82,specularIntensity:1});
    if('dispersion' in material) material.dispersion=0.055+index*0.012;
    if('anisotropy' in material) material.anisotropy=0.18;
    const mesh=new THREE.Mesh(geometry,material); mesh.position.set(spec.x,spec.y,spec.z); mesh.scale.setScalar(spec.s); mesh.rotation.set(index*0.7,index*1.1,index*0.35); group.add(mesh); return mesh;
  });
  const causticGeometry=new THREE.TorusKnotGeometry(2.4,0.045,150,10,2,5);
  const causticMaterial=new THREE.MeshBasicMaterial({color:0xb8ffe4,transparent:true,opacity:0.12,depthWrite:false});
  const caustic=new THREE.Mesh(causticGeometry,causticMaterial); caustic.position.set(0,0,-3.2); caustic.scale.set(1.55,1.05,1); group.add(caustic);
  const target={x:0,y:0,v:0}, current={x:0,y:0,v:0}; let lastGlobal={x:innerWidth/2,y:innerHeight/2,t:performance.now()};
  const onPointer=(event)=>{ const now=performance.now(); const dt=Math.max(8,now-lastGlobal.t); const travel=Math.hypot(event.clientX-lastGlobal.x,event.clientY-lastGlobal.y); target.x=(event.clientX/Math.max(1,innerWidth)-0.5)*2; target.y=-((event.clientY/Math.max(1,innerHeight)-0.5)*2); target.v=Math.min(1,travel/dt/1.5); lastGlobal={x:event.clientX,y:event.clientY,t:now}; };
  addEventListener('pointermove',onPointer,{passive:true});
  function resize(){ const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight); renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize',resize,{passive:true});
  let disposed=false;
  function frame(time=0){
    if(disposed)return; current.x+=(target.x-current.x)*0.045; current.y+=(target.y-current.y)*0.045; current.v+=(target.v-current.v)*0.12; target.v*=0.92;
    group.rotation.y=current.x*(0.19+current.v*0.035); group.rotation.x=current.y*(0.13+current.v*0.025); group.position.z=(Math.abs(current.x)+Math.abs(current.y))*0.12+current.v*0.09;
    meshes.forEach((mesh,index)=>{ const phase=time*0.00008*(index+1); mesh.rotation.x+=0.0007*(index+1); mesh.rotation.y+=0.0011*(index+1); mesh.position.x+=Math.sin(phase+index)*0.0008; mesh.position.y+=Math.cos(phase*1.3+index)*0.0006; });
    caustic.rotation.z=time*0.000025; caustic.rotation.x=current.y*0.22; caustic.rotation.y=current.x*0.28; caustic.scale.z=1+current.v*0.18; caustic.material.opacity=0.08+(Math.abs(current.x)+Math.abs(current.y))*0.05+current.v*0.08;
    key.position.x=3.2+current.x*2.6; key.position.y=4.2+current.y*2.0; key.intensity=3.05+current.v*0.8; rim.position.x=-4-current.x*1.5; rim.intensity=12+current.v*4.5; renderer.render(scene,camera);
    if(!reducedMotion.matches) requestAnimationFrame(frame);
  }
  renderer.render(scene,camera); if(!reducedMotion.matches) requestAnimationFrame(frame); document.body.dataset.glassOptics='three';
  const dispose=()=>{ disposed=true; removeEventListener('pointermove',onPointer); removeEventListener('resize',resize); geometry.dispose(); meshes.forEach((mesh)=>mesh.material.dispose()); causticGeometry.dispose(); causticMaterial.dispose(); environmentTexture.dispose(); renderer.dispose(); canvas.remove(); };
  return Object.freeze({renderer,scene,camera,meshes,dispose});
}
let lightfield=null; startThreeLightfield().then((value)=>{ lightfield=value; });
globalThis.HouseGlassOptics=Object.freeze({bindPanels,get mode(){return document.body.dataset.glassOptics||'pending';},get active(){return Boolean(lightfield);},dispose(){lightfield?.dispose?.();lightfield=null;}});