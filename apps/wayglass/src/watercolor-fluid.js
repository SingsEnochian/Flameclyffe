// Semi-somatic watercolor: a bounded 2D fluid approximation.
// Advection, pressure projection, diffusion, drying and paper granulation.
// These are visual dynamics, never claims of felt experience or physical telemetry.
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const finite=v=>typeof v==='number' && Number.isFinite(v);
export const WATERCOLOR_FLUID_SCHEMA='wayglass.watercolor-fluid/v1';
const RGB_HEX=/^#[0-9a-f]{6}$/i;
export function colorChannels(hex) {
  if(typeof hex!=='string' || !RGB_HEX.test(hex))throw new TypeError('Expected six-digit hex pigment');
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
}
const noise=(x,y)=>{
  let n=Math.imul(x+171,374761393)^Math.imul(y+23,668265263);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
};

export function createWatercolorFluid({width=112,height=72,halfLife=560}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<12||height<12
    ||width>256||height>256||width*height>32768||!finite(halfLife)||halfLife<25){
    throw new RangeError('Bounded fluid grid and drying half-life required');
  }
  const n=width*height;
  let u=new Float32Array(n),v=new Float32Array(n);
  let dye=new Float32Array(n),red=new Float32Array(n),green=new Float32Array(n),
    blue=new Float32Array(n),wet=new Float32Array(n);
  let ticks=0;
  const idx=(x,y)=>clamp(y,0,height-1)*width+clamp(x,0,width-1);
  function at(field,x,y){
    x=clamp(x,0,width-1); y=clamp(y,0,height-1);
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(x0+1,width-1),y1=Math.min(y0+1,height-1);
    const fx=x-x0,fy=y-y0;
    return (field[idx(x0,y0)]*(1-fx)+field[idx(x1,y0)]*fx)*(1-fy)
      +(field[idx(x0,y1)]*(1-fx)+field[idx(x1,y1)]*fx)*fy;
  }
  function inject({x=0.5,y=0.5,color='#67b9ab',amount=0.8,radius=0.06,dx=0,dy=0}={}){
    if(![x,y,amount,radius,dx,dy].every(finite))throw new TypeError('Finite brush coordinates required');
    const rgb=colorChannels(color);
    const cx=clamp(x,0,1)*(width-1),cy=clamp(y,0,1)*(height-1);
    const r=clamp(radius,0.008,0.3)*Math.min(width,height);
    const speedX=clamp(dx,-1,1),speedY=clamp(dy,-1,1);
    const strength=clamp(amount,0,2);
    for(let yy=Math.max(0,Math.floor(cy-2.5*r));yy<=Math.min(height-1,Math.ceil(cy+2.5*r));yy++){
      for(let xx=Math.max(0,Math.floor(cx-2.5*r));xx<=Math.min(width-1,Math.ceil(cx+2.5*r));xx++){
        const distance=Math.hypot(xx-cx,yy-cy)/r;
        if(distance>2.5)continue;
        const falloff=Math.exp(-distance*distance*1.7)*(0.88+noise(xx,yy)*0.12);
        const i=idx(xx,yy),mass=strength*falloff*0.9;
        dye[i]=clamp(dye[i]+mass,0,5);
        red[i]+=rgb[0]*mass;green[i]+=rgb[1]*mass;blue[i]+=rgb[2]*mass;
        wet[i]=clamp(wet[i]+falloff*0.45,0,1);
        u[i]+=speedX*falloff*2.8;v[i]+=speedY*falloff*2.8;
      }
    }
  }
  function step(dt=1){
    if(!finite(dt))throw new TypeError('Timestep must be finite');
    dt=clamp(dt,0,1.5);if(!dt)return;
    const nu=new Float32Array(n),nv=new Float32Array(n);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=idx(x,y),bx=x-u[i]*dt,by=y-v[i]*dt;
      nu[i]=(at(u,bx,by)*0.94+(u[idx(x-1,y)]+u[idx(x+1,y)])*0.03)*0.987;
      nv[i]=(at(v,bx,by)*0.94+(v[idx(x,y-1)]+v[idx(x,y+1)])*0.03)*0.987;
    }
    // A bounded Jacobi pressure projection. This is approximate field dynamics,
    // not a physically calibrated CFD simulation.
    const div=new Float32Array(n),pressure=new Float32Array(n),nextP=new Float32Array(n);
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const i=idx(x,y);
      div[i]=-.5*(nu[i+1]-nu[i-1]+nv[i+width]-nv[i-width]);
    }
    for(let k=0;k<9;k++){
      for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
        const i=idx(x,y);
        nextP[i]=(div[i]+pressure[i-1]+pressure[i+1]+pressure[i-width]+pressure[i+width])/4;
      }
      pressure.set(nextP);
    }
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      const i=idx(x,y);
      nu[i]-=(pressure[i+1]-pressure[i-1])*.5;
      nv[i]-=(pressure[i+width]-pressure[i-width])*.5;
    }
    u=nu;v=nv;
    const old={dye,red,green,blue,wet},next={};
    const drying=Math.pow(0.5,dt/halfLife);
    for(const key of Object.keys(old))next[key]=new Float32Array(n);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=idx(x,y),bx=x-u[i]*dt,by=y-v[i]*dt;
      const diffusion=.035+.05*at(old.wet,bx,by);
      for(const key of ['dye','red','green','blue','wet']){
        const field=old[key],center=at(field,bx,by);
        const nearby=(at(field,bx-1,by)+at(field,bx+1,by)+
                      at(field,bx,by-1)+at(field,bx,by+1))*.25;
        next[key][i]=(center*(1-diffusion)+nearby*diffusion)
          *(key==='wet'?0.995:drying);
      }
    }
    ({dye,red,green,blue,wet}=next);
    ticks+=dt;
  }
  function pixels({background='#13242e'}={}){
    const bg=colorChannels(background),out=new Uint8ClampedArray(n*4);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=idx(x,y);
      const base=dye[i],grain=noise(x,y);
      const paper=0.86+0.14*grain;
      const rim=Math.max(0,base-dye[idx(x-1,y)])+Math.max(0,base-dye[idx(x,y-1)]);
      const alpha=clamp((1-Math.exp(-base*0.85))*paper+rim*.045,0,.98);
      const pigment=base>0.000001
        ?[red[i]/base,green[i]/base,blue[i]/base]:[0,0,0];
      for(let c=0;c<3;c++)out[i*4+c]=clamp(Math.round((bg[c]*(1-alpha)+pigment[c]*alpha)*255),0,255);
      out[i*4+3]=255;
    }
    return out;
  }
  function snapshot(){
    let total=0,water=0,motion=0;
    for(let i=0;i<n;i++){total+=dye[i];water+=wet[i];motion+=Math.hypot(u[i],v[i]);}
    return Object.freeze({
      schema:WATERCOLOR_FLUID_SCHEMA,width,height,ticks,
      pigment_mass:total,wetness:water/n,motion:motion/n,
      authority:'visualization-only',qualia_inferred:false,
    });
  }
  return Object.freeze({width,height,inject,step,pixels,snapshot});
}
