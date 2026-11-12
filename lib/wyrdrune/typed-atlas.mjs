// Wyrdrune typed universe atlas v0.1.
// Distinguishes a universe, its destinations, affiliations and traversal mechanisms.
// Source labels are NOT transcribed glyphs. Unbound entries cannot be navigated.
import {worldRune,worldCoordinates} from './relational-worlds.mjs';

const TYPES=Object.freeze(['universe','location','affiliation','gateway','undetermined']);
const text=(v,name)=>{if(typeof v!=='string'||!v.trim()||v.length>256)throw new TypeError(name+' must be nonempty text');return v;};
const copy=x=>JSON.parse(JSON.stringify(x));
const addressKey=a=>{
  if(a?.kind==='wyrdrune.world-rune/v1')return 'rune:'+text(a.glyphId,'glyphId');
  if(a?.kind==='wyrdrune.world-coordinates/v1'){
    const {universe,branch,time,x,y,z}=a;
    text(universe,'universe');text(branch,'branch');
    if(![time,x,y,z].every(n=>typeof n==='number'&&Number.isFinite(n)))throw new TypeError('Finite world coordinates required');
    return 'coordinates:'+JSON.stringify([universe,branch,time,x,y,z]);
  }
  throw new TypeError('Expected a Wyrdrune rune or coordinates');
};
export function atlasRef(universeId,entryId){
  return Object.freeze({kind:'wyrdrune.atlas-ref/v1',universeId:text(universeId,'universeId'),entryId:text(entryId,'entryId')});
}
export class TypedRuneAtlas {
  constructor(entries){
    if(!Array.isArray(entries)||entries.length>512)throw new TypeError('Atlas entries must be an array of at most 512');
    const seen=new Set(),addresses=new Set(),map=new Map();
    for(const input of entries){
      if(!input||typeof input!=='object')throw new TypeError('Atlas entry must be a record');
      const {id,label,type,universeId=null,rune=null,coordinates=null,source='owner-study-2026-11-12'}=input;
      text(id,'entry id');text(label,'entry label');text(source,'source');
      if(!TYPES.includes(type))throw new TypeError('Unknown atlas type '+type);
      if(seen.has(id))throw new TypeError('Duplicate atlas ID '+id);
      if(type==='universe'&&universeId!==null)throw new TypeError('Universe cannot have parent universe');
      if(type!=='universe')text(universeId,'universeId');
      if(type!=='universe'&&coordinates&&coordinates.universe!==universeId)
        throw new TypeError('Coordinate universe must match atlas parent');
      for(const a of [rune,coordinates].filter(Boolean)){
        const key=addressKey(a);
        if(addresses.has(key))throw new TypeError('Duplicate atlas address');
        addresses.add(key);
      }
      seen.add(id);
      map.set(id,Object.freeze({id,label,type,universeId,rune:copy(rune),coordinates:copy(coordinates),source}));
    }
    for(const e of map.values()){
      if(e.type==='universe')continue;
      const parent=map.get(e.universeId);
      if(!parent||parent.type!=='universe')throw new TypeError('Atlas entry requires an existing universe parent');
    }
    this.entries=map;
    Object.freeze(this);
  }
  get(id){
    const e=this.entries.get(text(id,'entry id'));
    if(!e)throw new Error('Unknown atlas entry '+id);
    return copy(e);
  }
  children(universeId,{type}={}){
    if(this.get(universeId).type!=='universe')throw new TypeError('Not a universe');
    if(type&&!TYPES.includes(type))throw new TypeError('Unknown atlas type');
    return [...this.entries.values()].filter(e=>e.universeId===universeId&&(!type||e.type===type)).map(copy);
  }
  resolve(address,{withinUniverse=null,expectedType=null}={}){
    const key=addressKey(address);
    const entries=[...this.entries.values()].filter(e=>[e.rune,e.coordinates].filter(Boolean).some(a=>addressKey(a)===key));
    if(entries.length!==1)throw new Error(entries.length?'Ambiguous atlas address':'Unbound or unknown atlas address');
    const e=entries[0];
    if(withinUniverse!==null&&e.id!==withinUniverse&&e.universeId!==withinUniverse)
      throw new Error('Atlas address outside requested universe');
    if(expectedType!==null&&e.type!==expectedType)throw new TypeError('Atlas type mismatch: expected '+expectedType+', got '+e.type);
    return copy(e);
  }
  async bind(id,{rune=null,coordinates=null},authorize,context){
    if(typeof authorize!=='function'||!await authorize('atlas.bind',context))
      throw new Error('Atlas binding requires owner authorization');
    const original=this.get(id);
    if(!rune&&!coordinates)throw new TypeError('At least one address required');
    if(original.type!=='universe'&&coordinates&&coordinates.universe!==original.universeId)
      throw new TypeError('Coordinate universe must match parent');
    // Replacing addresses is an explicit rebind, not an implicit reassignment.
    const next=[...this.entries.values()].map(e=>e.id===id?{...e,rune,coordinates}:e);
    return new TypedRuneAtlas(next);
  }
  planPassage({universeId,from,to,gatewayId}){
    const universe=this.get(universeId),origin=this.get(from),destination=this.get(to),gate=this.get(gatewayId);
    if(universe.type!=='universe'||origin.type!=='location'||destination.type!=='location'||gate.type!=='gateway')
      throw new TypeError('Passage needs a universe, two locations and a gateway');
    if([origin,destination,gate].some(e=>e.universeId!==universeId))
      throw new Error('Passage cannot silently cross universe boundaries');
    if(!origin.rune&&!origin.coordinates||!destination.rune&&!destination.coordinates)
      throw new Error('Both destinations must be bound before passage planning');
    return Object.freeze({kind:'wyrdrune.atlas-passage-plan/v1',universeId,from,to,gatewayId,
      authorized:false,executed:false,temporalDisplacement:null,
      // Actual route feasibility is determined by an authorized world-graph membrane.
      membraneVerified:false});
  }
}
export const BABYLON5_STUDY_ATLAS=Object.freeze([
  {id:'b5',label:'Babylon 5',type:'universe'},
  {id:'b5:minbar',label:'Minbar',type:'location',universeId:'b5'},
  {id:'b5:centauri-prime',label:'Centauri Prime',type:'location',universeId:'b5'},
  {id:'b5:narn',label:'Narn',type:'location',universeId:'b5'},
  {id:'b5:zha-dum',label:"Z'ha'dum",type:'location',universeId:'b5'},
  {id:'b5:rangers',label:'Rangers',type:'affiliation',universeId:'b5'},
  {id:'b5:psi-corps',label:'Psi Corps',type:'affiliation',universeId:'b5'},
  {id:'b5:earth-alliance',label:'Earth Alliance',type:'affiliation',universeId:'b5'},
  {id:'b5:jumpgate',label:'Jumpgate',type:'gateway',universeId:'b5'},
  {id:'b5:vorlon',label:'Vorlon',type:'undetermined',universeId:'b5'},
  {id:'b5:shadows',label:'Shadows',type:'undetermined',universeId:'b5'},
  {id:'b5:earth-gate',label:'Earth Gate',type:'undetermined',universeId:'b5'}
]);
export function babylon5Atlas(){return new TypedRuneAtlas(BABYLON5_STUDY_ATLAS);}
export {worldRune,worldCoordinates};
