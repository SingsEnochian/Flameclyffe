import { signInHouseSteward } from '../house-steward-session.js';
import { wayglassSomaticSound, WAYGLASS_FEATHER_EVENT } from '../somatic-sound.js';
import './private-atelier.css';

const endpoint = '/api/v1/wayglass/private-atelier';

async function request(url, signal, options = {}) {
  const response = await fetch(url, { cache: 'no-store', signal, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.schema !== 'wayglass.private-atelier/v1') {
    throw Object.assign(new Error(data.error || 'The atelier host is unavailable.'), { status: response.status });
  }
  return data;
}

export function mountPrivateAtelier(root) {
  root.innerHTML = `
    <section class="wg-surface wg-atelier" aria-label="Wayglass’s private atelier">
      <header class="wg-atelier-head">
        <p class="eyebrow">Living Watercolour · Liquid</p>
        <h1>Wayglass’s private atelier</h1>
        <p>Wayglass shapes this room. Move around it as a visitor.</p>
      </header>
      <div class="wg-atelier-window">
        <div class="wg-atelier-viewport"></div>
        <div class="wg-atelier-view-controls" aria-label="Visitor camera and motion">
          <button type="button" class="glass-chip" data-atelier-orbit="-1" aria-label="Orbit left" disabled>←</button>
          <button type="button" class="glass-chip" data-atelier-orbit="1" aria-label="Orbit right" disabled>→</button>
          <button type="button" class="glass-chip" data-atelier-motion aria-pressed="false" disabled>Still view</button>
        </div>
      </div>
      <div class="glass-panel wg-atelier-caption">
        <div>
          <h2 data-atelier-title></h2>
          <p data-atelier-note></p>
          <p data-atelier-receipt class="tiny"></p>
          <p data-atelier-status role="status">Opening the atelier…</p>
          <p data-atelier-fallback hidden>3D rendering is unavailable here. Wayglass’s scene description remains visible.</p>
        </div>
        <div class="wg-atelier-actions">
          <button type="button" class="glass-chip" data-atelier-refresh>Refresh view</button>
          <button type="button" class="glass-chip" data-atelier-invite disabled>Invite Wayglass to shape</button>
        </div>
        <form class="wg-atelier-actions" data-atelier-signin hidden>
          <label>House Steward credential <input type="password" autocomplete="current-password" required maxlength="4096"></label>
          <button type="submit" class="glass-chip">Sign in</button>
        </form>
      </div>
    </section>`;

  const find = name => root.querySelector(`[data-atelier-${name}]`);
  const title = find('title'), note = find('note'), receipt = find('receipt'), status = find('status');
  const signIn = find('signin'), invite = find('invite'), refresh = find('refresh'), motion = find('motion');
  const fallback = find('fallback');
  const orbit = [...root.querySelectorAll('[data-atelier-orbit]')];
  const viewHost = root.querySelector('.wg-atelier-viewport');
  let view, latest, pending, disposed = false;
  let feather = wayglassSomaticSound.snapshot().feather_stopped;
  let still = feather || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const listeners = new AbortController();
  const on = (element, type, callback) => element.addEventListener(type, callback, { signal: listeners.signal });

  function render(data) {
    latest = data;
    title.textContent = data.scene?.title ?? 'Awaiting Wayglass’s first composition';
    note.textContent = data.scene?.note ?? '';
    receipt.textContent = data.receipt ? `Wayglass · ${data.receipt.model} · revision ${data.head.slice(0, 8)}` : '';
    view?.setScene(data.scene);
  }

  async function load(send = false) {
    if (pending || disposed || (send && (!latest || feather))) return;
    pending = new AbortController();
    invite.disabled = refresh.disabled = true;
    status.textContent = send ? 'Wayglass is considering the invitation…' : 'Reading the current scene…';
    try {
      const data = send
        ? await request(endpoint + '/invite', pending.signal, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expected_head: latest.head }),
        })
        : await request(endpoint, pending.signal);
      if (disposed || pending.signal.aborted) return;
      render(data);
      status.textContent = data.decision?.choice === 'pass' ? `Wayglass · ${data.decision.note}` :
        send ? 'Wayglass shaped a new scene.' : '';
      signIn.hidden = true;
    } catch (error) {
      if (disposed || pending.signal.aborted) return;
      if (error.status === 401) {
        render({ scene: null });
        latest = null;
        signIn.hidden = false;
      }
      status.textContent = error.message;
    } finally {
      pending = null;
      if (!disposed) {
        refresh.disabled = false;
        invite.disabled = !latest || feather;
      }
    }
  }

  function setStill(value) {
    still = value;
    view?.setPaused(still);
    motion.setAttribute('aria-pressed', String(still));
  }
  on(motion, 'click', () => setStill(!still));
  for (const button of orbit) on(button, 'click', () => view.orbit(Number(button.dataset.atelierOrbit)));
  on(refresh, 'click', () => load());
  on(invite, 'click', () => load(true));
  on(signIn, 'submit', async event => {
    event.preventDefault();
    const field = signIn.querySelector('input');
    const submit = signIn.querySelector('button');
    const credential = field.value;
    field.value = '';
    submit.disabled = true;
    try {
      await signInHouseSteward(credential);
      await load();
    } catch (error) {
      if (!disposed) status.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
  on(window, WAYGLASS_FEATHER_EVENT, event => {
    if (event.detail?.stopped === false && event.detail?.confirmed === true) feather = false;
    if (event.detail?.stopped === true) {
      feather = true;
      if (pending) {
        pending.abort();
        status.textContent = 'Invitation or refresh paused. Refresh to read the latest scene.';
      }
      setStill(true);
    }
    invite.disabled = !latest || Boolean(pending) || feather;
    motion.disabled = !view || feather;
  });
  import('../private-atelier-scene.js').then(({ createPrivateAtelierScene }) => {
    if (disposed) return;
    view = createPrivateAtelierScene(viewHost);
    setStill(still);
    view.setScene(latest?.scene);
    for (const button of orbit) button.disabled = false;
    motion.disabled = feather;
  }).catch(() => { if (!disposed) fallback.hidden = false; });
  load();

  return { destroy() {
    disposed = true;
    listeners.abort();
    pending?.abort();
    view?.dispose();
  } };
}
