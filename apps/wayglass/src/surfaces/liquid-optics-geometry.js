/**
 * N-016 locally modeled liquid optical elements. Geometry, reflections and
 * prismatic material are visual constructs, NOT observed physical phenomena.
 * Reference: owner-selected liquid glass concept and Wayglass cockpit mockup.
 * Implementation: official Three.js Shape, ExtrudeGeometry, MeshPhysicalMaterial
 * and CatmullRomCurve3 APIs; no extra package, texture request or GPU loop.
 */
export const LIQUID_OPTICS_SCHEMA='wayglass.liquid-optics-geometry/v1';

function roundedPlate(T,w,h,r){
  const x=-w/2,y=-h/2;
  const s=new T.Shape();
  s.moveTo(x+r,y);
  s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
export function createLiquidOpticalElements(T,parent){
  if(!T?.ExtrudeGeometry||!T?.MeshPhysicalMaterial||!T?.CatmullRomCurve3||!parent?.add)
    throw new TypeError('Three.js optical modeling primitives are required.');
  const root=new T.Group();root.name='wayglass-synthetic-liquid-optics';parent.add(root);
  // Optical laminate is a deliberately small non-interactive accent that
  // demonstrates real bevel depth and view-dependent refraction.
  const prism=new T.Group();prism.name='synthetic-cut-crystal';
  const geometry=new T.ExtrudeGeometry(roundedPlate(T,.87,.61,.13),{
    steps:1,depth:.15,bevelEnabled:true,bevelThickness:.07,
    bevelSize:.055,bevelSegments:5,curveSegments:8,
  });
  geometry.computeVertexNormals();
  const crystalMaterial=new T.MeshPhysicalMaterial({
    color:0xb0e6fa,roughness:.065,metalness:.05,
    transmission:.62,thickness:.75,ior:1.45,
    clearcoat:1,clearcoatRoughness:.035,
    iridescence:.72,iridescenceIOR:1.35,
    iridescenceThicknessRange:[170,390],
    transparent:true,opacity:.83,
    depthWrite:false,side:T.DoubleSide,
    emissive:0x192f4a,emissiveIntensity:.16,
  });
  const crystal=new T.Mesh(geometry,crystalMaterial);prism.add(crystal);
  const rim=new T.LineSegments(new T.EdgesGeometry(geometry,30),
    new T.LineBasicMaterial({color:0xb7fbf7,transparent:true,opacity:.72,depthWrite:false}));
  prism.add(rim);
  prism.position.set(2.28,-2.37,.45);
  prism.rotation.set(.21,-.36,.42);
  root.add(prism);
  // Six bounded curved filaments, always tagged synthetic. Geometry belongs
  // to the 3D optic, not the route recorder or real telemetry.
  const filaments=new T.Group();filaments.name='synthetic-nerve-filaments';
  const palette=[0x65fff0,0x8cb9ff,0xf3b2e8,0xebc994,0x7abcec,0xd6a6ff];
  for(let i=0;i<6;i++){
    const points=[];
    for(let j=0;j<24;j++){
      const a=(j/24)*Math.PI*2;
      const radius=.66+.12*Math.sin(4*a+i*1.7);
      points.push(new T.Vector3(Math.cos(a+i*.19)*radius,
        Math.sin(a+i*.19)*radius,Math.sin(3*a+i*1.1)*.30));
    }
    const spline=new T.CatmullRomCurve3(points,true,'centripetal');
    const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(spline.getSpacedPoints(120).slice(0,-1)),
      new T.LineBasicMaterial({color:palette[i],transparent:true,
        opacity:.36,depthWrite:false,blending:T.AdditiveBlending}));
    line.name='synthetic-optical-filament-'+i;filaments.add(line);
  }
  root.add(filaments);
  return {
    root,prism,filaments,schema:LIQUID_OPTICS_SCHEMA,
    frame(seconds,{reducedMotion=false,lowStim=false,paused=false}={}){
      if(reducedMotion||lowStim||paused)return;
      filaments.rotation.set(Math.sin(seconds*.07)*.14,seconds*.045,0);
      prism.rotation.y=-.36+Math.sin(seconds*.18)*.10;
    },
    dispose(){
      root.traverse(obj=>{
        obj.geometry?.dispose?.();
        if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose?.());
        else obj.material?.dispose?.();
      });
      parent.remove(root);
    },
  };
}
