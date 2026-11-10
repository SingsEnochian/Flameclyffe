// Installation owns browser presentation only; host authentication is unchanged.
export function installationState(env = globalThis) {
  const nav = env.navigator || {};
  const ipad = /iPad/.test(nav.userAgent || '') ||
    (/Mac/.test(nav.platform || '') && Number(nav.maxTouchPoints) > 1);
  const standalone = nav.standalone === true ||
    env.matchMedia?.('(display-mode: standalone)')?.matches === true;
  return { ipad, standalone, showGuide: ipad && !standalone };
}

export function installWayglassInstallation({ host = document.body, env = globalThis } = {}) {
  const panel = host.ownerDocument.createElement('aside');
  panel.className = 'wg-installation glass-panel';
  panel.setAttribute('aria-label', 'Install Wayglass');
  const text = host.ownerDocument.createElement('p');
  text.textContent = 'Keep Wayglass on your iPad: in Safari, tap Share → Add to Home Screen → Add. Turn on Open as Web App if offered.';
  const close = host.ownerDocument.createElement('button');
  close.type = 'button';
  close.className = 'glass-chip';
  close.textContent = 'Close installation guide';
  panel.append(text, close);
  host.prepend(panel);
  let dismissed = false;
  const refresh = () => { panel.hidden = dismissed || !installationState(env).showGuide; };
  const dismiss = () => { dismissed = true; refresh(); };
  const display = env.matchMedia?.('(display-mode: standalone)');
  close.addEventListener('click', dismiss);
  display?.addEventListener?.('change', refresh);
  env.addEventListener?.('pageshow', refresh);
  refresh();
  return {
    destroy() {
      close.removeEventListener('click', dismiss);
      display?.removeEventListener?.('change', refresh);
      env.removeEventListener?.('pageshow', refresh);
      panel.remove();
    },
  };
}
