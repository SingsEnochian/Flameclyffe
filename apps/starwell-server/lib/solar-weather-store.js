'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const SOURCES={
  kp:{url:'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',cadenceMinutes:180,agency:'NOAA Space Weather Prediction Center'},
  plasma:{url:'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',cadenceMinutes:1,agency:'NOAA Space Weather Prediction Center'},
  magnetic:{url:'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json',cadenceMinutes:1,agency:'NOAA Space Weather Prediction Center'},
  xray:{url:'https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json',cadenceMinutes:1,agency:'NOAA GOES / SWPC'},
  solarCycle:{url:'https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json',cadenceMinutes:43200,agency:'NOAA Space Weather Prediction Center'},
  alerts:{url:'https://services.swpc.noaa.gov/products/alerts.json',cadenceMinutes:1,agency:'NOAA Space Weather Prediction Center'}
};
const num=value=>{const n=Number(value);return Number.isFinite(n)?n:null};
function rows(product){if(!Array.isArray(product)||product.length===0)return[];if(Array.isArray(product[0])){if(product.length<2)return[];const header=product[0];return product.slice(1).map(row=>Object.fromEntries(header.map((key,i)=>[key,row[i]])))}return product.filter(x=>x&&typeof x==='object')}
function timeOf(row){const value=row?.time_tag||row?.['time-tag']||row?.issue_datetime||row?.issue_datetime_utc||null;if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value))return`${value.replace(' ','T')}Z`;return value}
function latest(product,predicate=()=>true){return rows(product).filter(predicate).sort((a,b)=>Date.parse(timeOf(b)||0)-Date.parse(timeOf(a)||0))[0]||null}
function flareClass(flux){if(!(flux>0))return null;const bands=[['X',1e-4],['M',1e-5],['C',1e-6],['B',1e-7],['A',1e-8]];for(const[name,base]of bands)if(flux>=base)return`${name}${(flux/base).toFixed(1)}`;return`A${(flux/1e-8).toFixed(1)}`}
function ageMinutes(stamp,now=Date.now()){const t=Date.parse(stamp||'');return Number.isFinite(t)?Math.max(0,(now-t)/60000):null}
function freshness(stamp,cadence,now){const age=ageMinutes(stamp,now);if(age===null)return'unavailable';if(age<=Math.max(15,cadence*3))return'fresh';if(age<=Math.max(120,cadence*12))return'stale';return'expired'}
function metric(value,unit,observedAt,sourceKey,now){const source=SOURCES[sourceKey];return{value,unit,observedAt,sourceKey,sourceUrl:source.url,agency:source.agency,freshness:freshness(observedAt,source.cadenceMinutes,now)}}
function normaliseProducts(products,{now=Date.now()}={}){
  const kp=latest(products.kp),plasma=latest(products.plasma),mag=latest(products.magnetic),xray=latest(products.xray,row=>String(row.energy||'').includes('0.1-0.8')),cycle=latest(products.solarCycle),alerts=rows(products.alerts).sort((a,b)=>Date.parse(timeOf(b)||0)-Date.parse(timeOf(a)||0)).slice(0,20);
  const xflux=num(xray?.flux),critical=[timeOf(plasma),timeOf(mag)].filter(Boolean).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||timeOf(kp),criticalAge=ageMinutes(critical,now);
  const snapshot={schema:'hearthgate.solar-weather/v1',id:crypto.randomUUID(),retrievedAt:new Date(now).toISOString(),state:criticalAge===null?'unavailable':criticalAge<=20?'fresh':criticalAge<=120?'stale':'expired',metrics:{
    kp:metric(num(kp?.Kp??kp?.kp),'index 0–9',timeOf(kp),'kp',now),
    solarWindSpeed:metric(num(plasma?.speed),'km/s',timeOf(plasma),'plasma',now),
    solarWindDensity:metric(num(plasma?.density),'protons/cm³',timeOf(plasma),'plasma',now),
    solarWindTemperature:metric(num(plasma?.temperature),'K',timeOf(plasma),'plasma',now),
    bt:metric(num(mag?.bt),'nT',timeOf(mag),'magnetic',now),
    bz:metric(num(mag?.bz_gsm??mag?.bz),'nT GSM',timeOf(mag),'magnetic',now),
    xrayFlux:metric(xflux,'W/m² (0.1–0.8 nm)',timeOf(xray),'xray',now),
    flareClass:{...metric(flareClass(xflux),'GOES class',timeOf(xray),'xray',now)},
    sunspotNumber:metric(num(cycle?.ssn),'monthly mean',timeOf(cycle),'solarCycle',now),
    f107:metric(num(cycle?.['f10.7']??cycle?.f107),'sfu',timeOf(cycle),'solarCycle',now)
  },alerts:alerts.map(a=>({productId:a.product_id||null,issuedAt:timeOf(a),message:String(a.message||'').slice(0,12000),sourceUrl:SOURCES.alerts.url})),sources:Object.fromEntries(Object.entries(SOURCES).map(([key,value])=>[key,{...value,retrievedAt:new Date(now).toISOString()}])),boundary:'Environmental measurements and official alerts are preserved as sourced context. Correspondence with personal, narrative, or Observer events is not evidence of causation.'};
  snapshot.identity=crypto.createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(snapshot.metrics).map(([k,v])=>[k,[v.value,v.observedAt]])))).digest('hex');return snapshot
}
function createSolarWeatherStore({dataDir,fetchImpl=global.fetch,now=()=>Date.now(),cacheMs=60000}={}){const root=path.join(dataDir,'solar-weather'),file=path.join(root,'history.json');let memory=null,lastFetch=0;
  async function read(){try{return JSON.parse(await fs.promises.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;return{schema:'hearthgate.solar-weather-history/v1',snapshots:[]}}}
  async function write(v){await fs.promises.mkdir(root,{recursive:true});const temp=`${file}.${process.pid}.tmp`;await fs.promises.writeFile(temp,`${JSON.stringify(v,null,2)}\n`);await fs.promises.rename(temp,file)}
  async function fetchJson(source){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetchImpl(source.url,{signal:controller.signal,headers:{'User-Agent':'Hearthgate/0.1 solar-weather instrument'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json()}finally{clearTimeout(timer)}}
  async function refresh({force=false}={}){if(!force&&memory&&now()-lastFetch<cacheMs)return memory;const results=await Promise.allSettled(Object.entries(SOURCES).map(async([key,source])=>[key,await fetchJson(source)])),products={},failures=[];for(const result of results)result.status==='fulfilled'?products[result.value[0]]=result.value[1]:failures.push(result.reason?.message||'source unavailable');const snapshot=normaliseProducts(products,{now:now()});snapshot.failures=failures;const history=await read(),existing=history.snapshots.find(x=>x.identity===snapshot.identity);if(existing){memory={...existing,retrievedAt:snapshot.retrievedAt,failures};lastFetch=now();return memory}history.snapshots.push(snapshot);history.snapshots=history.snapshots.slice(-5000);await write(history);memory=snapshot;lastFetch=now();return snapshot}
  async function current({refresh=false}={}){if(refresh)return refreshStore();if(memory)return memory;const history=await read();memory=history.snapshots.at(-1)||null;return memory}
  const refreshStore=options=>refresh(options);async function history(limit=500){const data=await read();return{...data,snapshots:data.snapshots.slice(-Math.max(1,Math.min(5000,Number(limit)||500)))}}
  return{refresh:refreshStore,current,history,sources:SOURCES,file}
}
module.exports={SOURCES,ageMinutes,createSolarWeatherStore,flareClass,freshness,normaliseProducts,rows};
