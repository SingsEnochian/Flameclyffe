function text(value) { return String(value == null ? '' : value); }

export function installArcSweepOSShell({ os } = {}) {
  if (!os || typeof document === 'undefined' || !document.body) return null;
  if (document.querySelector('[data-arcsweep-os-shell]')) return null;

  const host = document.createElement('section');
  host.dataset.arcsweepOsShell = 'v0.1';
  host.setAttribute('aria-label', 'ArcSweep OS');
  host.innerHTML = `
    <style>
      [data-arcsweep-os-shell]{position:fixed;left:16px;bottom:16px;z-index:2147482500;font:13px/1.35 system-ui,sans-serif;color:#f4eddf}
      [data-arcsweep-os-shell] button,[data-arcsweep-os-shell] input{font:inherit}
      [data-os-launch]{border:1px solid rgba(220,180,95,.55);border-radius:999px;background:rgba(18,17,22,.94);color:inherit;padding:8px 12px;box-shadow:0 8px 28px rgba(0,0,0,.28)}
      [data-os-panel]{width:min(390px,calc(100vw - 28px));margin-top:8px;border:1px solid rgba(220,180,95,.45);border-radius:16px;background:rgba(18,17,22,.97);box-shadow:0 18px 54px rgba(0,0,0,.36);overflow:hidden}
      [data-os-panel][hidden]{display:none}
      .os-head,.os-actions,.os-guide{display:flex;gap:8px;align-items:center}.os-head{justify-content:space-between;padding:11px 13px;border-bottom:1px solid rgba(255,255,255,.08)}
      .os-state{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;padding:11px 13px}.os-state dt{opacity:.62}.os-state dd{margin:0;overflow-wrap:anywhere}
      .os-actions,.os-guide{padding:10px 13px;border-top:1px solid rgba(255,255,255,.08)}.os-actions{flex-wrap:wrap}.os-guide input{min-width:0;flex:1;border:1px solid rgba(255,255,255,.18);border-radius:9px;background:rgba(255,255,255,.06);color:inherit;padding:7px 9px}.os-actions button,.os-guide button,.os-head button{border:1px solid rgba(255,255,255,.18);border-radius:9px;background:rgba(255,255,255,.06);color:inherit;padding:6px 9px}
      [data-os-guide-reply]{padding:0 13px 11px;white-space:pre-wrap;overflow-wrap:anywhere;opacity:.86}
    </style>
    <button type="button" data-os-launch aria-expanded="false">OS</button>
    <div data-os-panel hidden>
      <div class="os-head"><strong>ArcSweep OS</strong><button type="button" data-os-close>Close</button></div>
      <dl class="os-state"><dt>Boot</dt><dd data-os-boot></dd><dt>Room</dt><dd data-os-room></dd><dt>World</dt><dd data-os-world></dd><dt>Feather</dt><dd data-os-feather></dd><dt>Steward</dt><dd data-os-steward></dd></dl>
      <div class="os-actions"><button type="button" data-os-inspect>Inspect</button><button type="button" data-os-feather>Feather</button><button type="button" data-os-resume>Resume</button></div>
      <form class="os-guide" data-os-guide><input name="utterance" autocomplete="off" aria-label="Ask ArcSweep Guide" placeholder="Ask the Guide…"><button>Send</button></form>
      <div data-os-guide-reply aria-live="polite"></div>
    </div>`;
  document.body.appendChild(host);

  const launch = host.querySelector('[data-os-launch]');
  const panel = host.querySelector('[data-os-panel]');
  const reply = host.querySelector('[data-os-guide-reply]');

  function render() {
    const snap = os.snapshot();
    host.querySelector('[data-os-boot]').textContent = text(snap.boot?.state || 'unknown');
    host.querySelector('[data-os-room]').textContent = text(snap.session?.active_room || 'portal');
    host.querySelector('[data-os-world]').textContent = text(snap.session?.active_world_id || 'none');
    host.querySelector('[data-os-feather]').textContent = snap.feather_paused ? 'paused' : 'clear';
    host.querySelector('[data-os-steward]').textContent = `${Number(snap.steward_gate?.pending || 0)} pending`;
  }

  function setOpen(open) {
    panel.hidden = !open;
    launch.setAttribute('aria-expanded', String(open));
    if (open) render();
  }

  launch.addEventListener('click', () => setOpen(panel.hidden));
  host.querySelector('[data-os-close]').addEventListener('click', () => setOpen(false));
  host.querySelector('[data-os-inspect]').addEventListener('click', async () => { await os.inspect(); render(); });
  host.querySelector('[data-os-feather]').addEventListener('click', () => { os.setFeatherPaused(true); render(); });
  host.querySelector('[data-os-resume]').addEventListener('click', () => { os.setFeatherPaused(false); render(); });
  host.querySelector('[data-os-guide]').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.utterance;
    const utterance = String(input.value || '').trim();
    if (!utterance) return;
    const requestId = `os-shell-guide:${Date.now()}`;
    reply.textContent = 'Guide thinking…';
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:guide-query', { detail: { request_id: requestId, utterance } }));
    input.value = '';
    const listener = (responseEvent) => {
      if (responseEvent?.detail?.request_id !== requestId) return;
      globalThis.removeEventListener?.('arcsweep:guide-response', listener);
      reply.textContent = text(responseEvent.detail?.turn?.say || responseEvent.detail?.turn?.status || 'No Guide response.');
      render();
    };
    globalThis.addEventListener?.('arcsweep:guide-response', listener);
  });

  const refresh = () => { if (!panel.hidden) render(); };
  globalThis.addEventListener?.('arcsweep:os-diagnostics', refresh);
  globalThis.addEventListener?.('arcsweep:os-navigation', refresh);
  render();

  return Object.freeze({
    host,
    render,
    destroy() {
      globalThis.removeEventListener?.('arcsweep:os-diagnostics', refresh);
      globalThis.removeEventListener?.('arcsweep:os-navigation', refresh);
      host.remove();
    },
  });
}
