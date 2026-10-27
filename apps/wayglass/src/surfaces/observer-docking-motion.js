/**
 * Wayglass optical animation study / v1.
 *
 * Adapted from Three.js's public CatmullRomCurve3 and MathUtils animation
 * primitives, available in the project's existing 'three' dependency.
 * Source: https://github.com/mrdoob/three.js
 *
 * These three illuminated markers are a LOCAL DEMONSTRATION of orbital
 * geometry and motion. They are not sensor measurements, Crew transport,
 * astronomical telemetry, or proof of physical docking.
 */
export const OPTICAL_DOCKING_SCHEMA = 'wayglass.optical-docking-demo/v1';

export function createOpticalDockingRig(THREE, parent) {
  if (!THREE?.CatmullRomCurve3 || !THREE?.MathUtils || !parent?.add) {
    throw new TypeError('Docking animation requires Three.js curves and parent group.');
  }
  const root = new THREE.Group();
  root.name = 'synthetic-optical-docking-markers';
  parent.add(root);
  const definitions = [
    {name:'ALPHA', radius:2.54, tint:0x7cebe5, speed:.021, offset:0},
    {name:'BETA', radius:3.06, tint:0xf4bc78, speed:.015, offset:.31},
    {name:'GAMMA', radius:3.38, tint:0xb1a9f1, speed:.011, offset:.67},
  ];
  const beacons = definitions.map(({name,radius,tint,speed,offset}, index) => {
    const segments=Array.from({length:12},(_,i)=>{
      const a=i/12*Math.PI*2;
      const warp=.12*Math.sin(3*a+index);
      return new THREE.Vector3(Math.cos(a)*(radius+warp),Math.sin(a)*(radius+warp),
        Math.sin(a*2+index*1.7)*.35);
    });
    const path=new THREE.CatmullRomCurve3(segments,true,'centripetal');
    const guide=new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(path.getSpacedPoints(140).slice(0,-1)),
      new THREE.LineBasicMaterial({
        color:tint,transparent:true,opacity:.18,depthWrite:false,
      })
    );
    guide.name=name+'-synthetic-orbit';root.add(guide);
    const beacon=new THREE.Mesh(
      new THREE.IcosahedronGeometry(index===1?.105:.075,1),
      new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.92,depthWrite:false})
    );
    beacon.name=name+'-synthetic-docking-marker';
    root.add(beacon);
    const halo=new THREE.Mesh(
      new THREE.RingGeometry(.12,.155,32),
      new THREE.MeshBasicMaterial({color:tint,transparent:true,opacity:.4,
        side:THREE.DoubleSide,depthWrite:false})
    );
    halo.name=name+'-synthetic-beacon-halo';
    root.add(halo);
    const p=path.getPointAt(offset);
    beacon.position.copy(p);halo.position.copy(p);
    return {path,beacon,halo,speed,offset};
  });
  let last=0,elapsed=0,heading=0,enabled=true;
  function tick(now,{paused=false,lowStim=false,reducedMotion=false,focus='time',rotation=0}={}) {
    if(paused||lowStim||reducedMotion||!enabled) {last=0;return;}
    const delta=last?Math.min(.055,Math.max(0,(now-last)/1000)):0;
    last=now;
    elapsed+=delta;
    const target=Number.isFinite(rotation)?Math.max(-.5,Math.min(.5,rotation*.13)):0;
    heading=THREE.MathUtils.damp(heading,target,2.2,delta);
    root.rotation.z=heading;
    for(const b of beacons){
      const t=(b.offset+elapsed*b.speed)%1;
      const p=b.path.getPointAt(t);
      b.beacon.position.copy(p);b.halo.position.copy(p);
      const tangent=b.path.getTangentAt(t);
      b.halo.rotation.z=Math.atan2(tangent.y,tangent.x);
    }
  }
  function setEnabled(on){enabled=Boolean(on);if(!enabled)last=0;root.visible=enabled;}
  function dispose(){
    root.traverse(object=>{
      object.geometry?.dispose?.();
      if(Array.isArray(object.material))object.material.forEach(m=>m.dispose());
      else object.material?.dispose?.();
    });
    parent.remove(root);
  }
  return {root,tick,setEnabled,dispose, schema:OPTICAL_DOCKING_SCHEMA};
}
