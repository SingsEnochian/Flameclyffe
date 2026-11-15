// One pacing dial for every Wayglass Wyrdrune cipher surface.
// Never stores source, translations, receipts or private model turns.
export const CYPHER_PACE_KEY='wayglass:cypher-pace/v1';
export const DEFAULT_CYPHER_PACE='slow';
export const CYPHER_PACES=Object.freeze({
  slow:Object.freeze({label:'Slow · savour the runes',frameMs:95,steps:34,overlap:.78,staggerCapMs:9600,lingerMs:1500,nativeSteps:40}),
  steady:Object.freeze({label:'Steady · follow the letters',frameMs:70,steps:26,overlap:.66,staggerCapMs:6500,lingerMs:900,nativeSteps:30}),
  swift:Object.freeze({label:'Swift · quick translation',frameMs:36,steps:16,overlap:.45,staggerCapMs:2400,lingerMs:450,nativeSteps:24}),
});
export const CYPHER_PACE_OPTIONS=Object.entries(CYPHER_PACES)
  .map(([value,pace])=>'<option value="'+value+'">'+pace.label+'</option>').join('');
export function paceFor(value){
  return CYPHER_PACES[value]||CYPHER_PACES[DEFAULT_CYPHER_PACE];
}
export function readCypherPace(scope=globalThis){
  try{
    const key=scope.sessionStorage?.getItem(CYPHER_PACE_KEY);
    return Object.hasOwn(CYPHER_PACES,key)?key:DEFAULT_CYPHER_PACE;
  }catch{return DEFAULT_CYPHER_PACE;}
}
export function writeCypherPace(value,scope=globalThis){
  const key=Object.hasOwn(CYPHER_PACES,value)?value:DEFAULT_CYPHER_PACE;
  try{scope.sessionStorage?.setItem(CYPHER_PACE_KEY,key);}catch{/* Default still works */}
  return key;
}
export function cypherRunOptions(value){
  const {frameMs,steps,overlap,staggerCapMs}=paceFor(value);
  return {frameMs,steps,overlap,staggerCapMs};
}
export function nativeRunOptions(value){
  const {frameMs,nativeSteps,lingerMs}=paceFor(value);
  return {frameMs,steps:nativeSteps,lingerMs};
}
