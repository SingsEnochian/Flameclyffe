import {createWyrdruneRuntime} from './wtl-cell-runtime.js';
import {digestWce1Sync} from './wtl-cell-digest.js';

export const MAX_SHARED_TEXT = 1200;
const runtime = createWyrdruneRuntime({
  hashSource: source => digestWce1Sync({wtl_source: source}),
  continuityDigest: digestWce1Sync,
});

// Give each part of the text a note. WTL determines the scale degree, timing,
// hue and listening bands; the browser plays the returned score.
export async function inscribeSharedText(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_SHARED_TEXT ||
      !text.isWellFormed() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text)) {
    throw new TypeError('Share 1–1200 characters of readable text');
  }
  const points = Array.from(text, character => character.codePointAt(0));
  const parts = [];
  const stride = Math.ceil(points.length / 16);
  for (let i = 0; i < points.length; i += stride) {
    parts.push(points.slice(i, i + stride).reduce((sum, point) => (sum * 31 + point) % 65521, 0));
  }
  const source = `operator note(n, i) = {pitch: pick([220, 247, 262, 294, 330, 349, 392, 440], n + i), beat: 0.16 + n % 4 * 0.04};
operator ear(n, i) = 0.34 + (n + i * 13) % 67 / 100;
mobius scoped {
  perceive { let ᚹ = ${JSON.stringify(text)}; }
  compress { let ᚱ = [${parts.map((part, i) => `note(${part}, ${i})`).join(', ')}]; }
  release { let ᚺ = ${parts.reduce((sum, part) => sum + part, 0)} % 360; }
  verify { require ᚹ != "" else "the inscription has words"; }
  integrate { let ᚾ = [${Array.from({length: 8}, (_, i) => `ear(${parts[i % parts.length]}, ${i})`).join(', ')}]; }
  choose { let ᛟ = {words: ᚹ, hue: ᚺ, score: ᚱ, bands: ᚾ}; }
  return { emit ᛟ; }
  transcend {}
}`;
  const ir = runtime.compile(source);
  const run = await runtime.execute(ir);
  if (run.status !== 'committed' || run.output[0]?.words !== text) {
    throw new Error('Wyrdrune could not return the original words');
  }
  const {hue, score, bands} = run.output[0];
  return {
    schema: 'wayglass.wtl-cell-inscription/v0.1', author: 'owner',
    text, source, hue, score, bands, source_hash: ir.sourceHash,
    text_digest: digestWce1Sync(points),
    phases: run.receipts.map(receipt => receipt.phase),
  };
}

/** Play the exact notes returned by the inscription, on the room's audio output. */
export function playInscription(context, score, volume, onEnd) {
  let start = context.currentTime + 0.02;
  const gain = context.createGain();
  gain.gain.value = volume;
  gain.connect(context.destination);
  const notes = score.map(({pitch, beat}) => {
    const note = context.createOscillator();
    const envelope = context.createGain();
    note.type = 'sine';
    note.frequency.value = pitch;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(0.2, start + 0.02);
    envelope.gain.linearRampToValueAtTime(0, start + beat * 0.92);
    note.connect(envelope).connect(gain);
    note.start(start);
    start += beat;
    note.stop(start);
    return note;
  });
  notes.at(-1).onended = onEnd;
  return () => {
    notes.at(-1).onended = null;
    for (const note of notes) note.stop();
    gain.disconnect();
  };
}
