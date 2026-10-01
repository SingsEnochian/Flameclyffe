import { GESTURE_STATE_SCHEMA } from './gesture-somatic-feedback.js';

export const GESTURE_VISUAL_FEEDBACK_EVENT = 'arcsweep:gesture-visual-feedback';

const VISUAL_STATES = new Set([
  'quiet', 'aware', 'targeted', 'armed', 'captured', 'moving', 'committing', 'settling', 'unavailable', 'tracking-lost', 'cancelled', 'release',
]);

function makeEvent(type, detail) {
  if (typeof CustomEvent === 'function') return new CustomEvent(type, { detail });
  return { type, detail };
}

function ensureStyle(doc) {
  if (!doc?.head || doc.querySelector?.('style[data-astra-gesture-glass-style]')) return;
  const style = doc.createElement('style');
  style.dataset.astraGestureGlassStyle = 'true';
  style.textContent = `
    [data-ar-surface="glass"][data-ar-target-id] {
      position: relative;
      isolation: isolate;
      --ar-rim-alpha: 0%;
      --ar-glow-alpha: 0%;
      --ar-lift: 0px;
      --ar-scale: 1;
      transition:
        outline-color 120ms ease,
        box-shadow 160ms ease,
        filter 160ms ease,
        transform 180ms cubic-bezier(.2,.8,.2,1);
      transform: translate3d(0,var(--ar-lift),0) scale(var(--ar-scale));
      outline: 1px solid color-mix(in srgb,var(--glass-rim,var(--line,#84A29A)) var(--ar-rim-alpha),transparent);
      outline-offset: 2px;
    }

    [data-ar-surface="glass"][data-ar-state="aware"] {
      --ar-rim-alpha: 22%;
      --ar-glow-alpha: 8%;
      box-shadow: 0 0 18px color-mix(in srgb,var(--glass-glow,var(--gold,#84A29A)) var(--ar-glow-alpha),transparent);
    }

    [data-ar-surface="glass"][data-ar-state="targeted"] {
      --ar-rim-alpha: 48%;
      --ar-glow-alpha: 14%;
      box-shadow: 0 0 24px color-mix(in srgb,var(--glass-glow,var(--gold,#84A29A)) var(--ar-glow-alpha),transparent);
    }

    [data-ar-surface="glass"][data-ar-state="armed"] {
      --ar-rim-alpha: 68%;
      --ar-glow-alpha: 18%;
      --ar-lift: -1px;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb,#fff 12%,transparent),
        0 0 30px color-mix(in srgb,var(--glass-glow,var(--gold,#84A29A)) var(--ar-glow-alpha),transparent);
    }

    [data-ar-surface="glass"][data-ar-state="captured"] {
      --ar-rim-alpha: 82%;
      --ar-glow-alpha: 22%;
      --ar-lift: -2px;
      --ar-scale: 1.008;
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb,var(--glass-rim,var(--line,#84A29A)) 24%,transparent),
        0 10px 34px color-mix(in srgb,var(--glass-shadow,#000) 28%,transparent),
        0 0 34px color-mix(in srgb,var(--glass-glow,var(--gold,#84A29A)) var(--ar-glow-alpha),transparent);
    }

    [data-ar-surface="glass"][data-ar-state="moving"] {
      --ar-rim-alpha: 72%;
      --ar-glow-alpha: 12%;
      will-change: transform;
    }

    [data-ar-surface="glass"][data-ar-state="committing"] {
      --ar-rim-alpha: 88%;
      --ar-glow-alpha: 26%;
      box-shadow:
        inset 0 1px 0 color-mix(in srgb,#fff 14%,transparent),
        0 0 40px color-mix(in srgb,var(--glass-glow,var(--gold,#84A29A)) var(--ar-glow-alpha),transparent);
    }

    [data-ar-surface="glass"][data-ar-state="settling"] {
      --ar-rim-alpha: 36%;
      --ar-glow-alpha: 8%;
    }

    [data-ar-surface="glass"][data-ar-state="unavailable"] {
      --ar-rim-alpha: 44%;
      filter: saturate(.68) brightness(.84);
      outline-style: dashed;
    }

    [data-ar-surface="glass"][data-ar-state="tracking-lost"] {
      --ar-rim-alpha: 58%;
      --ar-glow-alpha: 6%;
      filter: saturate(.55) brightness(.78);
      outline-style: dotted;
    }

    [data-ar-surface="glass"][data-ar-state="cancelled"],
    [data-ar-surface="glass"][data-ar-state="release"] {
      --ar-rim-alpha: 26%;
      --ar-glow-alpha: 4%;
    }

    @media (prefers-reduced-motion: reduce) {
      [data-ar-surface="glass"][data-ar-target-id] {
        transition: outline-color 80ms linear, box-shadow 80ms linear, filter 80ms linear;
        transform: none !important;
      }
    }

    @media (prefers-reduced-transparency: reduce) {
      [data-ar-surface="glass"][data-ar-target-id] {
        box-shadow: none !important;
      }
    }
  `;
  doc.head.append(style);
}

function findTarget(doc, targetId) {
  if (!doc?.querySelectorAll || !targetId) return null;
  return [...doc.querySelectorAll('[data-ar-target-id]')].find((node) => node.dataset?.arTargetId === targetId) || null;
}

export function createGestureGlassFeedback({ eventTarget = globalThis, doc = globalThis.document } = {}) {
  ensureStyle(doc);
  let destroyed = false;
  let activeTarget = null;

  function clearTarget(target = activeTarget) {
    if (!target) return;
    delete target.dataset.arState;
    delete target.dataset.arGesture;
    delete target.dataset.arConfidence;
    if (target === activeTarget) activeTarget = null;
  }

  function handle(detail) {
    if (destroyed || !detail || detail.schema !== GESTURE_STATE_SCHEMA) return null;
    const state = String(detail.state || detail.phase || '').trim().toLowerCase();
    if (!VISUAL_STATES.has(state)) return null;
    const targetId = detail.target_id == null ? null : String(detail.target_id);

    if (state === 'quiet' || !targetId) {
      clearTarget();
      return Object.freeze({ state, target_id: targetId, applied: false });
    }

    const target = findTarget(doc, targetId);
    if (!target) return Object.freeze({ state, target_id: targetId, applied: false });
    if (activeTarget && activeTarget !== target) clearTarget(activeTarget);

    activeTarget = target;
    target.dataset.arState = state;
    target.dataset.arGesture = String(detail.gesture || 'unknown');
    target.dataset.arConfidence = String(Math.max(0, Math.min(1, Number(detail.confidence) || 0)));

    const result = Object.freeze({
      schema: 'arcsweep.gesture-visual-feedback/v1',
      event_id: String(detail.event_id || ''),
      state,
      target_id: targetId,
      gesture: target.dataset.arGesture,
      applied: true,
    });
    eventTarget?.dispatchEvent?.(makeEvent(GESTURE_VISUAL_FEEDBACK_EVENT, result));
    return result;
  }

  const listener = (event) => { handle(event?.detail); };
  eventTarget?.addEventListener?.('arcsweep:gesture-state', listener);

  return Object.freeze({
    schema: 'arcsweep.gesture-glass-feedback/v1',
    handle,
    clear: () => clearTarget(),
    status: () => Object.freeze({
      destroyed,
      active_target_id: activeTarget?.dataset?.arTargetId || null,
      active_state: activeTarget?.dataset?.arState || null,
    }),
    destroy() {
      destroyed = true;
      clearTarget();
      eventTarget?.removeEventListener?.('arcsweep:gesture-state', listener);
    },
  });
}
