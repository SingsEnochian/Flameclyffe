// ArcSweep's interactive HUD skin. Decorates existing controls; owns no canon or world state.
const GROUPS = [
  ['Navigate', ['portal', 'worlds', 'scripts', 'records']],
  ['Create & connect', ['forge', 'commons', 'kelyran-school']],
  ['Observe', ['deep-observer', 'feedback', 'waking-thread', 'settings']],
];
const glyphs = { portal: '◉', worlds: '✧', scripts: '▤', records: '▥', forge: '✦', commons: '☍', 'kelyran-school': 'ᚲ', 'deep-observer': '◈', feedback: '∞', 'waking-thread': '⌁', settings: '⚙' };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function roomButton(room, label, className = '') {
  const button = element('button', className, label);
  button.type = 'button';
  button.dataset.room = room;
  return button;
}

export function enhanceHolographicShell(app = document.querySelector('#app')) {
  const shell = app?.querySelector('.app-shell');
  if (!shell || shell.dataset.holographic === 'true') return false;
  shell.dataset.holographic = 'true';
  const sidebar = shell.querySelector(':scope > .sidebar');
  const content = shell.querySelector(':scope > .content');
  if (!sidebar || !content) return false;
  const nav = sidebar.querySelector('nav');
  const current = nav?.querySelector('.nav-button.active');
  const room = current?.dataset.room || content.dataset.houseglassRoom || 'portal';
  const roomName = current?.querySelector('span:last-child')?.textContent || 'Workspace';
  const activeWorld = sidebar.querySelector('.sidebar-world strong')?.textContent || 'World';
  const toolbar = element('header', 'holo-commandbar');
  const brand = element('div', 'holo-wordmark');
  brand.append(element('span', 'holo-emblem', '⌁'), element('strong', '', 'ARCSWEEP'));
  const crumb = element('div', 'holo-breadcrumb');
  crumb.append(element('span', '', 'WORKSPACE'), element('strong', '', roomName));
  const controls = element('div', 'holo-command-actions');
  const menu = element('button', 'holo-menu', 'Rooms');
  menu.type = 'button'; menu.setAttribute('aria-expanded', 'false');
  sidebar.id = 'holo-room-navigation'; menu.setAttribute('aria-controls', sidebar.id);
  menu.addEventListener('click', () => {
    const open = shell.dataset.navOpen !== 'true';
    shell.dataset.navOpen = String(open); menu.setAttribute('aria-expanded', String(open));
  });
  controls.append(menu, roomButton('worlds', '✧  ' + activeWorld, 'holo-world-shortcut'), roomButton('settings', 'Settings', 'holo-settings'));
  toolbar.append(brand, crumb, controls);
  shell.prepend(toolbar);
  const sidebarBrand = sidebar.querySelector('.brand');
  if (sidebarBrand) {
    sidebarBrand.replaceChildren(element('span', 'holo-nav-kicker', 'HEARTHWEAVE'), element('strong', '', 'The workspace'));
  }
  if (nav) {
    const buttons = [...nav.querySelectorAll('.nav-button')];
    for (const [title, ids] of GROUPS) {
      const group = element('section', 'holo-nav-group');
      group.append(element('h2', '', title));
      for (const id of ids) {
        const button = buttons.find(b => b.dataset.room === id);
        if (!button) continue;
        if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
        group.append(button);
      }
      nav.append(group);
    }
    // Preserve any future room entries that are not in the grouping table.
    nav.addEventListener('click', event => {
      if (event.target.closest('[data-room]')) {
        shell.dataset.navOpen = 'false'; menu.setAttribute('aria-expanded', 'false');
      }
    });
  }
  const hero = content.querySelector(':scope > .world-hero');
  if (hero) {
    hero.classList.add('holo-portal');
    const originalHeading = hero.querySelector('h1');
    if (originalHeading) originalHeading.textContent = activeWorld;
    const eyebrow = hero.querySelector('.eyebrow');
    if (eyebrow) eyebrow.textContent = 'ACTIVE PORTAL';
    const instrument = element('div', 'holo-portal-instrument');
    instrument.setAttribute('aria-label', 'Portal navigation');
    const core = roomButton('worlds', '◈', 'holo-portal-core');
    core.setAttribute('aria-label', 'Open world registry');
    core.title = 'Open world registry';
    instrument.append(core);
    for (const [id, label] of [['records', 'Records'], ['forge', 'Forge'], ['scripts', 'Scripts']]) {
      const action = roomButton(id, glyphs[id], 'holo-orbit-action holo-orbit-' + id);
      action.setAttribute('aria-label', 'Open ' + label); action.title = label;
      instrument.append(action);
    }
    hero.append(instrument);
    const ribbon = hero.querySelector('.world-ribbon');
    if (ribbon) {
      const details = element('details', 'holo-portal-details');
      details.append(element('summary', '', 'Portal details'), ribbon);
      hero.append(details);
    }
  }
  return true;
}

export function bootHolographicShell() {
  const app = document.querySelector('#app');
  if (!app || app.dataset.holographicBooted) return;
  app.dataset.holographicBooted = 'true';
  document.documentElement.dataset.holographicShell = 'true';
  const observer = new MutationObserver(() => enhanceHolographicShell(app));
  observer.observe(app, { childList: true });
  enhanceHolographicShell(app);
  let panel = null;
  let frame = 0;
  let point = null;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === 'true';
  app.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduced()) return;
    point = { x: event.clientX, y: event.clientY, target: event.target };
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const next = point.target.closest('.panel, .applet-card, .codex-universe-card');
      if (panel && panel !== next) { panel.style.removeProperty('--holo-x'); panel.style.removeProperty('--holo-y'); panel.style.removeProperty('--holo-tilt-x'); panel.style.removeProperty('--holo-tilt-y'); }
      panel = next;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty('--holo-x', ((point.x - rect.left) / Math.max(rect.width, 1) * 100) + '%');
      panel.style.setProperty('--holo-y', ((point.y - rect.top) / Math.max(rect.height, 1) * 100) + '%');
      panel.style.setProperty('--holo-tilt-y', ((point.x - rect.left) / Math.max(rect.width, 1) * 12 - 6) + 'deg');
      panel.style.setProperty('--holo-tilt-x', (6 - (point.y - rect.top) / Math.max(rect.height, 1) * 12) + 'deg');
    });
  }, { passive: true });
  app.addEventListener('pointerleave', () => {
    if (panel) { panel.style.removeProperty('--holo-x'); panel.style.removeProperty('--holo-y'); panel.style.removeProperty('--holo-tilt-x'); panel.style.removeProperty('--holo-tilt-y'); }
    panel = null;
  });
}

if (typeof document !== 'undefined') bootHolographicShell();
