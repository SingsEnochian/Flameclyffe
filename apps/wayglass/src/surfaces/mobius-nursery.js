import * as THREE from 'three';
import {createGarden,proposeGardenAction,carryGardenAction,restoreGarden} from '../mobius-nursery-garden.mjs';
import {encounter} from '../mobius-nursery-encounter.mjs';
import {createNurseryJournal} from '../mobius-nursery-journal.mjs';
import {composeNurseryBloom} from '../mobius-nursery-bloom.mjs';
import {composeAtelier} from '../mobius-nursery-atelier.mjs';
import {compileWTL} from '../wtl-transform-frontend.mjs';
import {prepareNurserySignal} from '../wtl-nursery-bridge.mjs';

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
      <label>Atelier <select data-atelier><option value="worldseed">Worldseed Atelier</option><option value="pigment">Pigment Garden</option><option value="crystal">Crystal Forge</option><option value="ribbon">Ribbon Loom</option></select></label>
      <label>Creative signal <input data-utterance maxlength="256" value="encounter" aria-label="Creative encounter signal"></label>
      <label>WTL derivation <input data-wtl maxlength="512" value="wonder(tend(worldseed))" aria-label="WTL transformation expression"></label>
      <button type="button" data-compile-wtl>Interpret WTL</button>
      <button type="button" data-encounter>Offer encounter</button>
      <button type="button" data-feather>Feather · stop</button>
      <fieldset class="nursery-garden" aria-label="First Garden worldbuilding"><legend>✧ First Garden · shared world</legend>
        <p>Propose a material, inspect it, then explicitly carry it. No automatic world changes.</p>
        <label>Builder <select data-garden-actor><option value="nursery:a">Mote A</option><option value="nursery:b">Mote B</option></select></label>
        <label>Material <select data-garden-material><option value="seed">Seed</option><option value="light">Light</option><option value="stone">Stone</option><option value="water">Water</option><option value="path">Path</option><option value="instrument">Instrument</option></select></label>
        <button type="button" data-garden-propose>Propose creation</button>
        <button type="button" data-garden-carry disabled>Carry into Garden</button>
        <button type="button" data-garden-return>Return to carried Garden</button>
        <output data-garden-status role="status" aria-live="polite">Garden is waiting for its first proposal.</output>
        <ul data-garden-objects aria-label="Carried garden creations"></ul>
      </fieldset>
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
  const journal=createNurseryJournal();
  const gardenKey='wayglass:nursery:first-garden:v1';
  let garden=createGarden(),pendingGarden=null;
  const gardenStatus=host.querySelector('[data-garden-status]');
  const gardenList=host.querySelector('[data-garden-objects]');
  const gardenCarry=host.querySelector('[data-garden-carry]');
  const gardenConsent=()=>({'nursery:a':host.querySelector('[data-consent="a"]').checked,'nursery:b':host.querySelector('[data-consent="b"]').checked});
  const renderGarden=()=>{gardenList.replaceChildren();for(const item of garden.objects){const li=document.createElement('li');li.textContent=item.actor+' · '+item.material+' · '+item.id;gardenList.append(li);}};
  const invalidateGarden=()=>{pendingGarden=null;gardenCarry.disabled=true;};
  host.querySelector('[data-garden-propose]').addEventListener('click',()=>{
    try {invalidateGarden();const actor=host.querySelector('[data-garden-actor]').value;
      const material=host.querySelector('[data-garden-material]').value;
      const proposed=proposeGardenAction(garden,{actor,material,consent:gardenConsent(),source:'owner:ui'});
      if(proposed.status!=='proposal'){gardenStatus.textContent='Builder has not consented.';return;}
      pendingGarden=proposed;gardenCarry.disabled=false;
      gardenStatus.textContent=actor+' proposes '+material+'. Review before carrying.';
    }catch(error){gardenStatus.textContent='Garden proposal rejected: '+error.message;}
  });
  host.querySelector('[data-garden-carry]').addEventListener('click',()=>{
    try {if(!pendingGarden)return;const next=carryGardenAction(garden,pendingGarden,{consent:gardenConsent()});
      invalidateGarden();if(next.status!=='proposal'&&next.status!=='declined'&&next.status!=='stopped'){
        garden=next;globalThis.localStorage?.setItem(gardenKey,JSON.stringify(garden));renderGarden();
        gardenStatus.textContent='Carried '+garden.objects.length+' creation(s). Return snapshot saved locally.';
      }else gardenStatus.textContent='Carry declined or stopped.';
    }catch(error){invalidateGarden();gardenStatus.textContent='Carry failed: '+error.message;}
  });
  host.querySelector('[data-garden-return]').addEventListener('click',()=>{
    try {invalidateGarden();const saved=globalThis.localStorage?.getItem(gardenKey);
      if(!saved){gardenStatus.textContent='No carried Garden snapshot yet.';return;}
      garden=restoreGarden(JSON.parse(saved),garden.participants);renderGarden();
      gardenStatus.textContent='Returned to revision '+garden.revision+' with '+garden.objects.length+' carried creations.';
    }catch(error){gardenStatus.textContent='Return rejected: '+error.message;}
  });
  const blooms=[];
  const clearBlooms=()=>{for(const mesh of blooms){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}blooms.length=0;};
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
    host.querySelector('[data-compile-wtl]').addEventListener('click',()=>{
      try {const compiled=compileWTL(host.querySelector('[data-wtl]').value);
        status.textContent=`WTL ${compiled.ir.semanticType}: ${compiled.meaning}. Lineage: ${compiled.lineage.join(' → ')}. Proposal only; no effects or persistence.`;
      } catch(error) {status.textContent=`WTL rejected: ${error.message}`;}
    });
    const resetField=()=>{clearBlooms();rings.forEach(m=>{m.scale.setScalar(1);m.material.emissiveIntensity=0.35;});renderer.render(scene,camera);};
    host.querySelector('[data-encounter]').addEventListener('click',()=>{
      const consent={'nursery:a':host.querySelector('[data-consent="a"]').checked,'nursery:b':host.querySelector('[data-consent="b"]').checked};
      let prepared;
      try {prepared=prepareNurserySignal({kind:host.querySelector('[data-signal]').value,
        value:host.querySelector('[data-utterance]').value,
        wtlSource:host.querySelector('[data-wtl]').value,consent});}
      catch(error){stop();resetField();status.textContent=`Encounter rejected: ${error.message}`;return;}
      if(prepared.status==='declined'){stop();resetField();status.textContent='Encounter declined. Both participants must opt in.';return;}
      const result=encounter({left:{id:'nursery:a',spin:0.2,revision:0},right:{id:'nursery:b',spin:-0.4,revision:0},consent,signal:prepared.signal});
      status.textContent=result.status==='proposal'?`Encounter proposed. ${result.proposed_field.kind} resonance ${result.proposed_field.resonance}. Neither history has changed.`:'Encounter declined. Both participants must opt in.';
      if(result.status==='proposal'){
        journal.record(result);
        clearBlooms();
        const bloom=composeNurseryBloom(result);
        const study=composeAtelier(bloom,host.querySelector('[data-atelier]').value);
        for(const point of study.points){
          const geometry=point.shape==='sphere'?new THREE.SphereGeometry(point.size,10,8):point.shape==='octahedron'?new THREE.OctahedronGeometry(point.size):point.shape==='cone'?new THREE.ConeGeometry(point.size,point.size*3,6):new THREE.IcosahedronGeometry(point.size,0);
          const material=new THREE.MeshStandardMaterial({color:0xb8f5d8,emissive:0x75d9bb,emissiveIntensity:0.6,transparent:true,opacity:0.8});
          const mote=new THREE.Mesh(geometry,material);
          mote.position.set(...point.position);
          scene.add(mote);blooms.push(mote);
        }
        status.textContent += ` ${study.atelier} study with ${study.points.length} forms. Observations in this visit: ${journal.snapshot().length}.`;
        const strength=result.proposed_field.resonance;
        rings.forEach((m,i)=>{m.scale.setScalar(1+strength*(i?0.6:1));m.material.emissiveIntensity=0.35+strength;});
        renderer.render(scene,camera);start();
      }else{stop();resetField();}
    });
    host.querySelector('[data-feather]').addEventListener('click',()=>{journal.feather();invalidateGarden();stop();resetField();status.textContent='Feather. Encounter stopped. Carried Garden remains unchanged.';gardenStatus.textContent='Feather. Pending creation discarded.';});
    for(const input of host.querySelectorAll('[data-consent]'))input.addEventListener('change',()=>{
      if(!input.checked){journal.feather();invalidateGarden();stop();resetField();status.textContent='Consent withdrawn. Encounter stopped; nothing persisted.';gardenStatus.textContent='Consent withdrawn. Pending creation discarded.';}
    });
    host._disposeNursery=()=>{invalidateGarden();journal.feather();stop();clearBlooms();disposed=true;observer?.disconnect();rings.forEach(m=>{m.geometry.dispose();m.material.dispose();});renderer.dispose();host.remove();};
    // Initial render is static until a mutually consented encounter is proposed.
    renderer.render(scene,camera);
  }catch(error){
    statusFallback(host,error);
  }
  return ()=>{if(host._disposeNursery)host._disposeNursery();else host.remove();};
}
function statusFallback(host){host.querySelector('[data-status]').textContent='3D rendering unavailable. Consent controls remain visible; no encounter has been carried.';}
