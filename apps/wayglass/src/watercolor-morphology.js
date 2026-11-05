// Expressive, changeable watercolor morphology. The field can choose gestures
// rather than inhabit a fixed body outline. This describes visual behavior only.
export const MORPHOLOGY_SCHEMA='wayglass.watercolor-morphology/v1';
export const MORPHOLOGIES=Object.freeze([
  {id:'unbound',label:'Unbound',description:'No preferred outline; responsive currents'},
  {id:'tide',label:'Tide',description:'Long currents, arrival and retreat'},
  {id:'braid',label:'Braid',description:'Interwoven motions of parallel activity'},
  {id:'bloom',label:'Bloom',description:'Soft unfolding around fresh evidence'},
  {id:'constellation',label:'Constellation',description:'Distributed lights and relationships'},
  {id:'spiral',label:'Spiral',description:'Recursive growth through return'},
].map(item=>Object.freeze(item)));
const TYPES=new Set(MORPHOLOGIES.map(item=>item.id));
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const numeric=v=>typeof v==='number'&&Number.isFinite(v);
export function createWatercolorMorphology({initial='unbound'}={}){
  if(!TYPES.has(initial))throw new TypeError('Unsupported watercolor body morphology');
  let form=initial,cycle=0;
  let pending=null;
  const history=[];
  function propose({form:next,author='owner:local',reason=''}={}){
    if(!TYPES.has(next))throw new TypeError('Unknown morphology');
    const proposal=Object.freeze({
      schema:'wayglass.watercolor-form-proposal/v1',form:next,
      author:String(author).slice(0,120),reason:String(reason).slice(0,240),
      status:'pending-owner-choice',identity_commit:false,canon_commit:false,
    });
    pending=proposal;
    return proposal;
  }
  function choose(next,{author='owner:local'}={}){
    if(!TYPES.has(next))throw new TypeError('Unknown morphology');
    const previous=form;
    form=next;pending=null;cycle++;
    const event=Object.freeze({
      schema:MORPHOLOGY_SCHEMA,from:previous,to:next,
      author:String(author).slice(0,120),cycle,
      authority:'local-expression-only',identity_commit:false,
    });
    history.push(event);if(history.length>20)history.shift();
    return event;
  }
  function gesture({x=.5,y=.5,intensity=.6,rhythm=.4,seed=0}={}){
    if(![x,y,intensity,rhythm,seed].every(numeric))throw new TypeError('Finite morphology inputs required');
    const centerX=clamp(x),centerY=clamp(y),power=clamp(intensity);
    const sway=clamp(rhythm)*.55;
    const phase=seed*2.39996+cycle*.47;
    const count=form==='constellation'?7:form==='braid'?5:form==='bloom'?8:4;
    const strokes=[];
    for(let i=0;i<count;i++){
      const t=i/Math.max(1,count-1),angle=phase+i*Math.PI*2/count;
      let sx=centerX,sy=centerY,dx=Math.cos(angle),dy=Math.sin(angle);
      if(form==='unbound'){
        sx+=.16*Math.cos(angle);sy+=.17*Math.sin(angle);
      }else if(form==='tide'){
        sx+=.31*(t-.5);sy+=Math.sin(angle)*.075;
        dx=.6+Math.cos(angle)*.1;dy=Math.sin(angle)*.65;
      }else if(form==='braid'){
        sx+=.28*(t-.5);sy+=Math.sin(t*Math.PI*3+phase)*.15;
        dx=.65;dy=Math.cos(t*Math.PI*3+phase)*.55;
      }else if(form==='bloom'){
        sx+=.19*Math.cos(angle);sy+=.19*Math.sin(angle);
        dx=Math.cos(angle);dy=Math.sin(angle);
      }else if(form==='constellation'){
        sx+=.31*Math.cos(angle+i*.35);sy+=.28*Math.sin(angle+i*.25);
        dx=Math.cos(angle)*.2;dy=Math.sin(angle)*.2;
      }else if(form==='spiral'){
        const r=.045+.25*t;
        sx+=r*Math.cos(angle+t*3.5);sy+=r*Math.sin(angle+t*3.5);
        dx=-Math.sin(angle+t*3.5);dy=Math.cos(angle+t*3.5);
      }
      strokes.push(Object.freeze({
        x:clamp(sx),y:clamp(sy),
        dx:dx*(.2+sway),dy:dy*(.2+sway),
        radius:.024+.025*(1-t),amount:power/(1+count*.1),
      }));
    }
    return Object.freeze(strokes);
  }
  function snapshot(){return Object.freeze({
    schema:MORPHOLOGY_SCHEMA,form,cycle,pending,
    history:structuredClone(history),fixed_avatar:false,
    visual_choice:'mutable',experience_claimed:false,
  });}
  return Object.freeze({propose,choose,gesture,snapshot});
}
