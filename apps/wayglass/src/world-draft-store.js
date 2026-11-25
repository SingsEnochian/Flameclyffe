// Explicit local draft custody. Not cloud persistence, canon, or a verified Return.
export const WORLD_DRAFT_KEY='wayglass.world-deck.draft/v1';
export function createWayglassWorldDraftStore({storage=globalThis.localStorage,key=WORLD_DRAFT_KEY}={}){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new Error('Local world draft storage unavailable');
 function read(){const raw=storage.getItem(key);if(raw===null)return null;if(raw.length>35000)throw new RangeError('Stored world draft too large');let value;try{value=JSON.parse(raw);}catch{throw new TypeError('Stored world draft unreadable; original preserved');}
 if(value?.schema!==WORLD_DRAFT_KEY||typeof value.title!=='string'||typeof value.notes!=='string'||value.title.length>120||value.notes.length>16000||typeof value.saved_at!=='string')throw new TypeError('Unrecognised world draft; original preserved');
 return Object.freeze({schema:WORLD_DRAFT_KEY,title:value.title,notes:value.notes,saved_at:value.saved_at});
 }
 function save({title,notes}){if(typeof title!=='string'||!title.trim()||title.length>120||typeof notes!=='string'||notes.length>16000)throw new TypeError('World title or notes invalid');
 const record={schema:WORLD_DRAFT_KEY,title,notes,saved_at:new Date().toISOString()};storage.setItem(key,JSON.stringify(record));return Object.freeze(record);}
 return Object.freeze({read,save});
}
