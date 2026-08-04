import { featherStop } from './premaq-shokz-soundfont.js';
import './terra-aeterna-dial.js';
import './two-shore-gate-ui.js';
import './two-shore-eleven-year-wav-ui.js';
import './two-shore-mythframe-wav-ui.js';

const GLOBAL_STOP_SELECTOR = [
  '#feather-stop',
  '#stop-premaq-song',
  '[data-feather-stop]',
  '[aria-label*="Feather Stop" i]',
].join(',');

function stopFromControl(event) {
  const target = event.target instanceof Element
    ? event.target.closest(GLOBAL_STOP_SELECTOR)
    : null;
  if (!target || target.closest('#premaq-shokz-soundfont-dock')) return;
  featherStop('GLOBAL FEATHER STOP · all shared PREMAQ Shokz sound stopped.');
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', stopFromControl, { capture: true, passive: true });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    stopFromControl(event);
  }, { capture: true });
  window.addEventListener('hearthgate:feather-stop', () => {
    featherStop('GLOBAL FEATHER STOP · all shared PREMAQ Shokz sound stopped.');
  });
}
