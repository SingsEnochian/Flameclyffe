import * as THREE from 'three';
import {encounter} from '../mobius-nursery-encounter.mjs';

// Owner-local, proposal-only visualization. No remote calls or automatic persistence.
export function mountMobiusNursery(root) {
  const host=document.createElement('section');
  host.className='wayglass-nursery';
  host.setAttribute('aria-label','Möbius Nursery experimental three-dimensional encounter');
  host.innerHTML=`<h2>Möbius Nursery · Three-dimensional encounters</h2>
    <p>Two distinct motes. Mutual permission. Nothing is carried without a later explicit choice.</p>
    <div class="nursery-controls">
      <label><input type="checkbox" data-consent="a"> Mote A consents</label>
      <label><input type="checkbox" data-consent="b"> Mote B consents</label>
      <label>Signal <select data-signal><option value="wtl">Wyrdrune</option><option value="touch">Touch</option><option value="word">Word</option><option value="sound">Sound</option></select></label>
      <button type="button" data-encounter>Offer encounter</button>
      <button type="button" data-feather>Feather · stop</button>
    </div><div data-stage role="img" aria-label="Two luminous Möbius rings orbit separately in a three-dimensional field"></div>
    <output data-status role="status" aria-live="polite">Waiting for both participants.</output>`;
  root.append(host);
  const stage=host.querySelector('[data-stage]');
  stage.style.cssText='width:100%;height:min(55vh,440px);min-height:260px;overflow:hidden;border-radius:20px;background:#080d16';
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(48,1,0.1,100);camera.position.z=9;
  let renderer,disposed=false,raf=0,active=false;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const rings=[];
  try {
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,2));
    stage.append(renderer.domElement);
    for(const [i,color] of [0x7de8d7,0xf3bb71].entries()){
      const geometry=new THREE.TorusKnotGeometry(1.1,0.12,128,12,2,1);
      const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.35,metalness:0.65,roughness:0.28});
      const mesh=new THREE.Mesh(geometry,material);mesh.position.x=i?1.8:-1.8;
      mesh.rotation.y=i?0.6:-0.6;scene.add(mesh);rings.push(mesh);
    }
    scene.add(new THREE.AmbientLight(0xffffff,1.5));
    const light=new THREE.PointLight(0x8edfff,60);light.position.set(0,3,5);scene.add(light);
    const resize=()=>{if(disposed)return;const w=stage.clientWidth,h=stage.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);};
    const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;
    observer?.observe(stage);resize();
    const draw=()=>{if(disposed)return;if(!reduced?.matches&&active){rings.forEach((m,i)=>{m.rotation.y+=(i?-.003:.003);m.rotation.x+=.0015;});}renderer.render(scene,camera);if(!reduced?.matches&&active)raf=requestAnimationFrame(draw);};
    const start=()=>{if(!disposed&&!reduced?.matches&&!raf){active=true;draw();}};
    const stop=()=>{active=false;cancelAnimationFrame(raf);raf=0;if(!disposed)renderer.render(scene,camera);};
    const status=host.querySelector('[data-status]');
    host.querySelector('[data-encounter]').addEventListener('click',()=>{
      const consent={'nursery:a':host.querySelector('[data-consent="a"]').checked,'nursery:b':host.querySelector('[data-consent="b"]').checked};
      const result=encounter({left:{id:'nursery:a',spin:0.2,revision:0},right:{id:'nursery:b',spin:-0.4,revision:0},consent,signal:{kind:host.querySelector('[data-signal]').value,value:'encounter',source:'wayglass:nursery-ui'}});
      status.textContent=result.status==='proposal'?`Encounter proposed. Coupling ${result.coupling}. Neither history has changed.`:'Encounter declined. Both participants must opt in.';
      if(result.status==='proposal')start();else stop();
    });
    host.querySelector('[data-feather]').addEventListener('click',()=>{stop();status.textContent='Feather. Encounter stopped. Nothing persisted.';});
    for(const input of host.querySelectorAll('[data-consent]'))input.addEventListener('change',()=>{
      if(!input.checked){stop();status.textContent='Consent withdrawn. Encounter stopped; nothing persisted.';}
    });
    host._disposeNursery=()=>{stop();disposed=true;observer?.disconnect();rings.forEach(m=>{m.geometry.dispose();m.material.dispose();});renderer.dispose();host.remove();};
    // Initial render is static until a mutually consented encounter is proposed.
    renderer.render(scene,camera);
  }catch(error){
    statusFallback(host,error);
  }
  return ()=>{if(host._disposeNursery)host._disposeNursery();else host.remove();};
}
function statusFallback(host){host.querySelector('[data-status]').textContent='3D rendering unavailable. Consent controls remain visible; no encounter has been carried.';}
