/**
 * AR ingress and emergency-stop primitives. These do not open a camera or
 * WebXR session. A future AR adapter attaches only after user permission.
 * Browser-owned WebXR camera release is requested via XRSession.end();
 * independently obtained MediaStream tracks are stopped explicitly.
 */
export const WAYGLASS_AR_FEATHER_EVENT = 'hearthgate:feather-stop';
const MAX_OVERLAY_TEXT = 3000;

export function renderArOverlayText(node, text) {
  if (!node || !('textContent' in node)) throw new TypeError('An AR text node is required.');
  // No HTML interpretation, event handlers, raw model markup, or unsanitised
  // DOM subtree creation over a live camera view.
  node.textContent = String(text ?? '').slice(0, MAX_OVERLAY_TEXT);
  return node;
}

export function createArFeatherStop({ events = globalThis, report = () => {} } = {}) {
  if (!events || typeof events.addEventListener !== 'function'
    || typeof events.removeEventListener !== 'function') {
    throw new TypeError('AR stop requires an event target.');
  }
  let attached = null;
  let stopping = null;
  let destroyed = false;

  function attach({ session = null, cameraStream = null } = {}) {
    if (destroyed || attached || stopping) throw new Error('AR stop is not available for another session.');
    if (!session?.end && !cameraStream?.getTracks) throw new TypeError('Attach an XR session or camera stream.');
    attached = { session, cameraStream };
    return true;
  }

  async function stop() {
    if (stopping) return stopping;
    if (!attached) return { stopped: false, reason: 'no-active-ar-session' };
    const { session, cameraStream } = attached;
    attached = null;

    // The camera tracks stop synchronously before any await. Even if the XR
    // session rejects end(), an independent capture stream is not left alive.
    const errors = [];
    let tracksStopped = 0;
    for (const track of cameraStream?.getTracks?.() || []) {
      try { track.stop(); tracksStopped++; }
      catch { errors.push('media-track-stop-failed'); }
    }
    stopping = (async () => {
      let xrEnded = !session;
      if (session) {
        try { await session.end(); xrEnded = true; }
        catch { errors.push('xr-session-end-failed'); }
      }
      const result = Object.freeze({
        stopped: errors.length === 0,
        xr_end_requested: Boolean(session),
        xr_end_resolved: xrEnded,
        camera_tracks_stopped: tracksStopped,
        errors: Object.freeze([...errors]),
      });
      report(result);
      return result;
    })();
    try { return await stopping; }
    finally { stopping = null; }
  }

  const onFeather = () => { void stop().catch(() => {}); };
  events.addEventListener(WAYGLASS_AR_FEATHER_EVENT, onFeather);
  return Object.freeze({
    attach,
    stop,
    get active() { return Boolean(attached || stopping); },
    destroy() {
      events.removeEventListener(WAYGLASS_AR_FEATHER_EVENT, onFeather);
      destroyed = true;
      return stop();
    },
  });
}
