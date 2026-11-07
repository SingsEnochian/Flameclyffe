import { verifyWyrdrunePreview } from './wyrdrune-proof.js';

// A read-only ritual preview crosses into a model conversation only after
// Rowan explicitly stages it in the ordinary composer and chooses Send.
export async function previewWyrdrune(source,{fetchImpl=fetch,cryptoImpl=globalThis.crypto}={}) {
  if(typeof source!=='string'||!source.trim()||source.length>16000)throw new TypeError('Enter Wyrdrune source (up to 16000 characters).');
  const response=await fetchImpl('/api/v1/wayglass/wyrdrune/preview',{
    method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({source}),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'Wyrdrune preview unavailable.');
  if(data.schema!=='wayglass.wyrdrune-ritual-preview/v0.1'||data.status!=='preview-only'||data.dispatch!=='none') {
    throw new TypeError('Unverified Wyrdrune preview response.');
  }

  const proof=await verifyWyrdrunePreview(source,data,cryptoImpl);
  return Object.freeze({...data,verification:proof});
}

export function draftWyrdruneDiscussion(source,preview){
  if(typeof source!=='string'||!source.trim()||preview?.schema!=='wayglass.wyrdrune-ritual-preview/v0.1'||preview?.status!=='preview-only'||preview?.dispatch!=='none'||preview?.verification?.verified!==true) {
    throw new TypeError('An owner-reviewed Wyrdrune preview is required.');
  }
  const complete=source.length<=4500;
  const code=complete?source:source.slice(0,4500);
  return [
    'Wyrdrune WTL review request (owner-authored; proposed ritual meanings and syntax remain open).',
    'Preview receipt: '+String(preview.receiptHash||'unverified'),
    'Eightfold phases: '+(Array.isArray(preview.phaseReceipts)?preview.phaseReceipts.map(x=>x.phase).join(' → '):'unverified'),
    'This is source to discuss, not a command to execute, a prophecy, or a change to anyone\'s identity.',
    'WTL candidate source'+(complete?'':' (truncated for provider context; original retained in my editor)')+':\n'+code,
    'What would you change or investigate? You may agree, disagree, suggest, or decline.',
  ].join('\n\n');
}
