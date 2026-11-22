// Image resolution is a reversible presentation layer, not a rewrite of pigment.
// Source images remain local; no uploads, inference, or agent-authorship claims.
export function createWatercolorImageResolver(canvas,{scope=globalThis}={}) {
  if(!canvas?.getContext)throw new TypeError('An image canvas is required');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new TypeError('A 2D canvas context is required');
  let source=null,opacity=0,target=0,stopped=false,disposed=false,epoch=0;
  const clamp=n=>Math.max(0,Math.min(1,n));
  const assertLive=()=>{if(disposed)throw new Error('Image resolver disposed');};
  function setSource(next,kind) {
    assertLive();
    if(stopped)throw new Error('Feather holds image resolution');
    source={image:next,kind};target=1;epoch++;
    return snapshot();
  }
  function emerge(seed=0) {
    assertLive();
    if(!Number.isFinite(seed))throw new TypeError('Finite image seed required');
    const paper=scope.document?.createElement('canvas');
    if(!paper)throw new TypeError('Canvas document unavailable');
    paper.width=640;paper.height=400;
    const p=paper.getContext('2d');
    const hue=((Math.trunc(seed)%360)+360)%360;
    // Recognisable, deterministic landscape silhouette with celestial disc.
    const sky=p.createLinearGradient(0,0,0,400);
    sky.addColorStop(0,'hsl('+hue+' 48% 18%)');
    sky.addColorStop(1,'hsl('+((hue+55)%360)+' 45% 55%)');
    p.fillStyle=sky;p.fillRect(0,0,640,400);
    p.beginPath();p.arc(470,105,46,0,Math.PI*2);
    p.fillStyle='rgba(255,233,190,.88)';p.fill();
    for(let layer=0;layer<3;layer++){
      p.beginPath();p.moveTo(0,400);
      for(let x=0;x<=640;x+=8){
        const y=225+layer*52+Math.sin(x*.012+seed*.01+layer)*31+
          Math.sin(x*.029+layer*3)*13;
        p.lineTo(x,y);
      }
      p.lineTo(640,400);p.closePath();
      p.fillStyle='hsl('+((hue+135+layer*12)%360)+' 30% '+(20+layer*8)+'%)';
      p.fill();
    }
    return setSource(paper,'emergent');
  }
  async function resolveFile(file) {
    assertLive();
    if(stopped)throw new Error('Feather holds image resolution');
    if(!file||!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)||file.size>12*1024*1024)
      throw new TypeError('Choose a PNG, JPEG, WebP or GIF image up to 12 MB');
    const token=++epoch;
    const url=scope.URL.createObjectURL(file);
    try {
      const image=new scope.Image();
      image.src=url;
      await image.decode();
      if(disposed||stopped||token!==epoch)return snapshot();
      if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>24e6)
        throw new RangeError('Image dimensions exceed resolution budget');
      return setSource(image,'reference');
    } finally {scope.URL.revokeObjectURL(url);}
  }
  function render(width,height,deltaMs=16) {
    if(disposed||!width||!height)return;
    canvas.width=width;canvas.height=height;
    if(!stopped)opacity+= (target-opacity)*Math.min(1,Math.max(0,deltaMs)/400);
    ctx.clearRect(0,0,width,height);
    if(source&&opacity>.001){
      const img=source.image,iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
      const scale=Math.min(width/iw,height/ih);
      // A growing, feathered pigment window reveals the image from the centre.
      // The image remains a separate presentation layer; no source pixels change.
      const reveal=clamp(opacity);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(width/2,height/2,Math.max(.01,width*.72*reveal),
        Math.max(.01,height*.72*reveal),0,0,Math.PI*2);
      ctx.clip();
      ctx.globalAlpha=reveal;
      ctx.drawImage(img,(width-iw*scale)/2,(height-ih*scale)/2,iw*scale,ih*scale);
      ctx.restore();
    }
  }
  function dissolve(){assertLive();if(stopped)return snapshot();target=0;return snapshot();}
  function feather(value=true){assertLive();stopped=Boolean(value);if(stopped)epoch++;return snapshot();}
  function snapshot(){return Object.freeze({kind:source?.kind??null,opacity,target,stopped,sourceRetained:!!source});}
  function dispose(){disposed=true;epoch++;source=null;canvas.width=0;canvas.height=0;}
  return Object.freeze({emerge,resolveFile,render,dissolve,feather,snapshot,dispose});
}
