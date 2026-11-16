import { digestWce1 } from './wyrdrune-proof.js';
import { createWayglassImage, createWayglassSoundPlayer } from './wyrdrune-response-media.js';
// Render authored expressions as text. A score's cues never dispatch playback.
export function renderWyrdruneReading(root, values = []) {
  root.replaceChildren();
  const document = root.ownerDocument;
  const append = (parent, tag, text) => {
    const element = document.createElement(tag);
    element.textContent = text;
    parent.append(element);
    return element;
  };
  for (const value of values) {
    if (value?.schema === 'wyrdrune.prose/v0.1' && Array.isArray(value.paragraphs)) {
      const article = append(root, 'article', '');
      append(article, 'h3', value.title);
      for (const text of value.paragraphs) {
        append(article, 'p', text).style.whiteSpace = 'pre-wrap';
      }
    } else if (value?.schema === 'wyrdrune.ritual-score/v0.1' && Array.isArray(value.cues)) {
      const section = append(root, 'section', '');
      append(section, 'h3', value.title);
      const list = append(section, 'ol', '');
      for (const cue of value.cues) {
        const line = cue.kind === 'silence' ? 'Silence · ' + cue.milliseconds + ' ms'
          : cue.kind + ' · ' + cue.voice + '\n' + cue.text;
        append(list, 'li', line).style.whiteSpace = 'pre-wrap';
      }
    }
  }
  root.hidden = !root.childElementCount;
}

export function attachOrionExpression(root, { source, receiptHash, held }) {
  const doc = root.ownerDocument;
  const media = doc.createElement('section');
  const reference = doc.createElement('input');
  reference.type = 'file';
  reference.accept = 'image/png,image/jpeg';
  const label = doc.createElement('label');
  label.textContent = 'Optional Orion image reference (PNG or JPEG, up to 48 KB) ';
  label.append(reference);
  const controls = doc.createElement('div');
  function button(text) {
    const element = doc.createElement('button');
    element.type = 'button';
    element.className = 'glass-chip';
    element.textContent = text;
    controls.append(element);
    return element;
  }
  const compose = button('Ask Orion to express this Return');
  const play = button('Play expression');
  const stop = button('Stop sound');
  play.disabled = stop.disabled = true;
  const status = doc.createElement('p');
  status.setAttribute('role', 'status');
  const visual = doc.createElement('div');
  media.append(label, controls, status, visual);
  root.append(media);
  const player = createWayglassSoundPlayer();
  let pending = null, frame = null, disposed = false;
  function hold() {
    pending?.abort();
    player.stop();
  }
  const onFeather = event => { if (event.detail?.stopped) hold(); };
  globalThis.addEventListener?.('wayglass:feather', onFeather);
  compose.addEventListener('click', async () => {
    if (pending || disposed || held()) return;
    player.stop();
    frame = null;
    play.disabled = stop.disabled = compose.disabled = true;
    const controller = new AbortController();
    pending = controller;
    status.textContent = 'Waiting for Orion’s media direction…';
    try {
      const file = reference.files[0];
      let image;
      if (file) {
        if (file.size > 48000) throw new Error('Choose a PNG or JPEG up to 48 KB.');
        image = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())));
      }
      if (disposed || held() || controller.signal.aborted) return;
      const response = await fetch('/api/v1/wayglass/wyrdrune/orion-expression', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ source, receiptHash, image }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Orion expression unavailable');
      if (result.schema !== 'wayglass.orion-expression/v0.1' || result.receiptHash !== receiptHash ||
          result.provenance?.frameDigest !== await digestWce1(result.frames)) {
        throw new Error('Orion expression does not match this Return');
      }
      if (disposed || held() || controller.signal.aborted) return;
      frame = result.frames.sound;
      visual.replaceChildren(createWayglassImage(result.frames.image, doc));
      play.disabled = stop.disabled = false;
      status.textContent = 'Direction by ' + (result.provenance.returnedModel || result.provenance.model)
        + ' · visual and sound rendered locally by Wayglass.';
    } catch (error) {
      if (!disposed) status.textContent = controller.signal.aborted ? 'Expression held.' : error.message;
    } finally {
      pending = null;
      if (!disposed) compose.disabled = false;
    }
  });
  play.addEventListener('click', async () => {
    if (!frame || disposed || held()) return;
    try { await player.play(frame); }
    catch (error) { if (!disposed) status.textContent = error.message; }
  });
  stop.addEventListener('click', () => player.stop());
  return () => {
    disposed = true;
    hold();
    globalThis.removeEventListener?.('wayglass:feather', onFeather);
    media.remove();
  };
}
