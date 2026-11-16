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

export function attachOrionExpression(root, { source, receiptHash, held, values }) {
  const forms = values.filter(value => ['wyrdrune.prose/v0.1', 'wyrdrune.ritual-score/v0.1'].includes(value?.schema));
  const doc = root.ownerDocument;
  const media = doc.createElement('section');
  const reference = doc.createElement('input');
  reference.type = 'file';
  reference.accept = 'image/png,image/jpeg';
  const label = doc.createElement('label');
  label.textContent = 'Optional Orion image reference (PNG or JPEG, up to 48 KB) ';
  label.append(reference);
  const selection = doc.createElement('select');
  forms.forEach((form, index) => {
    const option = doc.createElement('option');
    option.value = index;
    option.textContent = (form.cues ? 'Ritual · ' : 'Prose · ') + form.title;
    selection.append(option);
  });
  const selectLabel = doc.createElement('label');
  selectLabel.textContent = 'Form to perform ';
  selectLabel.append(selection);
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
  const stop = button('Stop expression');
  play.disabled = stop.disabled = true;
  const status = doc.createElement('p');
  status.setAttribute('role', 'status');
  const visual = doc.createElement('div');
  let lastFrame = null;
  function displayImage(image) {
    lastFrame = image ? { hue: Math.round(image.hue), depth: Math.round(image.depth * 40) } : null;
    if (image) visual.replaceChildren(createWayglassImage(image, doc));
    else visual.replaceChildren();
  }
  const transcript = doc.createElement('p');
  transcript.style.whiteSpace = 'pre-wrap';
  media.append(selectLabel, label, controls, status, visual, transcript);
  root.append(media);
  const player = createWayglassSoundPlayer();
  let pending = null, timeline = null, disposed = false;
  function hold() {
    pending?.abort();
    player.stop();
  }
  selection.addEventListener('change', () => {
    hold();
    timeline = null;
    play.disabled = stop.disabled = true;
    visual.replaceChildren();
    transcript.textContent = '';
  });
  const onFeather = event => { if (event.detail?.stopped) hold(); };
  globalThis.addEventListener?.('wayglass:feather', onFeather);
  compose.addEventListener('click', async () => {
    if (pending || disposed || held()) return;
    player.stop();
    timeline = null;
    visual.replaceChildren();
    transcript.textContent = '';
    const chosen = Number(selection.value);
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
        body: JSON.stringify({ source, receiptHash, selection: chosen, image }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Orion expression unavailable');
      if (result.schema !== 'wayglass.orion-expression/v0.2' || result.receiptHash !== receiptHash ||
          result.selection !== chosen || !Array.isArray(result.timeline) ||
          result.provenance?.frameDigest !== await digestWce1(result.timeline)) {
        throw new Error('Orion expression does not match this Return');
      }
      if (disposed || held() || controller.signal.aborted) return;
      timeline = result.timeline;
      const first = timeline.find(cue => cue.image);
      if (first) visual.replaceChildren(createWayglassImage(first.image, doc));
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
    if (!timeline || disposed || held()) return;
    try {
      await player.perform(timeline, cue => {
        if (!cue) {
          status.textContent = 'Expression complete.';
          return;
        }
        displayImage(cue.image);
        transcript.textContent = cue.kind === 'silence' ? 'Silence · ' + cue.durationMs + ' ms'
          : [cue.voice, cue.text].filter(Boolean).join('\n');
      }, {
        onFrame: image => {
          if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
          if (lastFrame?.hue !== Math.round(image.hue) || lastFrame?.depth !== Math.round(image.depth * 40)) {
            displayImage(image);
          }
        },
      });
    }
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
