const GLASS_SELECTOR = ['.glass','.agent-card','.work-item','.stat-card','.capability','.house-chat-drawer','.return-engine-drawer','.crew-link-panel'].join(',');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const reducedTransparency = matchMedia('(prefers-reduced-transparency: reduce)');
const coarsePointer = matchMedia('(pointer: coarse)');

function opticalTargets(){ return [...document.querySelectorAll(GLASS_SELECTOR)]; }
function bindPanel(panel){
  if(panel.dataset.glassOpticBound === 'true') return;
  panel.dataset.glassOpticBound='true'; panel.dataset.glassOptic='true';
  const settle=()=>{
    panel.style.setProperty('--glass-x','50%'); panel.style.setProperty('--glass-y','42%');
    panel.style.setProperty('--glass-rx','0deg'); panel.style.setProperty('--glass-ry','0deg');
    panel.style.setProperty('--glass-shift-x','0px'); panel.style.setProperty('--glass-shift-y','0px');
  };
  settle();
  if(!coarsePointer.matches && !reducedMotion.matches){
    panel.addEventListener('pointermove',(event)=>{
      const rect=panel.getBoundingClientRect(); if(!rect.width||!rect.height) return;
      const nx=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
      const ny=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
      panel.style.setProperty('--glass-x',(nx*100).toFixed(1)+'%');
      panel.style.setProperty('--glass-y',(ny*100).toFixed(1)+'%');
      panel.style.setProperty('--glass-rx',((0.5-ny)*1.35).toFixed(2)+'deg');
      panel.style.setProperty('--glass-ry',((nx-0.5)*1.65).toFixed(2)+'deg');
      panel.style.setProperty('--glass-shift-x',((nx-0.5)*7).toFixed(2)+'px');
      panel.style.setProperty('--glass-shift-y',((ny-0.5)*7).toFixed(2)+'px');
    },{passive:true});
    panel.addEventListener('pointerleave',settle,{passive:true});
  }
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
  const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(42,1,0.1,30); camera.position.set(0,0,8.2);
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
    const material=new THREE.MeshPhysicalMaterial({color:spec.color,roughness:0.16+index*0.035,metalness:0,transmission:0.92,thickness:spec.thickness,ior:spec.ior,clearcoat:1,clearcoatRoughness:0.14,transparent:true,opacity:0.42,attenuationColor:spec.color,attenuationDistance:3.4});
    const mesh=new THREE.Mesh(geometry,material); mesh.position.set(spec.x,spec.y,spec.z); mesh.scale.setScalar(spec.s); mesh.rotation.set(index*0.7,index*1.1,index*0.35); group.add(mesh); return mesh;
  });
  const target={x:0,y:0}, current={x:0,y:0};
  const onPointer=(event)=>{ target.x=(event.clientX/Math.max(1,innerWidth)-0.5)*2; target.y=-((event.clientY/Math.max(1,innerHeight)-0.5)*2); };
  addEventListener('pointermove',onPointer,{passive:true});
  function resize(){ const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight); renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix(); }
  resize(); addEventListener('resize',resize,{passive:true});
  let disposed=false;
  function frame(time=0){
    if(disposed)return; current.x+=(target.x-current.x)*0.045; current.y+=(target.y-current.y)*0.045;
    group.rotation.y=current.x*0.16; group.rotation.x=current.y*0.11;
    meshes.forEach((mesh,index)=>{ const phase=time*0.00008*(index+1); mesh.rotation.x+=0.0007*(index+1); mesh.rotation.y+=0.0011*(index+1); mesh.position.x+=Math.sin(phase+index)*0.0008; mesh.position.y+=Math.cos(phase*1.3+index)*0.0006; });
    key.position.x=3.2+current.x*2.2; key.position.y=4.2+current.y*1.7; rim.position.x=-4-current.x*1.2; renderer.render(scene,camera);
    if(!reducedMotion.matches) requestAnimationFrame(frame);
  }
  renderer.render(scene,camera); if(!reducedMotion.matches) requestAnimationFrame(frame); document.body.dataset.glassOptics='three';
  const dispose=()=>{ disposed=true; removeEventListener('pointermove',onPointer); removeEventListener('resize',resize); geometry.dispose(); meshes.forEach((mesh)=>mesh.material.dispose()); renderer.dispose(); canvas.remove(); };
  return Object.freeze({renderer,scene,camera,meshes,dispose});
}
let lightfield=null; startThreeLightfield().then((value)=>{ lightfield=value; });
globalThis.HouseGlassOptics=Object.freeze({bindPanels,get mode(){return document.body.dataset.glassOptics||'pending';},get active(){return Boolean(lightfield);},dispose(){lightfield?.dispose?.();lightfield=null;}});