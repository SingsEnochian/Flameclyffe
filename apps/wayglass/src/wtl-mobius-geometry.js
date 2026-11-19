// A parametric Möbius ribbon. The half-twist is intrinsic; phase and size are heritable.
// Renderers can consume these vertices without any DOM or graphics dependency.
export function mobiusRibbon({radius=1,width=0.35,phase=0,segments=48,across=5}={}) {
  if(![radius,width,phase].every(Number.isFinite)||radius<=0||width<=0||width>=radius||Math.abs(phase)>Math.PI*2) throw Error('Invalid Möbius geometry');
  if(!Number.isSafeInteger(segments)||segments<8||segments>512||!Number.isSafeInteger(across)||across<2||across>64) throw Error('Invalid resolution');
  const vertices=[],triangles=[];
  for(let i=0;i<=segments;i++){
    const u=2*Math.PI*i/segments+phase;
    for(let j=0;j<across;j++){
      const v=width*(2*j/(across-1)-1);
      vertices.push([(radius+v*Math.cos(u/2))*Math.cos(u),(radius+v*Math.cos(u/2))*Math.sin(u),v*Math.sin(u/2)]);
    }
  }
  for(let i=0;i<segments;i++)for(let j=0;j<across-1;j++){
    const a=i*across+j,b=a+across;
    triangles.push([a,b,a+1],[a+1,b,b+1]);
  }
  return {vertices,triangles,closed_with_reversed_edge:true};
}
