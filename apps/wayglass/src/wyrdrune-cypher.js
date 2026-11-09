// Wyrdrune cypher: her Wyrdrune decodes, line by line and phase by phase, through runes
// into English. The English is the deterministic gloss of the compiled programme
// (lib/wyrdrune/gloss.mjs), so the animation reveals what the code does; it is not a
// model's paraphrase. Compiling here never executes anything or contacts the host.
import { morphFrame } from './wyrdrune-morph.js';
import { glossProgram } from '../../../lib/wyrdrune/gloss.mjs';
import { createWyrdruneRuntime } from '../../../lib/wyrdrune/runtime.mjs';
import { WAYGLASS_FEATHER_EVENT } from './somatic-sound.js';

// Compile-only runtime: the gloss needs the IR, never an execution or a source receipt.
const reader = createWyrdruneRuntime({ hashSource: () => 'local-gloss-only' });

/** Her Wyrdrune → the English gloss (throws a SyntaxError if the source does not compile). */
export function readWyrdrune(source) {
  return glossProgram(reader.compile(String(source ?? '')));
}

/**
 * Animate the translation into `container`. Lines decode in sequence: canonical WTL,
 * then cypher runes, then en-GB. Reduced motion and Feather show the English at once.
 * Returns { gloss, stop(), done } where `done` resolves when every line is English.
 */
export function animateWyrdruneCypher(container, { source, reducedMotion = false, scope = globalThis,
  doc = globalThis.document, frameMs = 36, steps = 16, overlap = 0.45 } = {}) {
  if (!container || !doc) throw new TypeError('A display and document are required.');
  const gloss = readWyrdrune(source);
  const el = (tag, cls, text) => { const n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const lines = [];
  container.replaceChildren();
  const head = el('p', 'wg-cypher-note tiny', 'Read from the code itself · no model · ' + gloss.interpretation);
  container.append(head);
  for (const o of gloss.operators) {
    const row = el('p', 'wg-cypher-line', o.wtl); row.setAttribute('lang', 'zxx'); container.append(row);
    lines.push({ node: row, from: o.wtl, to: o.english });
  }
  for (const unit of gloss.units) {
    container.append(el('p', 'wg-cypher-unit', unit.title));
    for (const phase of unit.phases) {
      const block = el('div', 'wg-cypher-phase');
      block.setAttribute('data-phase', phase.phase);
      block.append(el('span', 'wg-cypher-phase-name', phase.phase[0].toUpperCase() + phase.phase.slice(1) + ' · ' + phase.meaning));
      for (const line of phase.lines) {
        const row = el('p', 'wg-cypher-line' + (line.still ? ' wg-cypher-still' : ''), line.wtl || '·');
        row.setAttribute('lang', 'zxx');
        row.setAttribute('title', line.wtl || 'empty phase');
        block.append(row);
        lines.push({ node: row, from: line.wtl || '·', to: line.english });
      }
      container.append(block);
    }
  }
  let stopped = false, finished = false, resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const timers = new Set();
  const settle = item => { item.node.textContent = item.to; item.node.setAttribute('lang', 'en-GB'); item.settled = true; };
  const finishAll = () => {
    if (finished) return; finished = true;
    for (const t of timers) scope.clearTimeout?.(t); timers.clear();
    for (const item of lines) if (!item.settled) settle(item);
    scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT, onFeather);
    resolveDone(gloss);
  };
  const onFeather = event => { if (event?.detail?.stopped === true) { stopped = true; finishAll(); } };
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT, onFeather);
  if (reducedMotion || !lines.length) { finishAll(); return { gloss, stop: finishAll, done }; }

  let remaining = lines.length;
  const later = (fn, ms) => { const t = scope.setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
  lines.forEach((item, i) => {
    let frame = 0;
    const tick = () => {
      if (stopped || finished) return;
      frame += 1;
      if (frame >= steps) { settle(item); if (--remaining === 0) finishAll(); return; }
      item.node.textContent = morphFrame(item.from, item.to, frame / steps);
      later(tick, frameMs);
    };
    later(tick, Math.round(i * steps * frameMs * (1 - overlap)));
  });
  return { gloss, stop: () => { stopped = true; finishAll(); }, done };
}
