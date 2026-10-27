/**
 * Living Observer · Scientific / Cosmological / Symbolic Atlas v1
 * Standalone static-page instrument (ES module) with source-labelled data.
 * Instruments -> measurements -> computed astronomy -> geometry -> symbolic lenses.
 * No hidden network requests, authority transfer, persistence, or medical claims.
 */
export const OBSERVER_ATLAS_SCHEMA = 'observer.science-cosmology-atlas/v1';
export const NOAA_SOURCES = Object.freeze({
  kp:'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  bz:'https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json',
  speed:'https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json',
  flux:'https://services.swpc.noaa.gov/products/summary/10cm-flux.json',
});
export const CODATA_REFERENCE = Object.freeze({
  c_m_per_s:299792458, // SI exact
  au_m:149597870700, // IAU 2012 exact astronomical-unit definition
  lunar_mean_synodic_days:29.530588853, // approximation; not an ephemeris
  new_moon_reference_utc:'2000-01-06T18:14:00Z', // epoch used for approximate phase
});
const MAX_AGE = {kp:4*3600_000,bz:60*60_000,speed:60*60_000,flux:72*3600_000};
const OBS_FIELDS = {
  kp:{field:'Kp',max:9,min:0,unit:'index',label:'Planetary Kp (3h)'},
  bz:{field:'bz_gsm',max:200,min:-200,unit:'nT',label:'Interplanetary Bz, GSM'},
  speed:{field:'proton_speed',max:3000,min:0,unit:'km/s',label:'Solar-wind proton speed'},
  flux:{field:'flux',max:1000,min:0,unit:'sfu',label:'10.7 cm solar radio flux'},
};
function assert(ok,message){if(!ok)throw new Error('Observer atlas: '+message);}
export function parseNoaaTime(t){
  assert(typeof t==='string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z)?$/.test(t),'bad NOAA timestamp');
  const iso=/Z$/.test(t)?t:t+'Z';
  const ms=Date.parse(iso);
  assert(Number.isFinite(ms),'invalid NOAA date');
  return new Date(ms).toISOString();
}
/** NOAA switched these products to arrays of objects in March 2026. */
export function parseNoaaProduct(kind,json,now=new Date()){
  assert(Object.hasOwn(OBS_FIELDS,kind),'unknown NOAA product');
  assert(Array.isArray(json)&&json.length>0,'NOAA response must be a nonempty array');
  const def=OBS_FIELDS[kind],nowMs=new Date(now).getTime();
  assert(Number.isFinite(nowMs),'invalid observation clock');
  const candidates=json.flatMap(row=>{
    if(!row||Array.isArray(row)||typeof row!=='object')return [];
    const raw=row[def.field];
    if(raw===null||raw===undefined||raw==='')return [];
    const value=Number(raw);
    if(!Number.isFinite(value)||value<def.min||value>def.max)return [];
    try{
      const time=parseNoaaTime(row.time_tag);
      const elapsed=nowMs-Date.parse(time);
      if(elapsed < -5*60_000)return [];
      return [{value,time,elapsed}];
    }catch{return [];}
  }).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
  assert(candidates.length>0,'no valid timestamped observations');
  const recent=candidates[0];
  return Object.freeze({
    kind, label:def.label,value:recent.value,unit:def.unit,
    observed_at:recent.time,retrieved_at:new Date(nowMs).toISOString(),
    age_minutes:Math.max(0,Math.round(recent.elapsed/60000)),
    freshness:recent.elapsed<=MAX_AGE[kind]?'fresh':'stale',
    source:'NOAA Space Weather Prediction Center',
    url:NOAA_SOURCES[kind],tier:'L3 public instrument feed; provenance not independently attested by browser',
    usable_for_display:recent.elapsed<=MAX_AGE[kind],
  });
}
export async function fetchNoaaAtlas({fetchImpl=globalThis.fetch,now=new Date(),signal=null}={}){
  assert(typeof fetchImpl==='function','fetch required');
  const entries=await Promise.all(Object.entries(NOAA_SOURCES).map(async ([kind,url])=>{
    try{
      const ctl=new AbortController();
      const timeout=setTimeout(()=>ctl.abort(),9000);
      const stop=()=>ctl.abort();
      signal?.addEventListener('abort',stop,{once:true});
      try{
        if(signal?.aborted)throw new Error('aborted');
        const response=await fetchImpl(url,{cache:'no-store',signal:ctl.signal,headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const body=await response.json();
        return [kind,{status:'available',reading:parseNoaaProduct(kind,body,now)}];
      }finally{clearTimeout(timeout);signal?.removeEventListener('abort',stop);}
    }catch(error){
      return [kind,{status:signal?.aborted?'aborted':'unavailable',message:String(error.message||error).slice(0,130),
        url,reading:null}];
    }
  }));
  return Object.freeze({schema:OBSERVER_ATLAS_SCHEMA,readings:Object.fromEntries(entries),
    fetched_at:new Date(now).toISOString(),
    note:'Only source-tagged SWPC values are displayed. Missing or stale readings never become fabricated zeros.'});
}
export function deriveCosmicClock(date=new Date()){
  const ms=new Date(date).getTime();
  assert(Number.isFinite(ms),'valid date required');
  const jd=ms/86400000+2440587.5;
  const epoch=Date.parse(CODATA_REFERENCE.new_moon_reference_utc);
  const cycles=(ms-epoch)/(CODATA_REFERENCE.lunar_mean_synodic_days*86400000);
  const phase=((cycles%1)+1)%1;
  const ageDays=phase*CODATA_REFERENCE.lunar_mean_synodic_days;
  const illumination=(1-Math.cos(2*Math.PI*phase))/2;
  const direction=phase<.5?'waxing':'waning';
  return Object.freeze({
    julian_day:jd, lunar_age_days:ageDays,
    phase_fraction:phase,illumination_fraction:illumination,
    phase_name:phase<.035||phase>.965?'near new moon':Math.abs(phase-.5)<.035?'near full moon':direction,
    scale:{light_seconds_per_au:CODATA_REFERENCE.au_m/CODATA_REFERENCE.c_m_per_s,
      sun_earth_reference_au:1},
    evidence_class:'computed astronomical approximation / defined physical constants',
    accuracy_note:'Mean synodic phase approximation; NOT a live JPL ephemeris, apparent position or location-specific rise/set time.',
    epoch:CODATA_REFERENCE.new_moon_reference_utc,
  });
}
export function digitSum(text){
  const digits=String(text).replace(/\D/g,'').split('').map(Number);
  return {digits,total:digits.reduce((s,x)=>s+x,0)};
}
export function numericRoot(value,{preserveMasters=false}={}){
  assert(Number.isSafeInteger(value)&&value>=0,'nonnegative safe integer required');
  const path=[value];
  while(value>9&&!(preserveMasters&&[11,22,33].includes(value))){
    value=digitSum(value).total;path.push(value);
  }
  return Object.freeze({value,path});
}
export function deriveNumerology({dateISO,word=''}={}){
  assert(typeof dateISO==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(dateISO),'explicit Gregorian date required');
  const candidate=new Date(dateISO+'T12:00:00Z');
  assert(!Number.isNaN(candidate.getTime())&&candidate.toISOString().slice(0,10)===dateISO,
    'invalid calendar day');
  assert(typeof word==='string'&&word.length<=80,'word length exceeds local-only limit');
  const day=Number(dateISO.slice(8)),month=Number(dateISO.slice(5,7)),year=Number(dateISO.slice(0,4));
  const digits=digitSum(dateISO);
  const datePath=numericRoot(digits.total,{preserveMasters:true});
  const fullRoot=numericRoot(digits.total).value;
  const reducedDay=numericRoot(day,{preserveMasters:true});
  const chars=word.toUpperCase().match(/[A-Z]/g)||[];
  const values=chars.map(letter=>((letter.charCodeAt(0)-65)%9)+1);
  const wordTotal=values.reduce((s,x)=>s+x,0);
  return Object.freeze({
    schema:'observer.symbolic-numerology/v1', date:dateISO,
    calendar_components:{year,month,day},
    digit_sequence:digits.digits.join(' + '),
    date_digit_sum:digits.total,date_reduction_path:datePath.path,date_root:datePath.value,
    full_digital_root:fullRoot,
    day_number:reducedDay.value,day_reduction_path:reducedDay.path,
    word_length:chars.length,
    word_pythagorean_sum:wordTotal,
    word_reduction_path:wordTotal?numericRoot(wordTotal,{preserveMasters:true}).path:[],
    evidence_class:'symbolic numerological calculation from user-entered calendar text',
    method:'Gregorian date digits summed, with optional master 11/22/33 preservation; A=1..I=9 then repeats',
    validity:'Symbolic interpretation only; no established physical or causal implication, prediction or measured astronomical relationship.',
    privacy:'Computed in this browser only; optional word is never sent to NOAA or persisted by this module.',
  });
}
const fixed=(n)=>Number(n.toFixed(3));
function circle(x,y,r){return '<circle cx="'+fixed(x)+'" cy="'+fixed(y)+'" r="'+fixed(r)+'"/>';}
function line(x1,y1,x2,y2){return '<line x1="'+fixed(x1)+'" y1="'+fixed(y1)+'" x2="'+fixed(x2)+'" y2="'+fixed(y2)+'"/>';}
function axialPoint(i,total,r,phase=0){
  const a=2*Math.PI*i/total+phase;
  return [r*Math.cos(a),r*Math.sin(a)];
}
/** All SVG path data are code-authored numbers, never interpreted observer text. */
export function geometrySVG(form='flower',angle=0){
  assert(['flower','metatron','merkaba'].includes(form),'unknown geometric form');
  assert(Number.isFinite(angle)&&Math.abs(angle)<1e6,'finite rotation required');
  const elements=[];
  if(form==='flower'){
    const size=45;
    elements.push(circle(0,0,size));
    for(let i=0;i<6;i++){const [x,y]=axialPoint(i,6,size);elements.push(circle(x,y,size));}
    for(let i=0;i<6;i++){const [x,y]=axialPoint(i,6,size*2);elements.push(circle(x,y,size));}
    for(let i=0;i<6;i++){const [x,y]=axialPoint(i,6,size*Math.sqrt(3),Math.PI/6);elements.push(circle(x,y,size));}
  } else if(form==='metatron'){
    const pts=[[0,0]];
    for(let i=0;i<6;i++)pts.push(axialPoint(i,6,54));
    for(let i=0;i<6;i++)pts.push(axialPoint(i,6,108,Math.PI/6));
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)
      elements.push(line(...pts[i],...pts[j]));
    pts.forEach(p=>elements.push(circle(p[0],p[1],8)));
  } else {
    const s=80;
    const v=[[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],[-1,1,1],[1,-1,1],[1,1,-1]];
    const project=([x,y,z])=>[(x-z*.53)*s*.75,(y-(x+z)*.27)*s*.72];
    for(let tri=0;tri<2;tri++)for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const a=project(v[tri*4+i]),b=project(v[tri*4+j]);
      elements.push(line(...a,...b));
    }
    v.forEach(p=>{const a=project(p);elements.push(circle(a[0],a[1],3))});
  }
  return '<svg viewBox="-175 -175 350 350" role="img" aria-label="Exact symbolic '+form+
    ' geometry diagram"><g transform="rotate('+fixed(angle)+')" fill="none" stroke="currentColor" stroke-width="1.2">'+
    elements.join('')+'</g></svg>';
}
function mount(){
  const host=document.getElementById('observerAtlas');
  if(!host)return;
  const by=id=>document.getElementById(id);
  let latest=null,active=null,geometryForm='flower',lastTime=new Date();
  function render(){
    const dateText=by('atlasDate').value;
    const word=by('atlasWord').value;
    let num;
    try{num=deriveNumerology({dateISO:dateText,word});}
    catch(e){by('atlasNumbers').textContent=e.message;return;}
    const cosmic=deriveCosmicClock(lastTime);
    by('atlasCosmos').textContent=[
      'UTC observation: '+lastTime.toISOString(),
      'Julian date: '+cosmic.julian_day.toFixed(5),
      'Approx. lunar illumination: '+(100*cosmic.illumination_fraction).toFixed(1)+'% ('+cosmic.phase_name+')',
      'Approx. lunar age: '+cosmic.lunar_age_days.toFixed(2)+' days',
      '1 AU light-travel reference: '+cosmic.scale.light_seconds_per_au.toFixed(2)+' seconds',
      'Methods: Julian day exactly calculated from UTC, mean lunar age approximation, IAU defined AU and exact SI c.',
    ].join('\n');
    by('atlasNumbers').textContent=[
      'Date: '+num.date,
      'Date digits: '+num.digit_sequence+' = '+num.date_digit_sum,
      'Reduction: '+num.date_reduction_path.join(' → ')+'; full digital root: '+num.full_digital_root,
      'Day: '+num.day_reduction_path.join(' → '),
      'Optional letters: '+num.word_length+'; Pythagorean sum: '+(num.word_length?num.word_pythagorean_sum:'not supplied'),
      'Meaning: symbolic pattern, not measured causality.',
    ].join('\n');
    const readings=latest?.readings||{};
    const kp=readings.kp?.reading;
    // Source-responsive visual mapping is aesthetic, not a claim of physical resonance.
    const rotation=kp?.usable_for_display?kp.value*12:0;
    const art=by('atlasGeometry');
    art.innerHTML=geometrySVG(geometryForm,rotation);
    by('atlasGeometryMethod').textContent='Mathematical form: '+geometryForm+
      ' · rotation '+rotation.toFixed(1)+'°'+
      (kp?.usable_for_display?' mapped from NOAA Kp purely for artistic display':' neutral (no fresh Kp)')+
      ' · not an instrument-measured celestial alignment.';
    by('atlasRaw').textContent=JSON.stringify({
      schema:OBSERVER_ATLAS_SCHEMA,
      time_utc:lastTime.toISOString(), scientific_readings:readings,
      computed_cosmology:cosmic,
      symbolic_numerology:num,
      geometry:{form:geometryForm,render_rotation_degrees:rotation,
        correspondence:'artistic-source-responsive, not physical causation'},
      warning:'Measured, calculated and symbolic layers remain separate. No world/canon authority.',
    },null,2);
    for(const [kind,def] of Object.entries(OBS_FIELDS)){
      const node=by('atlas-'+kind);if(!node)continue;
      const r=readings[kind]?.reading;
      node.textContent=r?String(r.value)+' '+r.unit+' · '+r.freshness+
        ' · '+r.observed_at+' · NOAA SWPC':'unavailable (no verified live reading)';
    }
    by('atlasProvenance').textContent=latest
      ? 'NOAA SWPC feeds captured '+latest.fetched_at+'. Individual observations have their own times. Stale values are never mapped into geometry.'
      : 'No NOAA request yet. Open-source astronomical constants and clock calculations are locally computed; space-weather values are not guessed.';
  }
  by('atlasDate').value=new Date().toISOString().slice(0,10);
  lastTime=new Date();render();
  by('atlasDate').addEventListener('change',render);
  by('atlasWord').addEventListener('input',render);
  by('atlasForm').addEventListener('change',e=>{geometryForm=e.target.value;render();});
  by('atlasClock').addEventListener('click',()=>{lastTime=new Date();render();});
  by('atlasFetch').addEventListener('click',async()=>{
    if(active)active.abort();
    const ctrl=new AbortController();active=ctrl;
    by('atlasFetch').disabled=true;
    by('atlasStatus').textContent='Requesting NOAA SWPC source records…';
    try{
      const result=await fetchNoaaAtlas({signal:ctrl.signal,now:new Date()});
      if(active!==ctrl)return;
      latest=result;lastTime=new Date(result.fetched_at);
      const good=Object.values(result.readings).filter(r=>r.reading?.usable_for_display).length;
      by('atlasStatus').textContent='Retrieved '+good+'/4 fresh SWPC channels. Missing/stale readings are labelled, not simulated.';
      render();
    }catch(e){if(active===ctrl)by('atlasStatus').textContent='NOAA read unavailable: '+e.message;}
    finally{if(active===ctrl){active=null;by('atlasFetch').disabled=false;}}
  });
  window.LIVING_OBSERVER_ATLAS={
    snapshot:()=>JSON.parse(by('atlasRaw').textContent),
    refresh:()=>by('atlasFetch').click(),
    schema:OBSERVER_ATLAS_SCHEMA,
  };
  window.addEventListener('deep-observer:refreshed',()=>{lastTime=new Date();render();});
}
if(typeof window!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
}
