import './selected-applet-navigation.js';

const app = document.querySelector('#app');
const media = window.matchMedia('(max-width: 820px)');
const PINNED_ROOMS = [
  { id: 'portal', label: 'Home', glyph: '◉' },
  { id: 'worlds', label: 'Worlds', glyph: '✧' },
  { id: 'commons', label: 'Commons', glyph: '☍' },
  { id: 'settings', label: 'Settings', glyph: '⚙' },
];

let menuOpen = false;
let scheduled = false;

function desktopRoomButtons() {
  return [...document.querySelectorAll('.sidebar nav [data-room]')];
}

function desktopRoom(id) {
  return desktopRoomButtons().find((button) => button.dataset.room === id) || null;
}

function activeRoomId() {
  return document.querySelector('.sidebar nav [data-room].active')?.dataset.room || 'portal';
}

function roomDescriptor(button) {
  const spans = [...button.querySelectorAll('span')];
  return {
    id: button.dataset.room,
    glyph: spans[0]?.textContent?.trim() || '•',
    label: spans.at(-1)?.textContent?.trim() || button.textContent?.trim() || button.dataset.room,
  };
}

function setMenuOpen(next, shell) {
  menuOpen = Boolean(next);
  document.documentElement.classList.toggle('mobile-room-menu-open', menuOpen);
  document.body.classList.toggle('mobile-room-menu-open', menuOpen);
  renderShell(shell);
  if (menuOpen) requestAnimationFrame(() => shell.querySelector('[data-mobile-close]')?.focus());
  else requestAnimationFrame(() => shell.querySelector('[data-mobile-more]')?.focus());
}

function activateRoom(id, shell) {
  const target = desktopRoom(id);
  if (!target) return;
  menuOpen = false;
  document.documentElement.classList.remove('mobile-room-menu-open');
  document.body.classList.remove('mobile-room-menu-open');
  target.click();
  requestAnimationFrame(() => renderShell(shell));
}

function pinnedButtonMarkup(room, active) {
  return `<button type="button" class="mobile-room-tab${active === room.id ? ' active' : ''}" data-mobile-room="${room.id}" ${active === room.id ? 'aria-current="page"' : ''}><span aria-hidden="true">${room.glyph}</span><span>${room.label}</span></button>`;
}

function roomGridMarkup(active) {
  return desktopRoomButtons().map(roomDescriptor).map((room) => `
    <button type="button" class="mobile-room-sheet-button${active === room.id ? ' active' : ''}" data-mobile-room="${room.id}" ${active === room.id ? 'aria-current="page"' : ''}>
      <span aria-hidden="true">${room.glyph}</span><span>${room.label}</span>
    </button>`).join('');
}

function renderShell(shell) {
  if (!media.matches || !app?.querySelector('.app-shell')) return;
  const active = activeRoomId();
  const moreActive = !PINNED_ROOMS.some((room) => room.id === active);
  const houseglassAvailable = Boolean(document.querySelector('.sidebar [data-action="houseglass-toggle"]'));
  shell.innerHTML = `
    ${houseglassAvailable ? '<button type="button" class="mobile-houseglass-trigger quiet" data-mobile-houseglass><span aria-hidden="true">▱</span><span>Houseglass</span></button>' : ''}
    <nav class="mobile-room-bar" aria-label="Arcsweep mobile rooms">
      ${PINNED_ROOMS.map((room) => pinnedButtonMarkup(room, active)).join('')}
      <button type="button" class="mobile-room-tab${moreActive || menuOpen ? ' active' : ''}" data-mobile-more aria-haspopup="dialog" aria-expanded="${menuOpen}"><span aria-hidden="true">☰</span><span>More</span></button>
    </nav>
    ${menuOpen ? `<div class="mobile-room-scrim" data-mobile-scrim>
      <section class="mobile-room-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-room-sheet-title">
        <header><div><p class="eyebrow">Arcsweep</p><h2 id="mobile-room-sheet-title">Rooms</h2></div><button type="button" class="quiet mobile-room-close" data-mobile-close aria-label="Close room menu">×</button></header>
        <div class="mobile-room-grid">${roomGridMarkup(active)}</div>
      </section>
    </div>` : ''}
  `;
}

function clearShell(shell) {
  shell?.remove();
  document.documentElement.classList.remove('mobile-room-menu-open');
  document.body.classList.remove('mobile-room-menu-open');
  menuOpen = false;
}

function ensureShell() {
  scheduled = false;
  let shell = document.querySelector('#arcsweep-mobile-navigation');
  const applicationReady = Boolean(app?.querySelector('.app-shell'));
  if (!media.matches || !applicationReady) {
    clearShell(shell);
    return;
  }
  if (!shell) {
    shell = document.createElement('div');
    shell.id = 'arcsweep-mobile-navigation';
    shell.className = 'mobile-navigation-shell';
    shell.addEventListener('click', (event) => {
      const room = event.target.closest('[data-mobile-room]');
      if (room) { activateRoom(room.dataset.mobileRoom, shell); return; }
      if (event.target.closest('[data-mobile-more]')) { setMenuOpen(true, shell); return; }
      if (event.target.closest('[data-mobile-close]') || event.target.matches('[data-mobile-scrim]')) { setMenuOpen(false, shell); return; }
      if (event.target.closest('[data-mobile-houseglass]')) {
        document.querySelector('.sidebar [data-action="houseglass-toggle"]')?.click();
      }
    });
    document.body.append(shell);
  }
  renderShell(shell);
}

function scheduleEnsure() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(ensureShell);
}

if (app) new MutationObserver(scheduleEnsure).observe(app, { childList: true, subtree: true });
media.addEventListener?.('change', scheduleEnsure);
window.addEventListener('resize', scheduleEnsure, { passive: true });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuOpen) {
    const shell = document.querySelector('#arcsweep-mobile-navigation');
    if (shell) setMenuOpen(false, shell);
  }
});

scheduleEnsure();
