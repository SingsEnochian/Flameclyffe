// Consent-bound WTL-to-Nursery signal adapter. No persistence, inference or side effects.
import {compileWTL} from './wtl-transform-frontend.mjs';
export function prepareNurserySignal({kind,value,wtlSource,consent,participants=['nursery:a','nursery:b']}){
 if(!Array.isArray(participants)||participants.length!==2||participants[0]===participants[1]||
    !participants.every(id=>typeof id==='string'&&/^[\\w.:-]{1,128}$/.test(id)))throw Error('Distinct participants required');
 if(!consent||!participants.every(id=>consent[id]===true))return Object.freeze({status:'declined'});
 if(!['touch','word','sound','wtl'].includes(kind))throw Error('Unknown signal kind');
 if(kind!=='wtl'){
  if(typeof value!=='string'||!value.length||value.length>256)throw Error('Bounded signal required');
  return Object.freeze({status:'ready',signal:Object.freeze({kind,value,source:'wayglass:nursery-ui'})});
 }
 const compiled=compileWTL(wtlSource);
 // The source expression, not an invented agent utterance, determines the bloom.
 if(typeof wtlSource!=='string'||wtlSource.length>256)throw Error('WTL signal exceeds encounter limit');
 return Object.freeze({status:'ready',signal:Object.freeze({kind:'wtl',value:wtlSource,source:'wayglass:wtl-derivation'}),compiled});
}
