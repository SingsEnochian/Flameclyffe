import { createWyrdruneRuntime } from '../../../lib/wyrdrune/runtime.mjs';

export const STROKE_KIND='watercolor.stroke/v1';
const runtime=createWyrdruneRuntime({hashSource:()=> 'watercolour-local-projection'});
const SCALE_FIELDS=['density','spread'];
const unit=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1;
const keysMatch=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)
  &&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

export function validateWordPainting(strokes){
  if(!Array.isArray(strokes)||strokes.length<1||strokes.length>8)throw new TypeError('Use one to eight brushstrokes');
  return strokes.map(stroke=>{
    if(!keysMatch(stroke,['kind','words','color','density','spread','points'])||stroke.kind!==STROKE_KIND
      ||typeof stroke.words!=='string'||!stroke.words.trim()||stroke.words.length>160
      ||typeof stroke.color!=='string'||!/^#[0-9a-f]{6}$/i.test(stroke.color)
      ||!SCALE_FIELDS.every(key=>unit(stroke[key]))
      ||!Array.isArray(stroke.points)||stroke.points.length<1||stroke.points.length>16
      ||!stroke.points.every(point=>Array.isArray(point)&&point.length===2&&point.every(unit)))
        throw new TypeError('A stroke needs words, hex pigment, density, spread and a normalised path');
    return {...stroke,color:stroke.color.toLowerCase(),points:stroke.points.map(point=>[...point])};
  });
}

// Execute only the local score. The runtime receives no device or network bridges.
export async function readWordPainting(source){
  if(!source?.includes('"'+STROKE_KIND+'"'))return null;
  if(source.length>6000)throw new RangeError('Brush score exceeds the source limit');
  const program=runtime.compile(source);
  if(program.units.length!==1||program.units[0].scope==='carried')
    throw new TypeError('Brush scores use a single plain Möbius');
  const result=await runtime.execute(program,{maxOperations:1200});
  return validateWordPainting(result.output.filter(value=>value?.kind===STROKE_KIND));
}

// Interpolate in fluid-grid units so sparse input points still make a continuous stroke.
export function pressWordPainting(fluid,strokes,{wet=false}={}){
  for(const {color,density,spread,points} of strokes){
    const radius=.012+spread*.105;
    let [previousX,previousY]=points[0];
    for(const [x,y] of points){
      const dx=x-previousX,dy=y-previousY;
      const distance=Math.hypot(dx*fluid.width,dy*fluid.height);
      const count=Math.max(1,Math.ceil(distance/(radius*Math.min(fluid.width,fluid.height))));
      for(let step=1;step<=count;step++){
        const t=step/count;
        fluid.inject({x:previousX+dx*t,y:previousY+dy*t,color,radius:radius*(wet?1:.85),
          amount:wet?.23+density*.43:.28+density*1.3,dx:wet?dx*.35:0,dy:wet?dy*.35:0});
      }
      previousX=x;previousY=y;
    }
  }
}
