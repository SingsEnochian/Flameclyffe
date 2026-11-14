// Mythience membrane: an embodied instrument, not a crossing authority.
// Visuals are driven by declared fields and actual Wyrdrune candidate receipts.
const clamp=v=>Math.min(1,Math.max(0,Number.isFinite(Number(v))?Number(v):0));
export function membraneVisualState({intention=0.5,shifting=0.5,porosity=0.5,resonance=0.5,
  compatibility=0.5,permeability=null,expression=null}={}){
  const alignment=clamp(intention)*clamp(shifting)*(0.5+clamp(resonance)*0.5);
  const preview=clamp(porosity)*(0.25+alignment*0.75);
  return Object.freeze({
    alignment,openness:permeability===null?preview:clamp(permeability),
    correspondence:expression===null?preview*clamp(compatibility):clamp(expression),
    observed:permeability!==null,phase:clamp(resonance),intention:clamp(intention),
  });
}
// Two independent currents remain visually distinct. Their geometry is a projection,
// not a claim that a model or another participant is currently active.
export function membraneCurrents(state,{width=320,height=260,time=0,reducedMotion=false}={}){
  const w=Math.max(1,width),h=Math.max(1,height),cx=w/2,cy=h/2;
  const radius=Math.min(w*.26,h*.33,112),turn=reducedMotion?0:time;
  return Object.freeze(['harmony','chaos'].map((name,index)=>{
    const direction=index===0?1:-1;
    const points=Array.from({length:49},(_,i)=>{
      const u=i/48,angle=u*Math.PI*4+turn*direction;
      const spread=(.22+.78*state.openness)*radius;
      return Object.freeze({x:cx+(u-.5)*radius*2.8,
        y:cy+Math.sin(angle+index*Math.PI)*spread*(.55+.45*state.correspondence),
        depth:Math.cos(angle+index*Math.PI)});
    });
    return Object.freeze({name,points,opacity:.3+.6*(index===0?state.alignment:1-state.alignment)});
  }));
}
export function mountMythienceMembraneScene(canvas,{onShift=()=>{},reducedMotion=null}={}){
  if(!canvas?.getContext)throw new TypeError('A canvas is required');
  const ctx=canvas.getContext('2d');
  let active=true,frame=0,raf=0,dragging=false;
  let fields={intention:.5,shifting:.5,porosity:.5,resonance:.5,compatibility:.5};
  let state=membraneVisualState(fields),origin='Origin',destination='Destination';
  const reduced=reducedMotion??Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  const motion=()=>!reduced&&globalThis.document?.visibilityState!=='hidden';
  const request=globalThis.requestAnimationFrame?.bind(globalThis);
  const cancel=globalThis.cancelAnimationFrame?.bind(globalThis);
  const geometry=()=>{
    const rect=canvas.getBoundingClientRect();
    const w=Math.max(1,rect.width||canvas.clientWidth||320),h=Math.max(1,rect.height||canvas.clientHeight||260);
    const dpr=Math.min(2,globalThis.devicePixelRatio||1);
    const pixelW=Math.round(w*dpr),pixelH=Math.round(h*dpr);
    if(canvas.width!==pixelW||canvas.height!==pixelH){canvas.width=pixelW;canvas.height=pixelH;}
    ctx?.setTransform(dpr,0,0,dpr,0,0);
    return {w,h};
  };
  function draw(){
    if(!active||!ctx)return;
    const {w,h}=geometry();
    ctx.clearRect(0,0,w,h);
    const cx=w/2,cy=h/2,span=Math.min(w*.31,130),r=Math.min(h*.27,w*.15,72);
    const t=motion()?frame*.013:0;
    const drawWorld=(x,colorA,colorB)=>{
      const g=ctx.createRadialGradient(x-r*.32,cy-r*.38,2,x,cy,r*1.4);
      g.addColorStop(0,colorA);g.addColorStop(.52,colorB);g.addColorStop(1,'rgba(5,10,28,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,cy,r*1.45,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(221,242,249,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,cy,r*.9,0,Math.PI*2);ctx.stroke();
    };
    drawWorld(cx-span,'#c9f8e7','#24647a');
    drawWorld(cx+span,'#ffe5b9','#72558f');
    const openness=state.openness;
    const glow=ctx.createLinearGradient(cx-span,0,cx+span,0);
    glow.addColorStop(0,'rgba(90,218,224,0)');
    glow.addColorStop(.5,'rgba(159,231,214,'+(0.1+openness*.46)+')');
    glow.addColorStop(1,'rgba(226,169,246,0)');
    ctx.fillStyle=glow;ctx.fillRect(cx-span,cy-r*1.6,span*2,r*3.2);
    for(let i=0;i<13;i++){
      const v=i/12,phase=t*(.2+state.phase*.8)+v*Math.PI*3;
      const y=cy+(v-.5)*r*2.7;
      const bend=(Math.sin(phase)*r*.22)*openness;
      ctx.beginPath();ctx.moveTo(cx-span+r*.65,y);
      ctx.bezierCurveTo(cx-r*.2, y+bend, cx+r*.2,y-bend,cx+span-r*.65,y);
      ctx.strokeStyle='rgba(176,242,229,'+(0.06+openness*.52*(.45+.55*Math.sin(v*Math.PI)))+')';
      ctx.lineWidth=1+openness*1.4;ctx.stroke();
    }
    // Responsive, reciprocal double-Möbius ribbon: separate Harmony and Chaos
    // paths remain visible even when alignment is low; no forced consensus.
    for(const current of membraneCurrents(state,{width:w,height:h,time:t,reducedMotion:!motion()})){
      const rgb=current.name==='harmony'?'156,238,213':'238,174,120';
      for(let i=1;i<current.points.length;i++){
        const a=current.points[i-1],b=current.points[i];
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
        ctx.strokeStyle='rgba('+rgb+','+(current.opacity*(.3+.45*(b.depth+1)/2))+')';
        ctx.lineWidth=1.2+Math.abs(b.depth)*2.4;ctx.stroke();
      }
    }
    const stars=Math.max(5,Math.round(12+state.correspondence*18));
    for(let i=0;i<stars;i++){
      const seed=i*2.399963229728653,orbit=.18+(i%7)/9;
      const x=cx+Math.cos(seed+t*.2)*span*orbit;
      const y=cy+Math.sin(seed*1.4+t*.15)*r*1.5;
      ctx.fillStyle=i%3?'rgba(230,250,248,.6)':'rgba(251,205,156,.8)';
      ctx.beginPath();ctx.arc(x,y,i%4===0?1.8:1,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='rgba(235,246,244,.85)';
    ctx.font='600 11px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillText(state.observed?'WY RDRUNE / RECEIPT':'INTENTION / SHIFTING',cx,Math.max(18,cy-r*1.65));
    if(motion()&&request){frame++;raf=request(draw);}else raf=0;
  }
  const redraw=()=>{if(raf&&cancel)cancel(raf);raf=0;draw();};
  const pointer=event=>{
    if(!active)return;
    const rect=canvas.getBoundingClientRect();
    const v=clamp((event.clientX-rect.left)/Math.max(1,rect.width));
    onShift(Math.round(v*20)/20);
  };
  const down=event=>{if(event.isPrimary===false||event.button>0)return;dragging=true;canvas.setPointerCapture?.(event.pointerId);pointer(event);};
  const move=event=>{if(dragging)pointer(event);};
  const up=event=>{dragging=false;if(event?.pointerId!==undefined&&canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture?.(event.pointerId);};
  const key=event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const current=clamp(fields.shifting);
    const v=event.key==='Home'?0:event.key==='End'?1:
      clamp((Number.isFinite(Number(canvas.dataset?.shiftValue))?Number(canvas.dataset.shiftValue):current)+
        (event.key==='ArrowRight'?.05:-.05));
    onShift(Math.round(v*100)/100);
  };
  const visibility=()=>{if(motion()&&!raf)draw();else if(!motion())redraw();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('keydown',key);
  globalThis.document?.addEventListener?.('visibilitychange',visibility);
  globalThis.addEventListener?.('resize',redraw);
  draw();
  return Object.freeze({
    setFields(next){fields={...fields,...next};state=membraneVisualState(fields);
      canvas.dataset.shiftValue=String(fields.shifting);redraw();},
    setOutcome({permeability=null,expression=null}={}){
      state=membraneVisualState({...fields,permeability,expression});redraw();},
    setWorlds(from,to){origin=String(from);destination=String(to);canvas.dataset.worlds=origin+' → '+destination;},
    destroy(){active=false;dragging=false;if(raf&&cancel)cancel(raf);
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);
      canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);
      canvas.removeEventListener('keydown',key);globalThis.document?.removeEventListener?.('visibilitychange',visibility);
      globalThis.removeEventListener?.('resize',redraw);
    },
  });
}
