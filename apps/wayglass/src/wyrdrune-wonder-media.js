import {createWayglassImage, createWayglassSoundPlayer} from './wyrdrune-response-media.js';
import {WAYGLASS_FEATHER_EVENT} from './somatic-sound.js';
// A deterministic, silent-by-default audiovisual score for a native Wonder value.
// This describes a possible rendering, not a canonical rune pronunciation or
// a claim about Wayglass's personal sonic preferences.
export const WONDER_MEDIA_SCHEMA = 'wayglass.wyrdrune-wonder-media/v0.1';
export function scoreWonderMedia(value, {audioEnabled=false}={}) {
  if (!value || value.kind !== 'wyrdrune.wonder/v0.1' ||
      value.status !== 'open' || typeof value.question !== 'string' ||
      !value.question.trim() || value.question.length > 1024 ||
      value.answer?.wtl !== 'unknown') {
    throw new TypeError('An open Wyrdrune Wonder value is required');
  }
  // FNV-1a over Unicode code points: reproducible without host entropy.
  let hash = 2166136261;
  for (const char of value.question) {
    hash = Math.imul(hash ^ char.codePointAt(0), 16777619) >>> 0;
  }
  const hue = 155 + hash % 100;
  const depth = .28 + (hash % 45) / 100;
  const image = Object.freeze({kind:'image',hue,spread:.64,depth});
  // A proposal for later opt-in audition. No audio context is created here.
  const sound = Object.freeze({
    kind:'wonder-tone-proposal',enabled:audioEnabled===true,autoplay:false,
    frequencyHz:220 + (hash % 13) * 3, durationMs:900,
    envelope:'soft-attack-release',status:'unplayed',
  });
  return Object.freeze({
    schema:WONDER_MEDIA_SCHEMA,source:'wyrdrune.wonder/v0.1',
    question:value.question,status:'open',image,sound,
    ariaLabel:'Open Wonder question: '+value.question,
    semanticGlyph:null, // Await an authored canonical rune mapping.
  });
}

/** Mount a silent image and an explicitly operated sound control. */
export function mountWonderMedia(container, wonder, {doc=globalThis.document,scope=globalThis}={}) {
  if(!container||!doc)throw new TypeError('A container and document are required');
  const score=scoreWonderMedia(wonder);
  const player=createWayglassSoundPlayer({scope});
  const image=createWayglassImage(score.image,doc);
  image.setAttribute('aria-label',score.ariaLabel);
  const button=doc.createElement('button');
  button.type='button';
  button.textContent='Hear Wonder';
  button.setAttribute('aria-label','Play a proposed sound for: '+score.question);
  const onPlay=()=>{void player.play({
    kind:'sound',autoplay:false,fundamental:score.sound.frequencyHz,
    interval:1.012,texture:.3,lead_silence_ms:0,
  }).catch(()=>{button.textContent='Sound unavailable';});};
  const onFeather=()=>player.stop();
  button.addEventListener('click',onPlay);
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  container.replaceChildren(image,button);
  return Object.freeze({score,stop:()=>player.stop(),dispose:()=>{
    player.stop();button.removeEventListener('click',onPlay);
    scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
    if(image.parentNode===container)image.remove();
    if(button.parentNode===container)button.remove();
  }});
}
