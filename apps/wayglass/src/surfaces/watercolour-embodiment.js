import * as THREE from 'three';

// Watercolour Embodiment v0.1: reversible prototype; no generated 3D assets or AI recognition.
export function mountWatercolourEmbodimentSurface(root) {
  root.innerHTML = `<section class="wg-surface" style="padding:1rem;max-width:1100px;margin:auto">
    <header class="glass-panel" style="padding:1rem"><p class="eyebrow">Living Watercolour · Embodiment trial</p>
    <h1>Opaline Cat</h1><p>Condense pigment into a holographic companion, then release it back to colour. Procedural preview, not a photorealistic model.</p></header>
    <div class="glass-panel" style="position:relative;overflow:hidden;margin-top:1rem;border-radius:18px">
      <div data-stage role="img" aria-label="Interactive translucent holographic cat with a soft flowing pigment cloud" style="height:min(65vh,570px);min-height:280px"></div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;padding:1rem">
        <button class="glass-chip" data-action="resolve">Resolve cat</button>
        <button class="glass-chip" data-action="release">Release to pigment</button>
        <button class="glass-chip" data-action="feather">Feather · hold</button>
        <button class="glass-chip" data-action="resume">Resume</button>
        <button class="glass-chip" data-action="export">Save receipt</button>
      </div><p data-status role="status" aria-live="polite" class="tiny" style="padding:0 1rem 1rem">Pigment phase. Nothing exported or persisted.</p>
    </div></section>`;
  const stage = root.querySelector('[data-stage]');
  const status = root.querySelector('[data-status]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070f16');
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  camera.position.set(0, 1.15, 6.9);
  camera.lookAt(0, .2, 0);
  scene.add(new THREE.HemisphereLight('#b8fff7','#15213a',2.2));
  const lamp = new THREE.PointLight('#59ecd8',60,14);
  lamp.position.set(-2,3,4); scene.add(lamp);
  const cat = new THREE.Group(); scene.add(cat);
  const mat = new THREE.MeshPhysicalMaterial({color:'#35c9cc',transparent:true,opacity:.65,
    metalness:.28,roughness:.24,transmission:.19,side:THREE.DoubleSide,depthWrite:false});
  const eye = new THREE.MeshBasicMaterial({color:'#e7dd87'});
  const dark = new THREE.MeshBasicMaterial({color:'#123d4b'});
  function part(geo, material, x,y,z, sx=1,sy=1,sz=1, parent=cat) {
    const mesh = new THREE.Mesh(geo,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;
  }
  const sphere = new THREE.SphereGeometry(1,24,16);
  part(sphere,mat,0,-.32,0,.52,.75,.42);
  part(sphere,mat,0,.65,.16,.55,.49,.46);
  for(const sign of [-1,1]){
    const triangle=new THREE.ConeGeometry(.24,.64,3);
    const ear=part(triangle,mat,sign*.35,1.13,.13,.95,1,.5);ear.rotation.z=-sign*.2;
    part(sphere,mat,sign*.32,-.96,.3,.19,.38,.22);
    part(sphere,eye,sign*.23,.70,.555,.105,.17,.08);
    part(sphere,dark,sign*.23,.70,.633,.035,.135,.023);
    for(let n=-1;n<=1;n++){
      const whisker=part(new THREE.CylinderGeometry(.006,.006,.78,5),mat,sign*.35,.34+n*.10,.60,.8,1,1);
      whisker.rotation.z=sign*(1.27+n*.12);
    }
  }
  part(sphere,dark,0,.44,.62,.09,.065,.07);
  const tail=new THREE.Group();tail.position.set(.44,-.75,-.26);cat.add(tail);
  for(let i=0;i<6;i++)part(sphere,mat,.1+i*.12,.05+i*.20,0,.14,.24,.14,tail);
  const particles = new THREE.BufferGeometry();
  const count = 460;
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const angle=i*2.399963, rad=Math.sqrt(i/count)*2.3;
    positions[i*3]=Math.cos(angle)*rad;
    positions[i*3+1]=Math.sin(angle*2)*.52;
    positions[i*3+2]=Math.sin(angle)*rad*.55;
  }
  particles.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const pigment=new THREE.Points(particles,new THREE.PointsMaterial({
    color:'#6df9df',size:.055,transparent:true,opacity:.7,depthWrite:false
  }));scene.add(pigment);
  const state={schema:'wayglass.watercolour-embodiment/v0.1',subject_id:'cat-prototype-001',
    form:'procedural-cat',phase:'pigment',held:false,source:'authored-procedural',updated_at:null};
  const clock=new THREE.Clock();
  let active=true,frame=0,hover=0,transition=0;
  function setPhase(phase){
    if(state.held && phase!=='pigment')return;
    state.phase=phase;state.updated_at=new Date().toISOString();
    status.textContent = phase==='embodied'?'Holographic cat resolved · local preview only':
      'Pigment phase · reversible; no identity or asset was overwritten';
    render();
  }
  function render(){
    const embodied=state.phase==='embodied';
    const t=reduceMotion?0:clock.getElapsedTime();
    const target=embodied?1:0;
    transition += (target-transition)*(reduceMotion?1:.08);
    cat.scale.setScalar(Math.max(.001,transition));
    cat.visible=transition>.01;
    pigment.material.opacity=.7*(1-transition);
    pigment.visible=transition<.99;
    if(!state.held && !reduceMotion){
      cat.rotation.y=Math.sin(t*.35)*.12+hover;
      tail.rotation.x=Math.sin(t*2)*.16;
      cat.position.y=Math.sin(t*1.7)*.035;
      pigment.rotation.y=t*.08;
    }
    renderer.render(scene,camera);
  }
  const ro=new ResizeObserver(()=>{
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();
  });ro.observe(stage);
  function tick(){if(!active)return;render();if(!reduceMotion&&!state.held)frame=requestAnimationFrame(tick);}
  function start(){cancelAnimationFrame(frame);if(!reduceMotion)frame=requestAnimationFrame(tick);else render();}
  function onClick(ev){
    const button=ev.target.closest('[data-action]');if(!button)return;
    const action=button.dataset.action;
    if(action==='feather'){state.held=true;cancelAnimationFrame(frame);status.textContent='Feather held · motion paused';render();}
    if(action==='resume'){state.held=false;status.textContent='Motion resumed';start();}
    if(action==='resolve')setPhase('embodied');
    if(action==='release')setPhase('pigment');
    if(action==='export'){
      const payload=JSON.stringify({...state,exported_at:new Date().toISOString()},null,2);
      const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='watercolour-cat-return.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
  }
  function pointer(ev){const rect=stage.getBoundingClientRect();hover=((ev.clientX-rect.left)/Math.max(1,rect.width)-.5)*.8;}
  root.addEventListener('click',onClick);stage.addEventListener('pointermove',pointer);
  const featherHandler=()=>{state.held=true;cancelAnimationFrame(frame);status.textContent='Feather held · motion paused';render();};
  window.addEventListener('wayglass:feather',featherHandler);
  render();start();
  return {state,feather:featherHandler,destroy(){
    active=false;cancelAnimationFrame(frame);ro.disconnect();
    root.removeEventListener('click',onClick);stage.removeEventListener('pointermove',pointer);
    window.removeEventListener('wayglass:feather',featherHandler);
    cat.traverse(obj=>{if(obj.isMesh)obj.geometry.dispose();});
    mat.dispose();eye.dispose();dark.dispose();particles.dispose();pigment.material.dispose();
    renderer.dispose();renderer.domElement.remove();
  }};
}
