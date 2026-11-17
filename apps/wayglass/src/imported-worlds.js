// Read-only Wayglass projection of the authored ArcSweep/Notion world archive.
// Preserve the original objects and source keys; do not silently rewrite canon.
import {HOUSE_DR_BUNDLE} from '../../arcsweep/src/house-dr-bundle.js';
export const WAYGLASS_IMPORTED_WORLDS_SCHEMA='wayglass.imported-worlds/v1';
export function importHouseWorlds(bundle=HOUSE_DR_BUNDLE){
 if(!bundle||!Array.isArray(bundle.worlds))throw new TypeError('World archive required');
 const seen=new Set();
 const worlds=bundle.worlds.map((source,index)=>{
  const key=String(source?.sourceKey||source?.id||'').trim();
  if(!key||seen.has(key))throw new TypeError('Missing or duplicate source world key at '+index);
  seen.add(key);
  return Object.freeze({id:'house:'+key,source_key:key,name:String(source.name||key),kind:String(source.kind||''),description:String(source.description||''),history:String(source.history||''),rules:String(source.rules||''),source_urls:Object.freeze(Array.isArray(source.sourceUrls)?source.sourceUrls.filter(x=>typeof x==='string'):[]),source_bundle:String(bundle.id||''),source_version:String(bundle.version||''),status:'imported-read-only',source});
 });
 return Object.freeze({schema:WAYGLASS_IMPORTED_WORLDS_SCHEMA,bundle_id:String(bundle.id||''),version:String(bundle.version||''),worlds:Object.freeze(worlds)});
}
