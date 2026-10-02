const root = document.createElement('div');
root.id = 'crew-connection-doctor';
root.innerHTML = `
  <button class="crew-link-launch" type="button" aria-haspopup="dialog" aria-controls="crew-link-panel">⌁ <span>Crew Link</span></button>
  <section id="crew-link-panel" class="crew-link-panel" role="dialog" aria-label="Crew connection doctor" aria-hidden="true">
    <header><div><small>Connection doctor</small><strong>Crew Link</strong></div><button type="button" data-crew-close aria-label="Close connection doctor">×</button></header>
    <div class="crew-link-body"></div>
  </section>`;
document.body.append(root);

let open = false;
let checking = false;
let lastCheck = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function groupState(state = '') {
  if (['ready', 'fallback-ready', 'thinking', 'speaking'].includes(state)) return 'live';
  if (['configured', 'unknown', 'waking'].includes(state)) return 'configured';
  if (['unauthorised', 'credential-missing', 'configuration-missing', 'model-not-pulled', 'model-unavailable'].includes(state)) return 'blocked';
  if (['runtime-unreachable', 'runtime-mismatch', 'route-error', 'provider-error', 'offline', 'degraded', 'error'].includes(state)) return 'fault';
  return 'unknown';
}

function summarise(snapshot = []) {
  const routed = snapshot.filter((item) => item.route || item.statusEndpoint);
  const groups = { live: 0, configured: 0, blocked: 0, fault: 0, unknown: 0 };
  for (const item of routed) groups[groupState(item.state)] = (groups[groupState(item.state)] || 0) + 1;
  return { routed, groups };
}

function row(label, state, detail = '') {
  return `<div class="crew-link-row" data-state="${esc(groupState(state))}">
    <span><strong>${esc(label)}</strong><small>${esc(detail || state || 'unknown')}</small></span>
    <b>${esc(state || 'unknown')}</b>
  </div>`;
}

function render() {
  const panel = root.querySelector('.crew-link-panel');
  panel.classList.toggle('is-open', open);
  panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  const body = root.querySelector('.crew-link-body');

  const chat = globalThis.HouseChatConnection?.state || { state: navigator.onLine ? 'unknown' : 'offline', detail: navigator.onLine ? 'not checked yet' : 'browser offline' };
  const snapshot = globalThis.HouseWorkspaceRuntime?.snapshot?.() || [];
  const { routed, groups } = summarise(snapshot);
  const failures = routed.filter((item) => ['blocked', 'fault'].includes(groupState(item.state)));

  body.innerHTML = `
    <section class="crew-link-summary">
      <div><span>Browser</span><strong>${navigator.onLine ? 'online' : 'offline'}</strong></div>
      <div><span>House door</span><strong>${esc(chat.state)}</strong></div>
      <div><span>Live voices</span><strong>${groups.live}/${routed.length || '—'}</strong></div>
      <div><span>Needs attention</span><strong>${groups.blocked + groups.fault}</strong></div>
    </section>
    <div class="crew-link-actions"><button type="button" class="primary" data-crew-check ${checking ? 'disabled' : ''}>${checking ? 'Checking…' : 'Run connection check'}</button></div>
    <section class="crew-link-list">
      ${row('House session', chat.state === 'connected' ? 'ready' : chat.state === 'checking' ? 'waking' : chat.state === 'disconnected' ? 'unauthorised' : chat.state, chat.detail)}
      ${routed.map((item) => row(item.name, item.state || 'unknown', [item.provider, item.model, item.reason, item.latencyMs != null ? `${item.latencyMs} ms` : ''].filter(Boolean).join(' · '))).join('')}
    </section>
    <section class="crew-link-hermes">
      <span>Hermes / Crow Trainer</span>
      <p>Hermes is a local/external runtime, so the browser cannot truthfully call it live. Run the bundled local doctor for CLI, provider/tool, computer-use, and recent connection-log checks.</p>
      <code>python profiles/crow-trainer/scripts/connection_doctor.py</code>
      <p class="crew-link-note">A connection failure is kept separate from identity, training state, and continuity. No healthy-looking badge is inferred from configuration alone.</p>
    </section>
    ${failures.length ? `<section class="crew-link-failures"><span>Faults to repair</span>${failures.map((item) => `<p><strong>${esc(item.name)}</strong> · ${esc(item.reason || item.state)}</p>`).join('')}</section>` : ''}
    ${lastCheck ? `<footer>Last checked ${esc(lastCheck)}</footer>` : ''}
  `;

  body.querySelector('[data-crew-check]')?.addEventListener('click', runCheck);
}

async function runCheck() {
  if (checking) return;
  checking = true;
  render();
  try {
    await globalThis.HouseChatConnection?.recheck?.();
    await globalThis.HouseWorkspaceRuntime?.refreshRoster?.();
    lastCheck = new Date().toLocaleTimeString();
  } finally {
    checking = false;
    render();
  }
}

root.querySelector('.crew-link-launch').addEventListener('click', () => { open = !open; render(); });
root.querySelector('[data-crew-close]').addEventListener('click', () => { open = false; render(); });
window.addEventListener('online', render);
window.addEventListener('offline', render);
document.addEventListener('house:brain-node', render);

render();

globalThis.CrewConnectionDoctor = Object.freeze({
  run: runCheck,
  open() { open = true; render(); },
  snapshot() {
    return {
      browser_online: navigator.onLine,
      house: globalThis.HouseChatConnection?.state || null,
      agents: globalThis.HouseWorkspaceRuntime?.snapshot?.() || [],
      checked_at: lastCheck,
    };
  },
});
