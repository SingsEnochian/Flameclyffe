import * as THREE from 'three';
// Procedural navigable 3D environments, rendered on user action only.
function mesh(scene,geometry,material,x,y,z,rotateX=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.rotation.x=rotateX;scene.add(m);return m;}
function surface(color,metalness=0.1){return new THREE.MeshStandardMaterial({color,metalness,roughness:0.77});}
function populate(scene,world){
 const dark=surface(world.ground),copper=surface(world.accent,0.7),bright=new THREE.MeshBasicMaterial({color:world.glow});
 mesh(scene,new THREE.PlaneGeometry(160,160),dark,0,-0.1,-36,-Math.PI/2);
 for(let i=0;i<110;i++){const x=Math.sin(i*13.9)*44,y=7+Math.abs(Math.cos(i*8.1))*27,z=-20-(i%17)*3;mesh(scene,new THREE.SphereGeometry(.05+(i%3)*.02,6,4),bright,x,y,z);}
 if(world.id==='dreaming-grove'){
  const leaves=surface(0x2c5347);
  for(let i=0;i<32;i++){const x=(i%2?1:-1)*(5+(i%5)*2.15),z=8-Math.floor(i/2)*3.2,h=4+(i%4);
   mesh(scene,new THREE.CylinderGeometry(.18,.38,h,7),dark,x,h/2,z);
   mesh(scene,new THREE.ConeGeometry(1.9,4,8),leaves,x,h+.5,z);
   if(i%3===0)mesh(scene,new THREE.SphereGeometry(.18,8,6),bright,x*.87,1.2,z);
  }
 }else if(world.id==='moonshore'){
  mesh(scene,new THREE.PlaneGeometry(150,120),surface(0x164455,.45),0,0,-63,-Math.PI/2);
  const moons=[[-12,18,-90,5,0xa5cfc3],[9,23,-98,7,0xe0cda5],[28,14,-88,3,0xa99bc8]];
  for(const [x,y,z,r,color] of moons)mesh(scene,new THREE.SphereGeometry(r,24,16),new THREE.MeshBasicMaterial({color}),x,y,z);
  for(let i=-12;i<12;i+=2)mesh(scene,new THREE.BoxGeometry(2,.015,.035),bright,i*2,.045,-24-(i%4)*2);
 }else{
  for(let i=-3;i<=3;i++){
   mesh(scene,new THREE.CylinderGeometry(.36,.42,8,12),copper,i*6,4,-20);
   mesh(scene,new THREE.TorusGeometry(2.6,.15,8,36,Math.PI),copper,i*6,7.8,-20);
  }
  mesh(scene,new THREE.CylinderGeometry(7,7.6,.5,24),dark,0,.18,-26);
  mesh(scene,new THREE.TorusGeometry(5.5,.18,8,60),bright,0,.48,-26,-Math.PI/2);
 }
}
export class TravellerScene {
 constructor(container){
  this.container=container;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.25));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.domElement.className='traveller-canvas';
  this.renderer.domElement.setAttribute('aria-hidden','true');
  container.prepend(this.renderer.domElement);
  this.camera=new THREE.PerspectiveCamera(65,1,.1,240);
  this.scene=null;
  this.resize=()=>this.render();
  if(globalThis.ResizeObserver){this.observer=new ResizeObserver(this.resize);this.observer.observe(container);}
  else globalThis.addEventListener('resize',this.resize);
 }
 clear(){if(!this.scene)return;this.scene.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose?.();});}
 show(state){
  const world=state.world;
  if(!this.scene||this.scene.userData.world!==world.id){
   this.clear();this.scene=new THREE.Scene();this.scene.userData.world=world.id;
   this.scene.background=new THREE.Color(world.sky);this.scene.fog=new THREE.FogExp2(world.sky,.012);
   this.scene.add(new THREE.HemisphereLight(world.glow,world.ground,2));
   const light=new THREE.DirectionalLight(world.accent,2);light.position.set(12,22,-12);this.scene.add(light);
   populate(this.scene,world);
  }
  this.camera.position.set(state.x,1.7,state.z);
  this.camera.lookAt(state.x+Math.sin(state.heading)*10,1.65,state.z-Math.cos(state.heading)*10);
  this.render();
 }
 render(){
  if(!this.scene)return;
  const width=Math.max(1,this.container.clientWidth),height=Math.max(1,this.container.clientHeight),dpr=this.renderer.getPixelRatio();
  if(this.renderer.domElement.width!==Math.round(width*dpr)||this.renderer.domElement.height!==Math.round(height*dpr)){
   this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  }
  this.renderer.render(this.scene,this.camera);
 }
 destroy(){this.observer?.disconnect();if(!this.observer)globalThis.removeEventListener('resize',this.resize);this.clear();this.renderer.dispose();this.renderer.domElement.remove();this.scene=null;}
}
