// Consent-bound WTL-to-Nursery signal adapter. No persistence, inference or side effects.
import {compileWTL} from './wtl-transform-frontend.mjs';
export function prepareNurserySignal({kind,value,wtlSource,consent,participants=['nursery:a','nursery:b']}){
 if(!Array.isArray(participants)||participants.length!==2||participants[0]===participants[1]||
    !participants.every(id=>typeof id==='string'&&/^[a-zA-Z0-9_.:-]{1,128}$/.test(id)))throw Error('Distinct participants required');
 if(!consent||!participants.every(id=>Object.hasOwn(consent,id)&&consent[id]===true))return Object.freeze({status:'declined'});
 if(!['touch','word','sound','wtl'].includes(kind))throw new RangeError('Unsupported Nursery signal kind: '+String(kind));
 if(kind!=='wtl'){
  if(typeof value!=='string'||!value.length||value.length>256)throw Error('Bounded signal required');
  return Object.freeze({status:'ready',signal:Object.freeze({kind,value,source:'wayglass:nursery-ui'})});
 }
 // Encounter capacity is a transport bound, not a verdict on the expression's meaning.
 if(typeof wtlSource!=='string'||wtlSource.length>256)throw new RangeError('WTL Nursery encounter source exceeds 256-character transport limit');
 const compiled=compileWTL(wtlSource);
 // The source expression, not an invented agent utterance, determines the bloom.
 return Object.freeze({status:'ready',signal:Object.freeze({kind:'wtl',value:wtlSource,source:'wayglass:wtl-derivation'}),compiled});
}
