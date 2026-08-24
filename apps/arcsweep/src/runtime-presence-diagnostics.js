import { MODEL_PRESENCE_EVENT, currentModelPresence } from './model-presence-bus.js';

export const MODEL_PRESENCE_STALE_AFTER_MS = 90_000;

function text(value) { return String(value ?? '').trim(); }

export function diagnoseModelPresence(record, now = Date.now(), staleAfterMs = MODEL_PRESENCE_STALE_AFTER_MS) {
  const observed = Date.parse(record?.observed_at || '');
  const ageMs = Number.isFinite(observed) ? Math.max(0, now - observed) : null;
  const stale = ageMs == null || ageMs > staleAfterMs;
  const state = text(record?.state).toLowerCase() || 'offline';
  const routeMismatch = Boolean(record?.route && record?.voice_id && !text(record.route).toLowerCase().includes(text(record.voice_id).toLowerCase()));
  const providerMissing = ['ready', 'thinking', 'speaking'].includes(state) && !text(record?.provider);
  const modelMissing = ['ready', 'thinking', 'speaking'].includes(state) && !text(record?.model);
  const severity = state === 'error' ? 'error'
    : state === 'degraded' || routeMismatch || providerMissing || modelMissing ? 'degraded'
      : state === 'offline' ? 'offline'
        : stale ? 'stale'
          : 'ok';
  const reasons = [
    stale ? 'stale observation' : null,
    routeMismatch ? 'route/voice mismatch' : null,
    providerMissing ? 'provider unattested' : null,
    modelMissing ? 'model unattested' : null,
    record?.reason || null,
  ].filter(Boolean);
  return { voiceId: record?.voice_id || null, state, ageMs, stale, routeMismatch, providerMissing, modelMissing, severity, reasons };
}

function ageLabel(ageMs) {
  if (ageMs == null) return 'age unknown';
  if (ageMs < 1000) return 'just now';
  if (ageMs < 60_000) return `${Math.floor(ageMs / 1000)}s ago`;
  return `${Math.floor(ageMs / 60_000)}m ago`;
}

function render(doc, now = Date.now()) {
  for (const record of currentModelPresence()) {
    const row = doc.querySelector(`[data-model-presence-voice="${record.voice_id}"]`);
    if (!row) continue;
    const diagnostic = diagnoseModelPresence(record, now);
    row.dataset.diagnostic = diagnostic.severity;
    let node = row.querySelector('[data-model-presence-diagnostic]');
    if (!node) {
      node = doc.createElement('small');
      node.dataset.modelPresenceDiagnostic = 'true';
      row.append(node);
    }
    node.textContent = [ageLabel(diagnostic.ageMs), ...diagnostic.reasons].join(' · ');
  }
}

export function installRuntimePresenceDiagnostics(doc = globalThis.document) {
  if (!doc?.addEventListener) return;
  const rerender = () => render(doc);
  doc.addEventListener(MODEL_PRESENCE_EVENT, rerender);
  const timer = globalThis.setInterval?.(rerender, 15_000);
  render(doc);
  return () => globalThis.clearInterval?.(timer);
}

if (typeof document !== 'undefined') installRuntimePresenceDiagnostics(document);
